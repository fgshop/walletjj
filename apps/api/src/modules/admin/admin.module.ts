import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AdminAuthController } from './admin-auth/admin-auth.controller';
import { AdminAuthService } from './admin-auth/admin-auth.service';
import { AdminJwtStrategy } from './admin-auth/strategies/admin-jwt.strategy';

import { AdminUsersController } from './admin-users/admin-users.controller';
import { AdminUsersService } from './admin-users/admin-users.service';

import { AdminWalletsController } from './admin-wallets/admin-wallets.controller';
import { AdminWalletsService } from './admin-wallets/admin-wallets.service';

import { AdminWithdrawalsController } from './admin-withdrawals/admin-withdrawals.controller';
import { AdminWithdrawalsService } from './admin-withdrawals/admin-withdrawals.service';

import { AdminDashboardController } from './admin-dashboard/admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard/admin-dashboard.service';

import { AdminAuditController } from './admin-audit/admin-audit.controller';

import { AdminTransactionsController } from './admin-transactions/admin-transactions.controller';
import { AdminTransactionsService } from './admin-transactions/admin-transactions.service';

import { AdminTokensController } from './admin-tokens/admin-tokens.controller';
import { AdminTokensService } from './admin-tokens/admin-tokens.service';

import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notification/notification.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    AuditModule,
    NotificationModule,
    QueueModule,
  ],
  controllers: [
    AdminAuthController,
    AdminUsersController,
    AdminWalletsController,
    AdminWithdrawalsController,
    AdminDashboardController,
    AdminAuditController,
    AdminTransactionsController,
    AdminTokensController,
  ],
  providers: [
    AdminAuthService,
    AdminJwtStrategy,
    AdminUsersService,
    AdminWalletsService,
    AdminWithdrawalsService,
    AdminDashboardService,
    AdminTransactionsService,
    AdminTokensService,
  ],
})
export class AdminModule {}
