import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
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
      // 6. Check DB-computed available balance
      const availableBalance = await this.walletService.getAvailableBalance(userId, tokenSymbol);

      if (availableBalance < amount) {
        throw new BadRequestException(
          `Insufficient balance. Available: ${availableBalance} ${tokenSymbol}`,
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
      // Hide SWEEP transactions from user-facing list
      type: { not: TxType.SWEEP },
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
    }));

    // Merge and sort by date
    const merged = [
      ...items.map((i) => ({ ...i, _isWithdrawalRequest: false })),
      ...withdrawalItems,
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    const totalCount = total + withdrawals.length;

    return {
      items: merged,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
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
