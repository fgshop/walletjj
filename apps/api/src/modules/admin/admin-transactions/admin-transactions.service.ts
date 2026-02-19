import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminQueryDto } from '../dto/admin-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTransactions(query: AdminQueryDto) {
    const { search, status, type, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {};

    if (type && ['INTERNAL', 'EXTERNAL_SEND', 'EXTERNAL_RECEIVE', 'DEPOSIT', 'SWEEP'].includes(type)) {
      where.type = type as any;
    }

    if (status && ['PENDING', 'CONFIRMED', 'FAILED'].includes(status)) {
      where.status = status as any;
    }

    if (search) {
      where.OR = [
        { txHash: { contains: search } },
        { fromAddress: { contains: search } },
        { toAddress: { contains: search } },
        { fromUser: { OR: [{ email: { contains: search } }, { name: { contains: search } }] } },
        { toUser: { OR: [{ email: { contains: search } }, { name: { contains: search } }] } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        select: {
          id: true,
          txHash: true,
          type: true,
          fromAddress: true,
          toAddress: true,
          amount: true,
          tokenSymbol: true,
          fee: true,
          status: true,
          blockNumber: true,
          memo: true,
          createdAt: true,
          confirmedAt: true,
          fromUser: { select: { id: true, email: true, name: true } },
          toUser: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    const serialized = items.map((item) => ({
      ...item,
      blockNumber: item.blockNumber ? item.blockNumber.toString() : null,
    }));

    return { items: serialized, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
