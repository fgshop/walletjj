import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { TronService } from '../wallet/tron/tron.service';
import { NotificationService } from '../notification/notification.service';
import { TxType, TxStatus } from '@prisma/client';

@Injectable()
export class BlockMonitorService implements OnModuleInit {
  private readonly logger = new Logger(BlockMonitorService.name);
  private isProcessing = false;
  private lastProcessedBlock = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tronService: TronService,
    private readonly notificationService: NotificationService,
  ) {}

  async onModuleInit() {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'lastProcessedBlock' },
    });
    if (config) {
      this.lastProcessedBlock = parseInt(config.value, 10);
    }
    this.logger.log(
      `Block monitor initialized. Last processed block: ${this.lastProcessedBlock}`,
    );
  }

  @Cron('*/10 * * * * *')
  async pollBlocks() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const currentBlock = await this.tronService.getBlockNumber();
      if (currentBlock <= this.lastProcessedBlock) {
        return;
      }

      // Process blocks from lastProcessedBlock+1 to currentBlock
      // For now, just track the block number. Full event parsing will be implemented later.
      for (
        let blockNum = this.lastProcessedBlock + 1;
        blockNum <= currentBlock;
        blockNum++
      ) {
        await this.processBlock(blockNum);
      }

      this.lastProcessedBlock = currentBlock;
      await this.saveLastProcessedBlock(currentBlock);
    } catch (err) {
      this.logger.error(`Block polling error: ${err}`);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processBlock(blockNumber: number) {
    // Scaffold: In the future, this will:
    // 1. Fetch block transactions from TronWeb
    // 2. Filter for TRC-20 Transfer events to our wallet addresses
    // 3. Create Transaction(DEPOSIT) records
    // 4. Send DEPOSIT notifications
    this.logger.debug(`Processing block ${blockNumber} (scaffold)`);
  }

  private async saveLastProcessedBlock(blockNumber: number) {
    await this.prisma.systemConfig.upsert({
      where: { key: 'lastProcessedBlock' },
      update: { value: blockNumber.toString() },
      create: { key: 'lastProcessedBlock', value: blockNumber.toString() },
    });
  }
}
