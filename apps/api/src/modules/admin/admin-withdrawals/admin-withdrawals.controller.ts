import { Controller, Get, Post, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminWithdrawalsService } from './admin-withdrawals.service';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { AdminRoles } from '../decorators/admin-roles.decorator';
import { ReviewWithdrawalDto } from '../dto/review-withdrawal.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { Request } from 'express';

@ApiTags('Admin - Withdrawals')
@ApiBearerAuth()
@Public()
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@Controller('admin/withdrawals')
export class AdminWithdrawalsController {
  constructor(
    private readonly adminWithdrawalsService: AdminWithdrawalsService,
  ) {}

  @Get()
  @AdminRoles('OPERATOR' as any)
  @ApiOperation({ summary: 'List all withdrawal requests' })
  async listWithdrawals(
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminWithdrawalsService.listWithdrawals({ status, page, limit });
  }

  @Get(':id')
  @AdminRoles('OPERATOR' as any)
  @ApiOperation({ summary: 'Get withdrawal request details' })
  async getWithdrawal(@Param('id') id: string) {
    return this.adminWithdrawalsService.getWithdrawalById(id);
  }

  @Post(':id/review')
  @AdminRoles('ADMIN' as any)
  @ApiOperation({ summary: 'Approve or reject a withdrawal request' })
  async reviewWithdrawal(
    @CurrentAdmin('id') adminId: string,
    @Param('id') id: string,
    @Body() dto: ReviewWithdrawalDto,
    @Req() req: Request,
  ) {
    return this.adminWithdrawalsService.reviewWithdrawal(
      adminId,
      id,
      dto.action,
      dto.note,
      req.ip || '',
    );
  }
}
