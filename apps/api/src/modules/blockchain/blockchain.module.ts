import { Module } from '@nestjs/common';
import { BlockMonitorService } from './block-monitor.service';
import { SweepService } from './sweep.service';
import { SweepProcessor } from './sweep.processor';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationModule } from '../notification/notification.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [WalletModule, NotificationModule, QueueModule],
  providers: [BlockMonitorService, SweepService, SweepProcessor],
})
export class BlockchainModule {}
