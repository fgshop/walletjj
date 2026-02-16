import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TronService } from '../wallet/tron/tron.service';
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
    private readonly tronService: TronService,
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
    const amount = BigInt(dto.amount);
    if (amount <= 0n) {
      throw new BadRequestException('Amount must be positive');
    }

    // 5. Check on-chain balance
    const tokenSymbol = dto.tokenSymbol || 'TRX';
    let currentBalance: string;
    if (dto.tokenAddress) {
      currentBalance = await this.tronService.getTrc20Balance(
        senderWallet.address,
        dto.tokenAddress,
      );
    } else {
      currentBalance = await this.tronService.getBalance(senderWallet.address);
    }

    if (BigInt(currentBalance) < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    // 6. Create transaction record (off-chain ledger for custodial)
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

    // 7. Send notifications to both parties
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

    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
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
