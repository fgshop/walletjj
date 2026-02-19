import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notification/notification.service';
import { TronService } from '../../wallet/tron/tron.service';
import { WalletService } from '../../wallet/wallet.service';
import { AdminQueryDto } from '../dto/admin-query.dto';
import { SWEEP_QUEUE } from '../../queue/queue.constants';
import { Prisma, TxType, TxStatus } from '@prisma/client';

@Injectable()
export class AdminWalletsService {
  private readonly logger = new Logger(AdminWalletsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly tronService: TronService,
    private readonly walletService: WalletService,
    @InjectQueue(SWEEP_QUEUE) private readonly sweepQueue: Queue,
  ) {}

  async listWallets(query: AdminQueryDto) {
    const { search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.WalletWhereInput = {};
    if (search) {
      where.OR = [
        { address: { contains: search } },
        { user: { email: { contains: search } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.wallet.findMany({
        where,
        select: {
          id: true,
          address: true,
          isLocked: true,
          lockedAt: true,
          lockReason: true,
          createdAt: true,
          user: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.wallet.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async lockWallet(
    adminId: string,
    walletId: string,
    reason: string,
    ipAddress: string,
  ) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');

    await this.prisma.wallet.update({
      where: { id: walletId },
      data: {
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: adminId,
        lockReason: reason,
      },
    });

    await this.auditService.log(
      adminId,
      'WALLET_LOCK',
      'Wallet',
      walletId,
      { reason, address: wallet.address },
      ipAddress,
    );

    await this.notificationService.create(
      wallet.userId,
      'WALLET_LOCKED',
      'Wallet Locked',
      `Your wallet has been locked. Reason: ${reason}`,
    );

    return { message: 'Wallet locked successfully' };
  }

  async unlockWallet(
    adminId: string,
    walletId: string,
    ipAddress: string,
  ) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');

    await this.prisma.wallet.update({
      where: { id: walletId },
      data: {
        isLocked: false,
        lockedAt: null,
        lockedBy: null,
        lockReason: null,
      },
    });

    await this.auditService.log(
      adminId,
      'WALLET_UNLOCK',
      'Wallet',
      walletId,
      { address: wallet.address },
      ipAddress,
    );

    await this.notificationService.create(
      wallet.userId,
      'WALLET_UNLOCKED',
      'Wallet Unlocked',
      'Your wallet has been unlocked.',
    );

    return { message: 'Wallet unlocked successfully' };
  }

  /**
   * Migrate a single wallet: create DEPOSIT record for on-chain balance and queue sweep.
   */
  async sweepWallet(adminId: string, walletId: string, ipAddress: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
      select: { id: true, address: true, userId: true },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const masterWallet = await this.prisma.masterWallet.findFirst({
      where: { isActive: true },
    });
    if (!masterWallet) throw new NotFoundException('No active master wallet');

    if (wallet.address === masterWallet.address) {
      return { message: 'Cannot sweep the hot wallet itself', results: [] };
    }

    const results = await this.migrateAndSweepWallet(wallet);

    await this.auditService.log(
      adminId,
      'WALLET_SWEEP',
      'Wallet',
      walletId,
      { address: wallet.address, results },
      ipAddress,
    );

    return { message: 'Sweep initiated', results };
  }

  /**
   * Batch migrate all wallets: scan on-chain balances, create DEPOSIT records, queue sweeps.
   */
  async migrateAllBalances(adminId: string, ipAddress: string) {
    const wallets = await this.prisma.wallet.findMany({
      select: { id: true, address: true, userId: true },
    });

    const masterWallet = await this.prisma.masterWallet.findFirst({
      where: { isActive: true },
    });

    const allResults: Array<{ address: string; symbol: string; amount: string; status: string }> = [];

    for (const wallet of wallets) {
      if (masterWallet && wallet.address === masterWallet.address) continue;

      const results = await this.migrateAndSweepWallet(wallet);
      allResults.push(...results);
    }

    await this.auditService.log(
      adminId,
      'WALLET_MIGRATE_ALL',
      'System',
      'all',
      { count: allResults.filter((r) => r.status === 'migrated').length },
      ipAddress,
    );

    return { message: 'Migration completed', results: allResults };
  }

  private async migrateAndSweepWallet(
    wallet: { id: string; address: string; userId: string },
  ): Promise<Array<{ address: string; symbol: string; amount: string; status: string }>> {
    const results: Array<{ address: string; symbol: string; amount: string; status: string }> = [];

    // 1. Check TRX (JOJU) on-chain balance
    try {
      const balanceSun = Number(await this.tronService.getBalance(wallet.address));
      const balanceTrx = balanceSun / 1_000_000;

      if (balanceTrx > 0) {
        const existing = await this.prisma.transaction.findFirst({
          where: { toUserId: wallet.userId, tokenSymbol: 'JOJU', memo: 'migration-initial' },
        });

        if (existing) {
          results.push({ address: wallet.address, symbol: 'JOJU', amount: balanceTrx.toString(), status: 'already-migrated' });
        } else {
          const depositTx = await this.prisma.transaction.create({
            data: {
              txHash: `migration-${wallet.address}-JOJU-${Date.now()}`,
              type: TxType.DEPOSIT,
              status: TxStatus.CONFIRMED,
              toUserId: wallet.userId,
              fromAddress: 'migration',
              toAddress: wallet.address,
              amount: balanceTrx.toString(),
              tokenSymbol: 'JOJU',
              tokenAddress: null,
              memo: 'migration-initial',
              confirmedAt: new Date(),
            },
          });

          await this.sweepQueue.add('sweep-deposit', {
            userId: wallet.userId,
            walletAddress: wallet.address,
            tokenSymbol: 'JOJU',
            tokenAddress: null,
            depositTxId: depositTx.id,
            amount: balanceTrx.toString(),
          }, {
            jobId: `sweep-migration-${wallet.address}-JOJU`,
            delay: 5_000,
            attempts: 3,
            backoff: { type: 'exponential', delay: 60_000 },
          });

          results.push({ address: wallet.address, symbol: 'JOJU', amount: balanceTrx.toString(), status: 'migrated' });
        }
      }
    } catch (err) {
      this.logger.warn(`Migration TRX balance check failed for ${wallet.address}: ${err}`);
      results.push({ address: wallet.address, symbol: 'JOJU', amount: '0', status: `error` });
    }

    // 2. Check TRC-20 token balances
    const tokens = await this.prisma.supportedToken.findMany({ where: { isActive: true } });
    for (const token of tokens) {
      try {
        const rawBalance = await this.tronService.getTrc20Balance(wallet.address, token.contractAddress);
        const balance = token.decimals > 0
          ? Number(rawBalance) / Math.pow(10, token.decimals)
          : Number(rawBalance);

        if (balance > 0) {
          const existing = await this.prisma.transaction.findFirst({
            where: { toUserId: wallet.userId, tokenSymbol: token.symbol, memo: 'migration-initial' },
          });

          if (existing) {
            results.push({ address: wallet.address, symbol: token.symbol, amount: balance.toString(), status: 'already-migrated' });
          } else {
            const depositTx = await this.prisma.transaction.create({
              data: {
                txHash: `migration-${wallet.address}-${token.symbol}-${Date.now()}`,
                type: TxType.DEPOSIT,
                status: TxStatus.CONFIRMED,
                toUserId: wallet.userId,
                fromAddress: 'migration',
                toAddress: wallet.address,
                amount: balance.toString(),
                tokenSymbol: token.symbol,
                tokenAddress: token.contractAddress,
                memo: 'migration-initial',
                confirmedAt: new Date(),
              },
            });

            await this.sweepQueue.add('sweep-deposit', {
              userId: wallet.userId,
              walletAddress: wallet.address,
              tokenSymbol: token.symbol,
              tokenAddress: token.contractAddress,
              depositTxId: depositTx.id,
              amount: balance.toString(),
            }, {
              jobId: `sweep-migration-${wallet.address}-${token.symbol}`,
              delay: 5_000,
              attempts: 3,
              backoff: { type: 'exponential', delay: 60_000 },
            });

            results.push({ address: wallet.address, symbol: token.symbol, amount: balance.toString(), status: 'migrated' });
          }
        }
      } catch (err) {
        this.logger.warn(`Migration ${token.symbol} balance check failed for ${wallet.address}: ${err}`);
        results.push({ address: wallet.address, symbol: token.symbol, amount: '0', status: 'error' });
      }
    }

    return results;
  }

  async getWalletBalance(walletId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
      select: { address: true, userId: true },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const balances: Array<{ symbol: string; balance: string; decimals: number }> = [];

    // Fetch TRX (JOJU) balance
    try {
      const trxSun = await this.tronService.getBalance(wallet.address);
      balances.push({ symbol: 'JOJU', balance: (Number(trxSun) / 1_000_000).toString(), decimals: 6 });
    } catch (err) {
      this.logger.warn(`Failed to fetch TRX balance for ${wallet.address}: ${err}`);
      balances.push({ symbol: 'JOJU', balance: '0', decimals: 6 });
    }

    // Fetch TRC-20 token balances
    const tokens = await this.prisma.supportedToken.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    for (const token of tokens) {
      try {
        const rawBalance = await this.tronService.getTrc20Balance(wallet.address, token.contractAddress);
        const normalized = token.decimals > 0
          ? (Number(rawBalance) / Math.pow(10, token.decimals)).toString()
          : rawBalance;
        balances.push({ symbol: token.symbol, balance: normalized, decimals: token.decimals });
      } catch (err) {
        this.logger.warn(`Failed to fetch ${token.symbol} balance for ${wallet.address}: ${err}`);
      }
    }

    // Pending withdrawal amounts
    const pendingWithdrawals = await this.prisma.withdrawalRequest.findMany({
      where: {
        userId: wallet.userId,
        status: { in: ['PENDING_24H', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSING'] },
      },
      select: { amount: true, tokenSymbol: true },
    });

    const pendingBySymbol: Record<string, number> = {};
    for (const w of pendingWithdrawals) {
      pendingBySymbol[w.tokenSymbol] = (pendingBySymbol[w.tokenSymbol] ?? 0) + Number(w.amount);
    }

    // Off-chain (DB-computed) balances
    const offchainBalances: Array<{ symbol: string; balance: string }> = [];
    const allSymbols = ['JOJU', ...tokens.map((t) => t.symbol)];
    for (const symbol of [...new Set(allSymbols)]) {
      const computed = await this.walletService.getComputedBalance(wallet.userId, symbol);
      offchainBalances.push({ symbol, balance: computed.toString() });
    }

    return { address: wallet.address, balances, offchainBalances, pendingBySymbol };
  }
}
