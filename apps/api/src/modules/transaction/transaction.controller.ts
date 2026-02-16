import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TransactionService } from './transaction.service';
import { InternalTransferDto } from './dto/internal-transfer.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('internal-transfer')
  @ApiOperation({ summary: 'Internal transfer between platform wallets' })
  async internalTransfer(
    @CurrentUser('id') userId: string,
    @Body() dto: InternalTransferDto,
  ) {
    return this.transactionService.internalTransfer(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get my transaction history' })
  async getTransactions(
    @CurrentUser('id') userId: string,
    @Query() query: TransactionQueryDto,
  ) {
    return this.transactionService.getTransactions(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction details' })
  async getTransaction(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.transactionService.getTransactionById(userId, id);
  }
}
