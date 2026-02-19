import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { WITHDRAWAL_QUEUE } from '../queue/queue.constants';
import { WithdrawalStatus, TxType, TxStatus } from '@prisma/client';
import { CryptoService } from '../wallet/crypto/crypto.service';
import { TronService } from '../wallet/tron/tron.service';
import { NotificationService } from '../notification/notification.service';

@Processor(WITHDRAWAL_QUEUE)
export class WithdrawalProcessor extends WorkerHost {
  private readonly logger = new Logger(WithdrawalProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private readonly tronService: TronService,
    private readonly notificationService: NotificationService,
  ) {
    super();
  }

  async process(job: Job<{ withdrawalId: string }>): Promise<void> {
    const { withdrawalId } = job.data;

    if (job.name === 'process-24h') {
      await this.handle24hTransition(withdrawalId);
    } else if (job.name === 'execute-withdrawal') {
      await this.executeWithdrawal(withdrawalId);
    }
  }

  private async handle24hTransition(withdrawalId: string) {
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      this.logger.warn(`Withdrawal ${withdrawalId} not found`);
      return;
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING_24H) {
      this.logger.log(
        `Withdrawal ${withdrawalId} is no longer PENDING_24H (current: ${withdrawal.status})`,
      );
      return;
    }

    await this.prisma.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: { status: WithdrawalStatus.PENDING_APPROVAL },
    });

    this.logger.log(
      `Withdrawal ${withdrawalId} transitioned to PENDING_APPROVAL`,
    );
  }

  private async executeWithdrawal(withdrawalId: string) {
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      this.logger.warn(`Withdrawal ${withdrawalId} not found for execution`);
      return;
    }

    if (withdrawal.status !== WithdrawalStatus.APPROVED) {
      this.logger.log(
        `Withdrawal ${withdrawalId} is not APPROVED (current: ${withdrawal.status}), skipping execution`,
      );
      return;
    }

    // Get active Hot Wallet (MasterWallet)
    const masterWallet = await this.prisma.masterWallet.findFirst({
      where: { isActive: true },
    });
    if (!masterWallet) {
      this.logger.error('No active master wallet found');
      await this.prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalStatus.FAILED,
          failReason: 'No active hot wallet configured',
        },
      });
      return;
    }

    // Pre-check hot wallet on-chain balance
    try {
      if (withdrawal.tokenAddress) {
        const tokenBalance = await this.tronService.getTrc20Balance(
          masterWallet.address,
          withdrawal.tokenAddress,
        );
        if (Number(tokenBalance) < Number(withdrawal.amount)) {
          throw new Error(
            `Hot wallet ${withdrawal.tokenSymbol} balance insufficient: ${tokenBalance} < ${withdrawal.amount}`,
          );
        }
      } else {
        const trxBalanceSun = await this.tronService.getBalance(masterWallet.address);
        const trxBalance = Number(trxBalanceSun) / 1_000_000;
        if (trxBalance < Number(withdrawal.amount)) {
          throw new Error(
            `Hot wallet JOJU balance insufficient: ${trxBalance} < ${withdrawal.amount}`,
          );
        }
      }
    } catch (err) {
      const failReason = err instanceof Error ? err.message : 'Hot wallet balance check failed';
      this.logger.error(`Withdrawal ${withdrawalId} pre-check failed: ${failReason}`);
      await this.prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalStatus.FAILED,
          failReason,
        },
      });
      return;
    }

    // Transition to PROCESSING
    await this.prisma.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: { status: WithdrawalStatus.PROCESSING },
    });

    try {
      // Decrypt master wallet key (Hot Wallet sends on behalf of user)
      const privateKey = this.cryptoService.decrypt(masterWallet.encryptedKey);

      let txHash: string;
      if (withdrawal.tokenAddress) {
        txHash = await this.tronService.sendTrc20(
          privateKey,
          withdrawal.toAddress,
          withdrawal.tokenAddress,
          withdrawal.amount,
        );
      } else {
        // withdrawal.amount is in TRX units, but sendTrx expects SUN (1 TRX = 1,000,000 SUN)
        const amountSun = Math.floor(Number(withdrawal.amount) * 1_000_000);
        txHash = await this.tronService.sendTrx(
          privateKey,
          withdrawal.toAddress,
          amountSun,
        );
      }

      // Create transaction record and link to withdrawal
      const transaction = await this.prisma.transaction.create({
        data: {
          txHash,
          type: TxType.EXTERNAL_SEND,
          status: TxStatus.CONFIRMED,
          fromUserId: withdrawal.userId,
          fromAddress: masterWallet.address,
          toAddress: withdrawal.toAddress,
          amount: withdrawal.amount,
          tokenSymbol: withdrawal.tokenSymbol,
          tokenAddress: withdrawal.tokenAddress,
        },
      });

      await this.prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalStatus.COMPLETED,
          completedAt: new Date(),
          transactionId: transaction.id,
        },
      });

      await this.notificationService.create(
        withdrawal.userId,
        'WITHDRAWAL_COMPLETE',
        'Withdrawal Complete',
        `Your withdrawal of ${withdrawal.amount} ${withdrawal.tokenSymbol} to ${withdrawal.toAddress} has been completed. TX: ${txHash}`,
        { withdrawalId, txHash },
      );

      this.logger.log(
        `Withdrawal ${withdrawalId} completed successfully via hot wallet. TX: ${txHash}`,
      );
    } catch (err) {
      const failReason =
        err instanceof Error ? err.message : 'Unknown execution error';

      await this.prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalStatus.FAILED,
          failReason,
        },
      });

      await this.notificationService.create(
        withdrawal.userId,
        'SYSTEM',
        'Withdrawal Failed',
        `Your withdrawal of ${withdrawal.amount} ${withdrawal.tokenSymbol} has failed. Please contact support.`,
        { withdrawalId, error: failReason },
      );

      this.logger.error(
        `Withdrawal ${withdrawalId} execution failed: ${failReason}`,
      );
    }
  }
}
