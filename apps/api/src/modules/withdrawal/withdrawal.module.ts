import { Module } from '@nestjs/common';
import { WithdrawalController } from './withdrawal.controller';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalProcessor } from './withdrawal.processor';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationModule } from '../notification/notification.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [WalletModule, NotificationModule, QueueModule],
  controllers: [WithdrawalController],
  providers: [WithdrawalService, WithdrawalProcessor],
  exports: [WithdrawalService],
})
export class WithdrawalModule {}
