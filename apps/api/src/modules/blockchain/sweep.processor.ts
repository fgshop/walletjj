import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../wallet/crypto/crypto.service';
import { TronService } from '../wallet/tron/tron.service';
import { SWEEP_QUEUE } from '../queue/queue.constants';
import { TxType, TxStatus } from '@joju/types';

/** Minimum TRX to keep in user wallet for bandwidth/energy (1 TRX) */
const TRX_RESERVE_SUN = 1_000_000;

interface SweepJobData {
  userId: string;
  walletAddress: string;
  tokenSymbol: string;
  tokenAddress: string | null;
  depositTxId: string;
  amount: string;
}

@Processor(SWEEP_QUEUE)
export class SweepProcessor extends WorkerHost {
  private readonly logger = new Logger(SweepProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private readonly tronService: TronService,
  ) {
    super();
  }

  async process(job: Job<SweepJobData>): Promise<void> {
    if (job.name !== 'sweep-deposit') return;

    const { userId, walletAddress, tokenSymbol, tokenAddress, depositTxId, amount } = job.data;

    this.logger.log(`Processing sweep: ${amount} ${tokenSymbol} from ${walletAddress}`);

    // Get user wallet
    const wallet = await this.prisma.wallet.findUnique({
      where: { address: walletAddress },
    });
    if (!wallet) {
      this.logger.warn(`Wallet not found for address ${walletAddress}, skipping sweep`);
      return;
    }

    // Get hot wallet
    const masterWallet = await this.prisma.masterWallet.findFirst({
      where: { isActive: true },
    });
    if (!masterWallet) {
      throw new Error('No active master wallet found for sweep');
    }

    // Don't sweep from the hot wallet to itself
    if (walletAddress === masterWallet.address) {
      this.logger.debug(`Skipping sweep: deposit was to hot wallet itself`);
      return;
    }

    const userPrivateKey = this.cryptoService.decrypt(wallet.encryptedKey);

    try {
      let txHash: string;

      if (!tokenAddress) {
        // Native TRX (JOJU) sweep: send balance minus reserve
        const balanceSun = Number(await this.tronService.getBalance(walletAddress));
        const sweepAmountSun = balanceSun - TRX_RESERVE_SUN;

        if (sweepAmountSun <= 0) {
          this.logger.log(`Insufficient TRX to sweep from ${walletAddress} (balance: ${balanceSun} SUN)`);
          return;
        }

        txHash = await this.tronService.sendTrx(
          userPrivateKey,
          masterWallet.address,
          sweepAmountSun,
        );

        const sweepAmountTrx = (sweepAmountSun / 1_000_000).toString();
        await this.recordSweepTransaction(txHash, userId, walletAddress, masterWallet.address, sweepAmountTrx, tokenSymbol, null);

      } else {
        // TRC-20 sweep: need TRX for gas. Hot wallet sends gas → user sweeps token.
        // Step 1: Send gas TRX from hot wallet to user address
        const gasAmountSun = 15_000_000; // 15 TRX for TRC-20 transfer energy
        const userTrxBalance = Number(await this.tronService.getBalance(walletAddress));

        if (userTrxBalance < gasAmountSun) {
          const hotPrivateKey = this.cryptoService.decrypt(masterWallet.encryptedKey);
          const needed = gasAmountSun - userTrxBalance;
          await this.tronService.sendTrx(hotPrivateKey, walletAddress, needed);
          this.logger.log(`Sent ${needed} SUN gas to ${walletAddress} for TRC-20 sweep`);

          // Brief wait for gas transaction confirmation
          await new Promise((resolve) => setTimeout(resolve, 5_000));
        }

        // Step 2: Sweep TRC-20 token from user to hot wallet
        const tokenBalance = await this.tronService.getTrc20Balance(walletAddress, tokenAddress);
        if (Number(tokenBalance) <= 0) {
          this.logger.log(`No ${tokenSymbol} balance to sweep from ${walletAddress}`);
          return;
        }

        txHash = await this.tronService.sendTrc20(
          userPrivateKey,
          masterWallet.address,
          tokenAddress,
          tokenBalance,
        );

        // Record using the original deposit amount (human-readable)
        await this.recordSweepTransaction(txHash, userId, walletAddress, masterWallet.address, amount, tokenSymbol, tokenAddress);
      }

      this.logger.log(
        `Sweep completed: ${amount} ${tokenSymbol} from ${walletAddress} → ${masterWallet.address} (TX: ${txHash})`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Sweep failed for ${walletAddress}: ${msg}`);
      throw err; // Let BullMQ retry
    }
  }

  private async recordSweepTransaction(
    txHash: string,
    userId: string,
    fromAddress: string,
    toAddress: string,
    amount: string,
    tokenSymbol: string,
    tokenAddress: string | null,
  ) {
    try {
      await this.prisma.transaction.create({
        data: {
          txHash,
          type: TxType.SWEEP,
          status: TxStatus.CONFIRMED,
          fromUserId: userId,
          fromAddress,
          toAddress,
          amount,
          tokenSymbol,
          tokenAddress,
          confirmedAt: new Date(),
          memo: 'auto-sweep to hot wallet',
        },
      });
    } catch (err: any) {
      // Skip duplicate txHash
      if (err?.code === 'P2002') {
        this.logger.debug(`Duplicate sweep TX skipped: ${txHash}`);
        return;
      }
      throw err;
    }
  }
}
