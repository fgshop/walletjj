import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { QueueModule } from './modules/queue/queue.module';
import { NotificationModule } from './modules/notification/notification.module';
import { TransactionModule } from './modules/transaction/transaction.module';
import { WithdrawalModule } from './modules/withdrawal/withdrawal.module';
import { AuditModule } from './modules/audit/audit.module';
import { AdminModule } from './modules/admin/admin.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { EmailModule } from './modules/email/email.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

// On Vercel serverless, Redis is not available. Skip BullMQ queues, cron scheduling, and blockchain monitoring.
const isServerless = !!process.env.VERCEL;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // ScheduleModule drives @Cron in BlockMonitorService — skip on serverless
    ...(isServerless ? [] : [ScheduleModule.forRoot()]),
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
    UsersModule,
    WalletModule,
    // QueueModule requires Redis for BullMQ — skip on serverless (WithdrawalModule brings its own conditional import)
    ...(isServerless ? [] : [QueueModule]),
    NotificationModule,
    TransactionModule,
    WithdrawalModule,
    AuditModule,
    AdminModule,
    // BlockchainModule runs block monitor cron + sweep processors — skip on serverless
    ...(isServerless ? [] : [BlockchainModule]),
    EmailModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
