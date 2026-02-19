import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SWEEP_QUEUE } from '../queue/queue.constants';

@Injectable()
export class SweepService {
  private readonly logger = new Logger(SweepService.name);

  constructor(
    @InjectQueue(SWEEP_QUEUE) private readonly sweepQueue: Queue,
  ) {}

  /**
   * Queue a sweep job to move funds from a user's deposit address to the Hot Wallet.
   */
  async queueSweep(params: {
    userId: string;
    walletAddress: string;
    tokenSymbol: string;
    tokenAddress: string | null;
    depositTxId: string;
    amount: string;
  }) {
    const jobId = `sweep-${params.depositTxId}`;

    await this.sweepQueue.add(
      'sweep-deposit',
      params,
      {
        jobId,
        delay: 30_000, // Wait 30s for block confirmations
        attempts: 3,
        backoff: { type: 'exponential', delay: 60_000 },
      },
    );

    this.logger.log(
      `Sweep queued for ${params.amount} ${params.tokenSymbol} from ${params.walletAddress} (deposit TX: ${params.depositTxId})`,
    );
  }
}
