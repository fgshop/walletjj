import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { CryptoService } from './crypto/crypto.service';

@Module({
  controllers: [WalletController],
  providers: [WalletService, CryptoService],
  exports: [WalletService, CryptoService],
})
export class WalletModule {}
