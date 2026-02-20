import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { AdminRoles } from '../decorators/admin-roles.decorator';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('Admin - Dashboard')
@ApiBearerAuth()
@Public()
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('stats')
  @AdminRoles('VIEWER' as any)
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getStats() {
    return this.adminDashboardService.getStats();
  }

  @Get('balances')
  @AdminRoles('VIEWER' as any)
  @ApiOperation({ summary: 'Get on-chain / off-chain balance summary' })
  async getBalanceSummary() {
    return this.adminDashboardService.getBalanceSummary();
  }
}
