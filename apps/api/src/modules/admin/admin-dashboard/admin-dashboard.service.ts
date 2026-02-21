import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { WithdrawalStatus, TxType, TxStatus } from '@joju/types';
import { TronService } from '../../wallet/tron/tron.service';
import { WalletService } from '../../wallet/wallet.service';

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tronService: TronService,
    private readonly walletService: WalletService,
  ) {}

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

  async getBalanceSummary() {
    const wallets = await this.prisma.wallet.findMany({
      select: { address: true, userId: true },
    });

    const masterWallet = await this.prisma.masterWallet.findFirst({
      where: { isActive: true },
      select: { address: true },
    });

    // On-chain balances (parallel)
    let onchainTotal = 0;
    let hotWalletBalance = 0;

    const onchainPromises = wallets.map(async (w) => {
      try {
        const sun = Number(await this.tronService.getBalance(w.address));
        return sun / 1_000_000;
      } catch {
        return 0;
      }
    });

    const onchainResults = await Promise.all(onchainPromises);
    onchainTotal = onchainResults.reduce((sum, b) => sum + b, 0);

    if (masterWallet) {
      try {
        const sun = Number(await this.tronService.getBalance(masterWallet.address));
        hotWalletBalance = sun / 1_000_000;
      } catch {
        hotWalletBalance = 0;
      }
    }

    // Off-chain (DB) balances
    let offchainTotal = 0;
    for (const w of wallets) {
      const balance = await this.walletService.getComputedBalance(w.userId, 'JOJU');
      offchainTotal += balance;
    }

    return {
      onchainTotal: onchainTotal.toFixed(6),
      offchainTotal: offchainTotal.toFixed(6),
      hotWalletBalance: hotWalletBalance.toFixed(6),
      hotWalletAddress: masterWallet?.address ?? null,
      walletCount: wallets.length,
    };
  }
}
