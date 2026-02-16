import { Module } from '@nestjs/common';
import { BlockMonitorService } from './block-monitor.service';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [WalletModule, NotificationModule],
  providers: [BlockMonitorService],
})
export class BlockchainModule {}
