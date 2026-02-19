import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminTransactionsService } from './admin-transactions.service';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { AdminRoles } from '../decorators/admin-roles.decorator';
import { AdminQueryDto } from '../dto/admin-query.dto';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('Admin - Transactions')
@ApiBearerAuth()
@Public()
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@Controller('admin/transactions')
export class AdminTransactionsController {
  constructor(private readonly adminTransactionsService: AdminTransactionsService) {}

  @Get()
  @AdminRoles('OPERATOR' as any)
  @ApiOperation({ summary: 'List all transactions' })
  async listTransactions(@Query() query: AdminQueryDto) {
    return this.adminTransactionsService.listTransactions(query);
  }
}
