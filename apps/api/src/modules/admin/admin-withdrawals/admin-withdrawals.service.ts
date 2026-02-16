import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notification/notification.service';
import { ReviewAction } from '../dto/review-withdrawal.dto';
import { WithdrawalStatus, Prisma } from '@prisma/client';

@Injectable()
export class AdminWithdrawalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
  ) {}

  async listWithdrawals(query: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.WithdrawalRequestWhereInput = {};
    if (status) {
      where.status = status as WithdrawalStatus;
    }

    const [items, total] = await Promise.all([
      this.prisma.withdrawalRequest.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.withdrawalRequest.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getWithdrawalById(id: string) {
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true } },
        transaction: true,
      },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal request not found');
    }

    return withdrawal;
  }

  async reviewWithdrawal(
    adminId: string,
    withdrawalId: string,
    action: ReviewAction,
    note: string | undefined,
    ipAddress: string,
  ) {
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal request not found');
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Cannot review withdrawal in ${withdrawal.status} status. Must be PENDING_APPROVAL.`,
      );
    }

    if (action === ReviewAction.APPROVE) {
      await this.prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalStatus.APPROVED,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewNote: note ?? null,
        },
      });

      await this.notificationService.create(
        withdrawal.userId,
        'WITHDRAWAL_APPROVED',
        'Withdrawal Approved',
        `Your withdrawal of ${withdrawal.amount} ${withdrawal.tokenSymbol} has been approved and is being processed.`,
        { withdrawalId },
      );
    } else {
      await this.prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalStatus.REJECTED,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewNote: note ?? null,
        },
      });

      await this.notificationService.create(
        withdrawal.userId,
        'WITHDRAWAL_REJECTED',
        'Withdrawal Rejected',
        `Your withdrawal of ${withdrawal.amount} ${withdrawal.tokenSymbol} has been rejected.${note ? ` Reason: ${note}` : ''}`,
        { withdrawalId },
      );
    }

    await this.auditService.log(
      adminId,
      `WITHDRAWAL_${action}`,
      'WithdrawalRequest',
      withdrawalId,
      { action, note, amount: withdrawal.amount, tokenSymbol: withdrawal.tokenSymbol },
      ipAddress,
    );

    return { message: `Withdrawal ${action.toLowerCase()}d successfully` };
  }
}
