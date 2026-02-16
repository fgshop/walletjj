import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { WithdrawalStatus } from '@prisma/client';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalWallets,
      lockedWallets,
      pendingWithdrawals,
      totalTransactions,
      recentTransactions,
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
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      users: { total: totalUsers, active: activeUsers, suspended: suspendedUsers },
      wallets: { total: totalWallets, locked: lockedWallets },
      withdrawals: { pending: pendingWithdrawals },
      transactions: { total: totalTransactions, last24h: recentTransactions },
    };
  }
}
