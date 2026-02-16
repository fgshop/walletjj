import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { CryptoService } from './crypto/crypto.service';
import { TronModule } from './tron/tron.module';

@Module({
  imports: [TronModule],
  controllers: [WalletController],
  providers: [WalletService, CryptoService],
  exports: [WalletService, CryptoService, TronModule],
})
export class WalletModule {}
