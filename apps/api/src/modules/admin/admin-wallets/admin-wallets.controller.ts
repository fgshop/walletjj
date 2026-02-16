import { Controller, Get, Post, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminWalletsService } from './admin-wallets.service';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { AdminRoles } from '../decorators/admin-roles.decorator';
import { LockWalletDto } from '../dto/lock-wallet.dto';
import { AdminQueryDto } from '../dto/admin-query.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { Request } from 'express';

@ApiTags('Admin - Wallets')
@ApiBearerAuth()
@Public()
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@Controller('admin/wallets')
export class AdminWalletsController {
  constructor(private readonly adminWalletsService: AdminWalletsService) {}

  @Get()
  @AdminRoles('OPERATOR' as any)
  @ApiOperation({ summary: 'List all wallets' })
  async listWallets(@Query() query: AdminQueryDto) {
    return this.adminWalletsService.listWallets(query);
  }

  @Post(':id/lock')
  @AdminRoles('ADMIN' as any)
  @ApiOperation({ summary: 'Lock a wallet' })
  async lockWallet(
    @CurrentAdmin('id') adminId: string,
    @Param('id') walletId: string,
    @Body() dto: LockWalletDto,
    @Req() req: Request,
  ) {
    return this.adminWalletsService.lockWallet(
      adminId,
      walletId,
      dto.reason,
      req.ip || '',
    );
  }

  @Post(':id/unlock')
  @AdminRoles('ADMIN' as any)
  @ApiOperation({ summary: 'Unlock a wallet' })
  async unlockWallet(
    @CurrentAdmin('id') adminId: string,
    @Param('id') walletId: string,
    @Req() req: Request,
  ) {
    return this.adminWalletsService.unlockWallet(adminId, walletId, req.ip || '');
  }
}
