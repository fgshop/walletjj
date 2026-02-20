import { Injectable, Logger, Optional, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notification/notification.service';
import { CryptoService } from '../../wallet/crypto/crypto.service';
import { TronService } from '../../wallet/tron/tron.service';
import { WalletService } from '../../wallet/wallet.service';
import { AdminQueryDto } from '../dto/admin-query.dto';
import { SWEEP_QUEUE } from '../../queue/queue.constants';
import { TxType, TxStatus } from '@prisma/client';

export interface ReconcileResult {
  address: string;
  symbol: string;
  onchain: number;
  offchain: number;
  diff: number;
  action: string;
  txHash?: string;
  error?: string;
}

@Injectable()
export class AdminWalletsService {
  private readonly logger = new Logger(AdminWalletsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly cryptoService: CryptoService,
    private readonly tronService: TronService,
    private readonly walletService: WalletService,
    @Optional() @InjectQueue(SWEEP_QUEUE) private readonly sweepQueue?: Queue,
  ) {}

  async listWallets(query: AdminQueryDto) {
    const { search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};
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

  /**
   * Reconcile all wallets: make on-chain balance match off-chain (DB) balance.
   * Phase 1: Sweep excess (on-chain > off-chain) → sends surplus from user wallet to Hot Wallet.
   * Phase 2: Top up deficit (off-chain > on-chain) → sends deficit from Hot Wallet to user wallet.
   * All movements are recorded as SWEEP transactions (excluded from balance calc).
   */
  async reconcileBalances(adminId: string, ipAddress: string) {
    const wallets = await this.prisma.wallet.findMany({
      select: { id: true, address: true, userId: true, encryptedKey: true },
    });

    const masterWallet = await this.prisma.masterWallet.findFirst({
      where: { isActive: true },
    });
    if (!masterWallet) throw new NotFoundException('No active master wallet');

    const hotKey = this.cryptoService.decrypt(masterWallet.encryptedKey);

    const results: ReconcileResult[] = [];

    // Phase 1: Sweep excess (on-chain > off-chain) — collects funds into Hot Wallet first
    for (const wallet of wallets) {
      if (wallet.address === masterWallet.address) continue;

      try {
        const onchainSun = Number(await this.tronService.getBalance(wallet.address));
        const onchain = onchainSun / 1_000_000;
        const offchain = await this.walletService.getComputedBalance(wallet.userId, 'JOJU');
        const diff = offchain - onchain;

        if (Math.abs(diff) < 0.01) {
          results.push({ address: wallet.address, symbol: 'JOJU', onchain, offchain, diff: 0, action: 'synced' });
          continue;
        }

        if (diff < 0) {
          // On-chain > off-chain → sweep excess to Hot Wallet
          const excessSun = Math.floor(Math.abs(diff) * 1_000_000);
          const userKey = this.cryptoService.decrypt(wallet.encryptedKey);
          const txHash = await this.tronService.sendTrx(userKey, masterWallet.address, excessSun);

          await this.recordReconcileTx(
            txHash, wallet.userId, wallet.address, masterWallet.address,
            Math.abs(diff).toString(), 'JOJU', null, 'reconcile-sweep',
          );
          results.push({ address: wallet.address, symbol: 'JOJU', onchain, offchain, diff, action: 'swept-excess', txHash });
        } else {
          // Mark for Phase 2
          results.push({ address: wallet.address, symbol: 'JOJU', onchain, offchain, diff, action: 'needs-topup' });
        }
      } catch (err) {
        results.push({ address: wallet.address, symbol: 'JOJU', onchain: 0, offchain: 0, diff: 0, action: 'error', error: String(err) });
      }
    }

    // Brief wait for sweep transactions to settle before topping up
    const hadSweeps = results.some((r) => r.action === 'swept-excess');
    if (hadSweeps) await new Promise((r) => setTimeout(r, 3_000));

    // Phase 2: Top up deficit (off-chain > on-chain) — uses Hot Wallet funds
    for (let i = 0; i < results.length; i++) {
      if (results[i].action !== 'needs-topup') continue;

      const wallet = wallets.find((w) => w.address === results[i].address);
      if (!wallet) continue;

      try {
        const deficitSun = Math.floor(results[i].diff * 1_000_000);

        // Check Hot Wallet can afford this top-up
        const hotBalanceSun = Number(await this.tronService.getBalance(masterWallet.address));
        if (hotBalanceSun < deficitSun + 1_000_000) {
          results[i] = { ...results[i], action: 'skipped-hot-insufficient' };
          continue;
        }

        const txHash = await this.tronService.sendTrx(hotKey, wallet.address, deficitSun);

        await this.recordReconcileTx(
          txHash, wallet.userId, masterWallet.address, wallet.address,
          results[i].diff.toString(), 'JOJU', null, 'reconcile-topup',
        );
        results[i] = { ...results[i], action: 'topped-up', txHash };
      } catch (err) {
        results[i] = { ...results[i], action: 'topup-error', error: String(err) };
      }
    }

    await this.auditService.log(
      adminId, 'WALLET_RECONCILE', 'System', 'all',
      {
        swept: results.filter((r) => r.action === 'swept-excess').length,
        toppedUp: results.filter((r) => r.action === 'topped-up').length,
        synced: results.filter((r) => r.action === 'synced').length,
        errors: results.filter((r) => r.action.includes('error')).length,
      },
      ipAddress,
    );

    return { message: 'Reconciliation completed', results };
  }

  private async recordReconcileTx(
    txHash: string,
    userId: string,
    fromAddress: string,
    toAddress: string,
    amount: string,
    tokenSymbol: string,
    tokenAddress: string | null,
    memo: string,
  ) {
    try {
      await this.prisma.transaction.create({
        data: {
          txHash,
          type: TxType.SWEEP,
          status: TxStatus.CONFIRMED,
          fromUserId: userId,
          fromAddress,
          toAddress,
          amount,
          tokenSymbol,
          tokenAddress,
          confirmedAt: new Date(),
          memo,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') return; // duplicate txHash
      throw err;
    }
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

          if (this.sweepQueue) {
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
          }

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
        let rawBalance: string;
        try {
          rawBalance = await this.tronService.getTrc20Balance(wallet.address, token.contractAddress);
        } catch {
          // TRC-20 call can fail for accounts with no activity — skip silently
          continue;
        }
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

            if (this.sweepQueue) {
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
            }

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

  /**
   * Admin-initiated on-chain transfer from any system wallet to any TRON address.
   * Uses the source wallet's encrypted private key from DB.
   * Recorded as SWEEP (does not affect user off-chain balances).
   */
  async adminTransfer(
    adminId: string,
    fromWalletId: string,
    toAddress: string,
    amount: number,
    tokenSymbol: string,
    ipAddress: string,
  ) {
    // Resolve source wallet (user wallet or master wallet)
    let fromAddress: string;
    let encryptedKey: string;
    let fromUserId: string | null = null;

    const userWallet = await this.prisma.wallet.findUnique({
      where: { id: fromWalletId },
      select: { address: true, encryptedKey: true, userId: true },
    });

    if (userWallet) {
      fromAddress = userWallet.address;
      encryptedKey = userWallet.encryptedKey;
      fromUserId = userWallet.userId;
    } else {
      // Check if it's the master wallet
      const master = await this.prisma.masterWallet.findUnique({
        where: { id: fromWalletId },
      });
      if (!master) throw new NotFoundException('Source wallet not found');
      fromAddress = master.address;
      encryptedKey = master.encryptedKey;
    }

    if (fromAddress === toAddress) {
      throw new BadRequestException('Source and destination cannot be the same');
    }

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // Resolve token
    const isNative = tokenSymbol === 'JOJU';
    let tokenAddress: string | null = null;

    if (!isNative) {
      const token = await this.prisma.supportedToken.findFirst({
        where: { symbol: tokenSymbol, isActive: true },
      });
      if (!token) throw new NotFoundException(`Token ${tokenSymbol} not found`);
      tokenAddress = token.contractAddress;
    }

    // Check on-chain balance
    const privateKey = this.cryptoService.decrypt(encryptedKey);

    if (isNative) {
      const balanceSun = Number(await this.tronService.getBalance(fromAddress));
      const balance = balanceSun / 1_000_000;
      if (balance < amount + 1) {
        throw new BadRequestException(
          `Insufficient on-chain balance: ${balance} JOJU (need ${amount} + ~1 gas)`,
        );
      }
    } else {
      const tokenBalance = await this.tronService.getTrc20Balance(fromAddress, tokenAddress!);
      if (Number(tokenBalance) < amount) {
        throw new BadRequestException(
          `Insufficient ${tokenSymbol} balance: ${tokenBalance}`,
        );
      }
    }

    // Execute transfer
    let txHash: string;
    if (isNative) {
      const amountSun = Math.floor(amount * 1_000_000);
      txHash = await this.tronService.sendTrx(privateKey, toAddress, amountSun);
    } else {
      // Ensure sender has TRX for gas
      const senderTrxSun = Number(await this.tronService.getBalance(fromAddress));
      if (senderTrxSun < 15_000_000) {
        const masterWallet = await this.prisma.masterWallet.findFirst({ where: { isActive: true } });
        if (masterWallet && fromAddress !== masterWallet.address) {
          const hotKey = this.cryptoService.decrypt(masterWallet.encryptedKey);
          await this.tronService.sendTrx(hotKey, fromAddress, 15_000_000 - senderTrxSun);
          await new Promise((r) => setTimeout(r, 5_000));
        }
      }
      txHash = await this.tronService.sendTrc20(privateKey, toAddress, tokenAddress!, amount.toString());
    }

    // Record as SWEEP (admin operation, not affecting user balance)
    await this.prisma.transaction.create({
      data: {
        txHash,
        type: TxType.SWEEP,
        status: TxStatus.CONFIRMED,
        fromUserId,
        fromAddress,
        toAddress,
        amount: amount.toString(),
        tokenSymbol,
        tokenAddress,
        confirmedAt: new Date(),
        memo: 'admin-transfer',
      },
    }).catch((err: any) => {
      if (err?.code !== 'P2002') throw err;
    });

    await this.auditService.log(
      adminId, 'ADMIN_TRANSFER', 'Wallet', fromWalletId,
      { fromAddress, toAddress, amount, tokenSymbol, txHash },
      ipAddress,
    );

    this.logger.log(`Admin transfer: ${amount} ${tokenSymbol} from ${fromAddress} → ${toAddress} (TX: ${txHash})`);

    return { message: 'Transfer completed', txHash, fromAddress, toAddress, amount, tokenSymbol };
  }

  async getHotWallet() {
    const masterWallet = await this.prisma.masterWallet.findFirst({
      where: { isActive: true },
      select: { id: true, address: true, nextIndex: true, description: true, createdAt: true },
    });
    if (!masterWallet) return null;

    let trxBalance = '0';
    try {
      const sun = Number(await this.tronService.getBalance(masterWallet.address));
      trxBalance = (sun / 1_000_000).toString();
    } catch {}

    const tokens = await this.prisma.supportedToken.findMany({ where: { isActive: true } });
    const tokenBalances: Array<{ symbol: string; balance: string; decimals: number }> = [
      { symbol: 'JOJU', balance: trxBalance, decimals: 6 },
    ];

    for (const token of tokens) {
      try {
        const raw = await this.tronService.getTrc20Balance(masterWallet.address, token.contractAddress);
        const normalized = token.decimals > 0
          ? (Number(raw) / Math.pow(10, token.decimals)).toString()
          : raw;
        tokenBalances.push({ symbol: token.symbol, balance: normalized, decimals: token.decimals });
      } catch {
        tokenBalances.push({ symbol: token.symbol, balance: '0', decimals: token.decimals });
      }
    }

    return {
      ...masterWallet,
      balances: tokenBalances,
      userWalletCount: masterWallet.nextIndex,
    };
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
    } catch {
      balances.push({ symbol: 'JOJU', balance: '0', decimals: 6 });
    }

    // Fetch TRC-20 token balances (with delay to avoid rate limits)
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
      } catch {
        // Silently skip — TRC-20 calls can fail for accounts with no token activity
        balances.push({ symbol: token.symbol, balance: '0', decimals: token.decimals });
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
