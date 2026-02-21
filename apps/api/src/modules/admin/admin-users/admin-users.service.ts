import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notification/notification.service';
import { AdminQueryDto } from '../dto/admin-query.dto';
import { NotificationType } from '@joju/types';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
  ) {}

  async listUsers(query: AdminQueryDto) {
    const { search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { name: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          isEmailVerified: true,
          isActive: true,
          isSuspended: true,
          lastLoginAt: true,
          createdAt: true,
          wallet: { select: { id: true, address: true, isLocked: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isEmailVerified: true,
        isActive: true,
        isSuspended: true,
        suspendReason: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        wallet: {
          select: { id: true, address: true, isLocked: true, lockedAt: true, lockReason: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async suspendUser(
    adminId: string,
    userId: string,
    reason: string,
    ipAddress: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { isSuspended: true, suspendReason: reason },
    });

    await this.auditService.log(
      adminId,
      'USER_SUSPEND',
      'User',
      userId,
      { reason },
      ipAddress,
    );

    await this.notificationService.create(
      userId,
      NotificationType.SYSTEM,
      'Account Suspended',
      `Your account has been suspended. Reason: ${reason}`,
    );

    return { message: 'User suspended successfully' };
  }

  async activateUser(adminId: string, userId: string, ipAddress: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { isSuspended: false, suspendReason: null },
    });

    await this.auditService.log(
      adminId,
      'USER_ACTIVATE',
      'User',
      userId,
      null,
      ipAddress,
    );

    await this.notificationService.create(
      userId,
      NotificationType.SYSTEM,
      'Account Activated',
      'Your account has been reactivated.',
    );

    return { message: 'User activated successfully' };
  }
}
