import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { WithdrawalStatus, TxType, TxStatus } from '@prisma/client';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const internalWhere = { type: TxType.INTERNAL, status: TxStatus.CONFIRMED };

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalWallets,
      lockedWallets,
      pendingWithdrawals,
      totalTransactions,
      recentTransactions,
      internalTotal,
      internalToday,
      internalAmountAgg,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true, isSuspended: false } }),
      this.prisma.user.count({ where: { isSuspended: true } }),
      this.prisma.wallet.count(),
      this.prisma.wallet.count({ where: { isLocked: true } }),
      this.prisma.withdrawalRequest.count({
        where: {
          status: {
            in: [
              WithdrawalStatus.PENDING_24H,
              WithdrawalStatus.PENDING_APPROVAL,
            ],
          },
        },
      }),
      this.prisma.transaction.count(),
      this.prisma.transaction.count({
        where: { createdAt: { gte: dayAgo } },
      }),
      this.prisma.transaction.count({ where: internalWhere }),
      this.prisma.transaction.count({
        where: { ...internalWhere, createdAt: { gte: todayStart } },
      }),
      this.prisma.transaction.findMany({
        where: internalWhere,
        select: { amount: true },
      }),
    ]);

    const internalTotalAmount = internalAmountAgg.reduce(
      (sum, tx) => sum + Number(tx.amount),
      0,
    );

    return {
      users: { total: totalUsers, active: activeUsers, suspended: suspendedUsers },
      wallets: { total: totalWallets, locked: lockedWallets },
      withdrawals: { pending: pendingWithdrawals },
      transactions: { total: totalTransactions, last24h: recentTransactions },
      internalTransfers: {
        total: internalTotal,
        today: internalToday,
        totalAmount: internalTotalAmount,
      },
    };
  }
}
