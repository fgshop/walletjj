import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTokenDto, UpdateTokenDto } from '../dto/manage-token.dto';

@Injectable()
export class AdminTokensService {
  constructor(private readonly prisma: PrismaService) {}

  async listTokens() {
    return this.prisma.supportedToken.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createToken(dto: CreateTokenDto) {
    return this.prisma.supportedToken.create({
      data: {
        contractAddress: dto.contractAddress,
        symbol: dto.symbol,
        name: dto.name,
        decimals: dto.decimals,
        iconUrl: dto.iconUrl,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateToken(id: string, dto: UpdateTokenDto) {
    return this.prisma.supportedToken.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.iconUrl !== undefined && { iconUrl: dto.iconUrl }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  async deleteToken(id: string) {
    return this.prisma.supportedToken.delete({ where: { id } });
  }
}
