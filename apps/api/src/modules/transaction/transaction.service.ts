import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { TronService } from '../wallet/tron/tron.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationService } from '../notification/notification.service';
import { InternalTransferDto } from './dto/internal-transfer.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { TxType, TxStatus, Prisma } from '@prisma/client';
import { isValidTronAddress, isValidEmail } from '@joju/utils';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly tronService: TronService,
    private readonly walletService: WalletService,
    private readonly notificationService: NotificationService,
  ) {}

  async internalTransfer(userId: string, dto: InternalTransferDto) {
    // 1. Get sender wallet
    const senderWallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!senderWallet) {
      throw new NotFoundException('Sender wallet not found');
    }
    if (senderWallet.isLocked) {
      throw new ForbiddenException('Your wallet is locked. Contact support.');
    }

    // 2. Resolve recipient wallet (by TRON address or email)
    let recipientWallet: any;
    if (isValidTronAddress(dto.recipient)) {
      recipientWallet = await this.prisma.wallet.findUnique({
        where: { address: dto.recipient },
        include: { user: { select: { id: true, email: true, name: true } } },
      });
    } else if (isValidEmail(dto.recipient)) {
      const recipientUser = await this.prisma.user.findUnique({
        where: { email: dto.recipient },
        select: { id: true, email: true, name: true },
      });
      if (recipientUser) {
        recipientWallet = await this.prisma.wallet.findUnique({
          where: { userId: recipientUser.id },
          include: { user: { select: { id: true, email: true, name: true } } },
        });
      }
    } else {
      throw new BadRequestException('Invalid recipient. Use a TRON address or email.');
    }

    if (!recipientWallet) {
      throw new NotFoundException('Recipient wallet not found in this platform');
    }

    // 3. Prevent self-transfer
    if (senderWallet.address === recipientWallet.address) {
      throw new BadRequestException('Cannot transfer to your own wallet');
    }

    // 4. Validate amount
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be a positive number');
    }

    const tokenSymbol = dto.tokenSymbol || 'JOJU';

    // 5. Acquire distributed lock to prevent concurrent transfers
    const lockKey = `transfer-lock:${userId}`;
    const locked = await this.redis.get(lockKey);
    if (locked) {
      throw new BadRequestException('Transfer in progress, please wait');
    }
    await this.redis.set(lockKey, '1', 10);

    try {
      // 6. Calculate effective balance
      let onChainBalance: string;
      if (dto.tokenAddress) {
        onChainBalance = await this.tronService.getTrc20Balance(
          senderWallet.address,
          dto.tokenAddress,
        );
      } else {
        onChainBalance = await this.tronService.getBalance(senderWallet.address);
      }

      const internalNet = await this.walletService.getInternalNetBySymbol(userId);
      const netForSymbol = internalNet[tokenSymbol] ?? 0;

      const pendingWithdrawals = await this.prisma.withdrawalRequest.findMany({
        where: {
          userId,
          tokenSymbol,
          status: { in: ['PENDING_24H', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSING'] },
        },
        select: { amount: true },
      });
      const pendingSum = pendingWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);

      const effectiveBalance = Number(onChainBalance) + netForSymbol - pendingSum;

      if (effectiveBalance < amount) {
        throw new BadRequestException(
          `Insufficient balance. Available: ${effectiveBalance} ${tokenSymbol}`,
        );
      }

      // 7. Create transaction record (off-chain ledger for custodial)
      const transaction = await this.prisma.transaction.create({
        data: {
          type: TxType.INTERNAL,
          status: TxStatus.CONFIRMED,
          fromUserId: userId,
          toUserId: recipientWallet.user.id,
          fromAddress: senderWallet.address,
          toAddress: recipientWallet.address,
          amount: dto.amount,
          tokenAddress: dto.tokenAddress ?? null,
          tokenSymbol,
          tokenDecimals: dto.tokenAddress ? 6 : 6,
          memo: dto.memo ?? null,
          confirmedAt: new Date(),
        },
      });

      // 8. Send notifications to both parties
      await Promise.all([
        this.notificationService.create(
          userId,
          'SEND_COMPLETE',
          'Transfer Sent',
          `You sent ${dto.amount} ${tokenSymbol} to ${recipientWallet.user.email}`,
          { transactionId: transaction.id },
        ),
        this.notificationService.create(
          recipientWallet.user.id,
          'RECEIVE',
          'Transfer Received',
          `You received ${dto.amount} ${tokenSymbol} from ${senderWallet.user.email}`,
          { transactionId: transaction.id },
        ),
      ]);

      this.logger.log(
        `Internal transfer: ${senderWallet.address} → ${recipientWallet.address} ${dto.amount} ${tokenSymbol}`,
      );

      return transaction;
    } finally {
      await this.redis.del(lockKey);
    }
  }

  async getTransactions(userId: string, query: TransactionQueryDto) {
    const { type, status, startDate, endDate, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {
      OR: [{ fromUserId: userId }, { toUserId: userId }],
    };

    if (type) {
      where.type = type as TxType;
    }
    if (status) {
      where.status = status as TxStatus;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Fetch pending withdrawal requests (not yet linked to Transaction)
    const includeWithdrawals = !type || type === 'EXTERNAL_SEND';
    // Fetch on-chain deposits when not filtered to other types
    const includeDeposits = !type || type === 'EXTERNAL_RECEIVE' || type === 'DEPOSIT';

    // Get wallet address for on-chain queries
    const wallet = includeDeposits
      ? await this.prisma.wallet.findUnique({ where: { userId }, select: { address: true } })
      : null;

    const [items, total, withdrawals] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
      includeWithdrawals
        ? this.prisma.withdrawalRequest.findMany({
            where: {
              userId,
              transactionId: null,
              ...(startDate || endDate
                ? {
                    createdAt: {
                      ...(startDate && { gte: new Date(startDate) }),
                      ...(endDate && { lte: new Date(endDate) }),
                    },
                  }
                : {}),
            },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    // Collect existing txHashes for dedup
    const existingTxHashes = new Set(
      items.filter((i) => i.txHash).map((i) => i.txHash),
    );

    // Fetch on-chain deposits (TRX + TRC-20)
    let onChainDeposits: Array<{
      id: string;
      txHash: string;
      type: 'EXTERNAL_RECEIVE';
      fromUserId: null;
      toUserId: string;
      fromAddress: string;
      toAddress: string;
      amount: string;
      tokenAddress: string | null;
      tokenSymbol: string;
      tokenDecimals: number;
      fee: null;
      status: 'CONFIRMED';
      withdrawalStatus: null;
      blockNumber: number | null;
      confirmedAt: Date;
      memo: null;
      createdAt: Date;
      updatedAt: Date;
      _isWithdrawalRequest: false;
      _isOnChainDeposit: true;
    }> = [];

    if (includeDeposits && wallet?.address) {
      try {
        const [trxTxs, trc20Txs] = await Promise.all([
          this.tronService.getAccountTransactions(wallet.address, { limit: 50, onlyTo: true }),
          this.tronService.getAccountTrc20Transactions(wallet.address, { limit: 50, onlyTo: true }),
        ]);

        // Process TRX incoming transactions
        for (const tx of trxTxs) {
          const txId = tx.txID;
          if (!txId || existingTxHashes.has(txId)) continue;

          // Parse TRX TransferContract
          const contract = tx.raw_data?.contract?.[0];
          if (!contract || contract.type !== 'TransferContract') continue;
          const value = contract.parameter?.value;
          if (!value) continue;

          const toAddr = this.tronWeb_addressFromHex(value.to_address);
          if (toAddr !== wallet.address) continue;

          const fromAddr = this.tronWeb_addressFromHex(value.owner_address);
          const amountSun = value.amount ?? 0;
          const amountTrx = (amountSun / 1_000_000).toString();
          const timestamp = tx.block_timestamp ?? tx.raw_data?.timestamp ?? Date.now();

          existingTxHashes.add(txId);
          onChainDeposits.push({
            id: `onchain-${txId}`,
            txHash: txId,
            type: 'EXTERNAL_RECEIVE' as const,
            fromUserId: null,
            toUserId: userId,
            fromAddress: fromAddr,
            toAddress: toAddr,
            amount: amountTrx,
            tokenAddress: null,
            tokenSymbol: 'JOJU',
            tokenDecimals: 6,
            fee: null,
            status: 'CONFIRMED' as const,
            withdrawalStatus: null,
            blockNumber: null,
            confirmedAt: new Date(timestamp),
            memo: null,
            createdAt: new Date(timestamp),
            updatedAt: new Date(timestamp),
            _isWithdrawalRequest: false,
            _isOnChainDeposit: true,
          });
        }

        // Process TRC-20 incoming transactions
        for (const tx of trc20Txs) {
          const txId = tx.transaction_id;
          if (!txId || existingTxHashes.has(txId)) continue;

          if (tx.to !== wallet.address) continue;

          const decimals = tx.token_info?.decimals ?? 6;
          const rawAmount = tx.value ?? '0';
          const amount = (Number(rawAmount) / Math.pow(10, decimals)).toString();
          const timestamp = tx.block_timestamp ?? Date.now();

          existingTxHashes.add(txId);
          onChainDeposits.push({
            id: `onchain-${txId}`,
            txHash: txId,
            type: 'EXTERNAL_RECEIVE' as const,
            fromUserId: null,
            toUserId: userId,
            fromAddress: tx.from ?? '',
            toAddress: tx.to,
            amount,
            tokenAddress: tx.token_info?.address ?? null,
            tokenSymbol: tx.token_info?.symbol ?? 'TRC20',
            tokenDecimals: decimals,
            fee: null,
            status: 'CONFIRMED' as const,
            withdrawalStatus: null,
            blockNumber: null,
            confirmedAt: new Date(timestamp),
            memo: null,
            createdAt: new Date(timestamp),
            updatedAt: new Date(timestamp),
            _isWithdrawalRequest: false,
            _isOnChainDeposit: true,
          });
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch on-chain deposits: ${err}`);
      }
    }

    // Map withdrawal requests to a transaction-like shape
    const withdrawalItems = withdrawals.map((w) => ({
      id: w.id,
      txHash: null,
      type: 'EXTERNAL_SEND' as const,
      fromUserId: w.userId,
      toUserId: null,
      fromAddress: '',
      toAddress: w.toAddress,
      amount: w.amount,
      tokenAddress: w.tokenAddress,
      tokenSymbol: w.tokenSymbol,
      tokenDecimals: 6,
      fee: null,
      status: 'PENDING' as const,
      withdrawalStatus: w.status,
      blockNumber: null,
      confirmedAt: w.completedAt,
      memo: null,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
      _isWithdrawalRequest: true,
      _isOnChainDeposit: false,
    }));

    // Merge and sort by date
    const merged = [
      ...items.map((i) => ({ ...i, _isWithdrawalRequest: false, _isOnChainDeposit: false })),
      ...withdrawalItems,
      ...onChainDeposits,
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    const totalCount = total + withdrawals.length + onChainDeposits.length;

    return {
      items: merged,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  /** Convert hex address to Base58 TRON address */
  private tronWeb_addressFromHex(hex: string): string {
    try {
      const { TronWeb } = require('tronweb');
      return TronWeb.address.fromHex(hex);
    } catch {
      return hex;
    }
  }

  async getTransactionById(userId: string, id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.fromUserId !== userId && transaction.toUserId !== userId) {
      throw new ForbiddenException('You do not have access to this transaction');
    }

    return transaction;
  }
}
