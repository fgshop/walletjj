import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WithdrawalService } from './withdrawal.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Withdrawals')
@ApiBearerAuth()
@Controller('withdrawals')
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Post()
  @ApiOperation({ summary: 'Create a withdrawal request' })
  async createWithdrawal(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWithdrawalDto,
  ) {
    return this.withdrawalService.createWithdrawal(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get my withdrawal requests' })
  async getWithdrawals(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.withdrawalService.getWithdrawals(userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get withdrawal request details' })
  async getWithdrawal(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.withdrawalService.getWithdrawalById(userId, id);
  }
}
