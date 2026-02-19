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
      include: { user: { include: { wallet: true } } },
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

    const userWallet = withdrawal.user?.wallet;
    if (!userWallet) {
      await this.prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: { status: WithdrawalStatus.FAILED, failReason: 'User wallet not found' },
      });
      return;
    }

    // Get Hot Wallet for top-up fallback
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

    // Pre-check: ensure user's on-chain wallet has enough.
    // If not, top up the deficit from Hot Wallet (recorded as SWEEP, not affecting off-chain balance).
    try {
      const amountNeeded = Number(withdrawal.amount);

      if (!withdrawal.tokenAddress) {
        // TRX (JOJU): check user's on-chain balance
        const userBalanceSun = Number(await this.tronService.getBalance(userWallet.address));
        const userBalance = userBalanceSun / 1_000_000;
        // Need amount + 1 TRX reserve for gas
        const totalNeeded = amountNeeded + 1;

        if (userBalance < totalNeeded) {
          const deficitSun = Math.ceil((totalNeeded - userBalance) * 1_000_000);

          // Check Hot Wallet can cover the deficit
          const hotBalanceSun = Number(await this.tronService.getBalance(masterWallet.address));
          if (hotBalanceSun < deficitSun + 1_000_000) {
            throw new Error(
              `Insufficient funds: user on-chain ${userBalance} JOJU, hot wallet ${hotBalanceSun / 1_000_000} JOJU, need ${totalNeeded} JOJU`,
            );
          }

          const hotKey = this.cryptoService.decrypt(masterWallet.encryptedKey);
          const topupTxHash = await this.tronService.sendTrx(hotKey, userWallet.address, deficitSun);
          this.logger.log(`Topped up ${deficitSun / 1_000_000} JOJU to ${userWallet.address} for withdrawal (TX: ${topupTxHash})`);

          // Record top-up as SWEEP (excluded from balance calc)
          await this.prisma.transaction.create({
            data: {
              txHash: topupTxHash,
              type: TxType.SWEEP,
              status: TxStatus.CONFIRMED,
              fromAddress: masterWallet.address,
              toAddress: userWallet.address,
              amount: (deficitSun / 1_000_000).toString(),
              tokenSymbol: 'JOJU',
              confirmedAt: new Date(),
              memo: 'withdrawal-topup',
            },
          }).catch((err: any) => {
            if (err?.code !== 'P2002') throw err; // skip duplicate
          });

          // Wait for top-up to confirm
          await new Promise((r) => setTimeout(r, 5_000));
        }
      } else {
        // TRC-20: check user's token balance
        const tokenBalance = await this.tronService.getTrc20Balance(userWallet.address, withdrawal.tokenAddress);
        if (Number(tokenBalance) < amountNeeded) {
          throw new Error(
            `Insufficient ${withdrawal.tokenSymbol} in user wallet: ${tokenBalance} < ${amountNeeded}`,
          );
        }

        // Ensure user has enough TRX for gas (15 TRX)
        const userTrxSun = Number(await this.tronService.getBalance(userWallet.address));
        const gasNeeded = 15_000_000;
        if (userTrxSun < gasNeeded) {
          const hotKey = this.cryptoService.decrypt(masterWallet.encryptedKey);
          const needed = gasNeeded - userTrxSun;
          await this.tronService.sendTrx(hotKey, userWallet.address, needed);
          this.logger.log(`Sent ${needed} SUN gas to ${userWallet.address} for TRC-20 withdrawal`);
          await new Promise((r) => setTimeout(r, 5_000));
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
      // Send from user's own wallet (on-chain and off-chain both decrease → stay in sync)
      const userKey = this.cryptoService.decrypt(userWallet.encryptedKey);

      let txHash: string;
      if (withdrawal.tokenAddress) {
        txHash = await this.tronService.sendTrc20(
          userKey,
          withdrawal.toAddress,
          withdrawal.tokenAddress,
          withdrawal.amount,
        );
      } else {
        const amountSun = Math.floor(Number(withdrawal.amount) * 1_000_000);
        txHash = await this.tronService.sendTrx(
          userKey,
          withdrawal.toAddress,
          amountSun,
        );
      }

      // Create transaction record
      const transaction = await this.prisma.transaction.create({
        data: {
          txHash,
          type: TxType.EXTERNAL_SEND,
          status: TxStatus.CONFIRMED,
          fromUserId: withdrawal.userId,
          fromAddress: userWallet.address,
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
        `Withdrawal ${withdrawalId} completed from user wallet ${userWallet.address}. TX: ${txHash}`,
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
