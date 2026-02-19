import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { WalletResponseDto, WalletBalanceResponseDto } from './dto/wallet-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Wallet')
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get my wallet info' })
  @ApiResponse({ status: 200, type: WalletResponseDto })
  async getWallet(@CurrentUser('id') userId: string) {
    return this.walletService.getWallet(userId);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get wallet balance (DB-computed)' })
  @ApiResponse({ status: 200, type: WalletBalanceResponseDto })
  async getBalance(@CurrentUser('id') userId: string) {
    return this.walletService.getBalance(userId);
  }
}
