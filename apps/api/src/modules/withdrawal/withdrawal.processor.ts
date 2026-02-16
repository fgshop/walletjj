import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { WITHDRAWAL_QUEUE } from '../queue/queue.constants';
import { WithdrawalStatus } from '@prisma/client';

@Processor(WITHDRAWAL_QUEUE)
export class WithdrawalProcessor extends WorkerHost {
  private readonly logger = new Logger(WithdrawalProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ withdrawalId: string }>): Promise<void> {
    const { withdrawalId } = job.data;

    if (job.name === 'process-24h') {
      await this.handle24hTransition(withdrawalId);
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
}
