import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationService } from '../notification/notification.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { WITHDRAWAL_QUEUE } from '../queue/queue.constants';
import { WithdrawalStatus } from '@prisma/client';
import { isValidTronAddress } from '@joju/utils';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly notificationService: NotificationService,
    @InjectQueue(WITHDRAWAL_QUEUE) private readonly withdrawalQueue: Queue,
  ) {}

  async createWithdrawal(userId: string, dto: CreateWithdrawalDto) {
    // 1. Validate address
    if (!isValidTronAddress(dto.toAddress)) {
      throw new BadRequestException('Invalid TRON address');
    }

    // 2. Get sender wallet
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    if (wallet.isLocked) {
      throw new ForbiddenException('Your wallet is locked. Contact support.');
    }

    // 3. Prevent withdrawal to own address
    if (wallet.address === dto.toAddress) {
      throw new BadRequestException('Cannot withdraw to your own wallet address');
    }

    // 4. Check DB-computed available balance (includes all sources)
    const tokenSymbol = dto.tokenSymbol || 'JOJU';
    const requestedAmount = Number(dto.amount);
    const availableBalance = await this.walletService.getAvailableBalance(userId, tokenSymbol);

    if (availableBalance < requestedAmount) {
      throw new BadRequestException(
        `Insufficient balance for withdrawal. ` +
          `Available: ${availableBalance} ${tokenSymbol}`,
      );
    }

    // 5. Check if this is the user's first external withdrawal
    const previousExternal = await this.prisma.withdrawalRequest.findFirst({
      where: {
        userId,
        status: { notIn: [WithdrawalStatus.REJECTED, WithdrawalStatus.FAILED] },
      },
    });
    const isFirstExternal = !previousExternal;

    // 6. Create withdrawal request
    const availableAt = new Date(Date.now() + TWENTY_FOUR_HOURS_MS);
    const withdrawal = await this.prisma.withdrawalRequest.create({
      data: {
        userId,
        toAddress: dto.toAddress,
        amount: dto.amount,
        tokenAddress: dto.tokenAddress ?? null,
        tokenSymbol,
        status: WithdrawalStatus.PENDING_24H,
        isFirstExternal,
        availableAt,
      },
    });

    // 7. Register BullMQ delayed job for 24h transition
    await this.withdrawalQueue.add(
      'process-24h',
      { withdrawalId: withdrawal.id },
      { delay: TWENTY_FOUR_HOURS_MS, jobId: `withdrawal-24h-${withdrawal.id}` },
    );

    // 8. Notify user
    await this.notificationService.create(
      userId,
      'WITHDRAWAL_PENDING',
      'Withdrawal Request Created',
      `Your withdrawal of ${dto.amount} ${tokenSymbol} is pending. It will be available for review in 24 hours.`,
      { withdrawalId: withdrawal.id },
    );

    this.logger.log(
      `Withdrawal request created: ${withdrawal.id} for user ${userId}`,
    );

    return withdrawal;
  }

  async getWithdrawals(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.withdrawalRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.withdrawalRequest.count({ where: { userId } }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getWithdrawalById(userId: string, id: string) {
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal request not found');
    }

    if (withdrawal.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return withdrawal;
  }
}
