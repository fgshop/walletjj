import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notification/notification.service';
import { AdminQueryDto } from '../dto/admin-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminWalletsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
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
}
