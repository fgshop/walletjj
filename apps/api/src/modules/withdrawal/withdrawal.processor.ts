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

    // All withdrawals are sent from the Hot Wallet (sweep architecture)
    const masterWallet = await this.prisma.masterWallet.findFirst({
      where: { isActive: true },
    });
    if (!masterWallet) {
      await this.prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: { status: WithdrawalStatus.FAILED, failReason: 'No active hot wallet configured' },
      });
      return;
    }

    // Pre-check: ensure Hot Wallet has sufficient balance
    try {
      const amountNeeded = Number(withdrawal.amount);

      if (!withdrawal.tokenAddress) {
        // TRX (JOJU): check hot wallet balance
        const hotBalanceSun = Number(await this.tronService.getBalance(masterWallet.address));
        const hotBalance = hotBalanceSun / 1_000_000;
        // Need amount + 1 TRX reserve for gas
        const totalNeeded = amountNeeded + 1;

        if (hotBalance < totalNeeded) {
          throw new Error(
            `Hot wallet insufficient: ${hotBalance} JOJU available, need ${totalNeeded} JOJU`,
          );
        }
      } else {
        // TRC-20: check hot wallet token balance + TRX for gas
        const tokenBalance = await this.tronService.getTrc20Balance(masterWallet.address, withdrawal.tokenAddress);
        if (Number(tokenBalance) < amountNeeded) {
          throw new Error(
            `Hot wallet insufficient ${withdrawal.tokenSymbol}: ${tokenBalance} available, need ${amountNeeded}`,
          );
        }

        const hotTrxSun = Number(await this.tronService.getBalance(masterWallet.address));
        if (hotTrxSun < 15_000_000) {
          throw new Error(
            `Hot wallet insufficient TRX for gas: ${hotTrxSun / 1_000_000} TRX, need 15 TRX`,
          );
        }
      }
    } catch (err) {
      const failReason = err instanceof Error ? err.message : 'Balance check failed';
      this.logger.error(`Withdrawal ${withdrawalId} pre-check failed: ${failReason}`);
      await this.prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: { status: WithdrawalStatus.FAILED, failReason },
      });
      return;
    }

    // Transition to PROCESSING
    await this.prisma.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: { status: WithdrawalStatus.PROCESSING },
    });

    try {
      // Send from Hot Wallet (all funds are swept here)
      const hotKey = this.cryptoService.decrypt(masterWallet.encryptedKey);

      let txHash: string;
      if (withdrawal.tokenAddress) {
        txHash = await this.tronService.sendTrc20(
          hotKey,
          withdrawal.toAddress,
          withdrawal.tokenAddress,
          withdrawal.amount,
        );
      } else {
        const amountSun = Math.floor(Number(withdrawal.amount) * 1_000_000);
        txHash = await this.tronService.sendTrx(
          hotKey,
          withdrawal.toAddress,
          amountSun,
        );
      }

      // Create transaction record (fromAddress = hot wallet)
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
        `Withdrawal ${withdrawalId} completed from hot wallet ${masterWallet.address}. TX: ${txHash}`,
      );
    } catch (err) {
      const failReason =
        err instanceof Error ? err.message : 'Unknown execution error';

      await this.prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: { status: WithdrawalStatus.FAILED, failReason },
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
