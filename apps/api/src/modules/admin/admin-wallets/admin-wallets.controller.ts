import { Controller, Get, Post, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminWalletsService } from './admin-wallets.service';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { AdminRoles } from '../decorators/admin-roles.decorator';
import { LockWalletDto } from '../dto/lock-wallet.dto';
import { AdminTransferDto } from '../dto/admin-transfer.dto';
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

  @Get('hot-wallet')
  @AdminRoles('OPERATOR' as any)
  @ApiOperation({ summary: 'Get hot wallet (master wallet) info and balances' })
  async getHotWallet() {
    return this.adminWalletsService.getHotWallet();
  }

  @Get()
  @AdminRoles('OPERATOR' as any)
  @ApiOperation({ summary: 'List all wallets' })
  async listWallets(@Query() query: AdminQueryDto) {
    return this.adminWalletsService.listWallets(query);
  }

  @Get(':id/balance')
  @AdminRoles('OPERATOR' as any)
  @ApiOperation({ summary: 'Get wallet on-chain balance' })
  async getWalletBalance(@Param('id') walletId: string) {
    return this.adminWalletsService.getWalletBalance(walletId);
  }

  @Post('migrate-balances')
  @AdminRoles('SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Migrate all on-chain balances to DB and sweep to hot wallet' })
  async migrateBalances(
    @CurrentAdmin('id') adminId: string,
    @Req() req: Request,
  ) {
    return this.adminWalletsService.migrateAllBalances(adminId, req.ip || '');
  }

  @Post('reconcile')
  @AdminRoles('SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Reconcile on-chain balances to match off-chain (DB) balances' })
  async reconcileBalances(
    @CurrentAdmin('id') adminId: string,
    @Req() req: Request,
  ) {
    return this.adminWalletsService.reconcileBalances(adminId, req.ip || '');
  }

  @Post('transfer')
  @AdminRoles('SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Admin-initiated on-chain transfer between wallets' })
  async adminTransfer(
    @CurrentAdmin('id') adminId: string,
    @Body() dto: AdminTransferDto,
    @Req() req: Request,
  ) {
    return this.adminWalletsService.adminTransfer(
      adminId,
      dto.fromWalletId,
      dto.toAddress,
      dto.amount,
      dto.tokenSymbol || 'JOJU',
      req.ip || '',
    );
  }

  @Post(':id/sweep')
  @AdminRoles('ADMIN' as any)
  @ApiOperation({ summary: 'Sweep a single wallet to hot wallet' })
  async sweepWallet(
    @CurrentAdmin('id') adminId: string,
    @Param('id') walletId: string,
    @Req() req: Request,
  ) {
    return this.adminWalletsService.sweepWallet(adminId, walletId, req.ip || '');
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
