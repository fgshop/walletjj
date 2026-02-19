import { Module } from '@nestjs/common';
import { WithdrawalController } from './withdrawal.controller';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalProcessor } from './withdrawal.processor';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationModule } from '../notification/notification.module';
import { QueueModule } from '../queue/queue.module';

const isServerless = !!process.env.VERCEL;

@Module({
  imports: [
    WalletModule,
    NotificationModule,
    // QueueModule requires Redis — skip on serverless
    ...(isServerless ? [] : [QueueModule]),
  ],
  controllers: [WithdrawalController],
  providers: [
    WithdrawalService,
    // WithdrawalProcessor is a BullMQ worker — skip on serverless
    ...(isServerless ? [] : [WithdrawalProcessor]),
  ],
  exports: [WithdrawalService],
})
export class WithdrawalModule {}
