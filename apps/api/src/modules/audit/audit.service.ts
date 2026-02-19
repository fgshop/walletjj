import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(
    adminId: string,
    action: string,
    resource: string,
    resourceId: string | null,
    details: Record<string, any> | null,
    ipAddress: string,
  ) {
    const auditLog = await this.prisma.auditLog.create({
      data: {
        adminId,
        action,
        resource,
        resourceId,
        details: details ?? undefined,
        ipAddress,
      },
    });
    this.logger.log(
      `Audit: ${action} on ${resource}${resourceId ? `/${resourceId}` : ''} by admin ${adminId}`,
    );
    return auditLog;
  }

  async getLogs(filters: {
    adminId?: string;
    action?: string;
    resource?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { adminId, action, resource, startDate, endDate, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};
    if (adminId) where.adminId = adminId;
    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { admin: { select: { name: true, email: true, role: true } } },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
