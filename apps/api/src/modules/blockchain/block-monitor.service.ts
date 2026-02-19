import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { TronService } from '../wallet/tron/tron.service';
import { NotificationService } from '../notification/notification.service';
import { SweepService } from './sweep.service';
import { TxType, TxStatus } from '@prisma/client';

const { TronWeb } = require('tronweb');

const MAX_BLOCKS_PER_POLL = 10;
const ADDRESS_REFRESH_INTERVAL = 60_000;
// transfer(address,uint256) method signature
const TRANSFER_METHOD_ID = 'a9059cbb';

@Injectable()
export class BlockMonitorService implements OnModuleInit {
  private readonly logger = new Logger(BlockMonitorService.name);
  private isProcessing = false;
  private lastProcessedBlock = 0;

  private walletAddresses: Set<string> = new Set();
  private lastAddressRefresh = 0;
  private enabled = true;

  // Map contract address → { symbol, decimals }
  private supportedTokens: Map<
    string,
    { symbol: string; decimals: number }
  > = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tronService: TronService,
    private readonly notificationService: NotificationService,
    private readonly sweepService: SweepService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('TRON_API_KEY', '');
    if (!apiKey) {
      this.enabled = false;
    }
  }

  async onModuleInit() {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'lastProcessedBlock' },
    });
    if (config) {
      this.lastProcessedBlock = parseInt(config.value, 10);
    }

    await this.refreshWalletAddresses();
    await this.refreshSupportedTokens();

    if (!this.enabled) {
      this.logger.warn('Block monitor disabled — TRON_API_KEY not set');
      return;
    }

    this.logger.log(
      `Block monitor initialized. Last processed block: ${this.lastProcessedBlock}`,
    );
  }

  @Cron('*/10 * * * * *')
  async pollBlocks() {
    if (!this.enabled || this.isProcessing) return;
    this.isProcessing = true;

    try {
      const currentBlock = await this.tronService.getBlockNumber();
      if (currentBlock <= this.lastProcessedBlock) {
        return;
      }

      await this.refreshWalletAddresses();

      if (this.walletAddresses.size === 0) {
        this.lastProcessedBlock = currentBlock;
        await this.saveLastProcessedBlock(currentBlock);
        return;
      }

      const endBlock = Math.min(
        this.lastProcessedBlock + MAX_BLOCKS_PER_POLL,
        currentBlock,
      );

      for (
        let blockNum = this.lastProcessedBlock + 1;
        blockNum <= endBlock;
        blockNum++
      ) {
        await this.processBlock(blockNum);
      }

      this.lastProcessedBlock = endBlock;
      await this.saveLastProcessedBlock(endBlock);
    } catch (err) {
      this.logger.error(`Block polling error: ${err}`);
    } finally {
      this.isProcessing = false;
    }
  }

  private async refreshWalletAddresses() {
    if (Date.now() - this.lastAddressRefresh < ADDRESS_REFRESH_INTERVAL) return;

    const wallets = await this.prisma.wallet.findMany({
      select: { address: true },
    });
    this.walletAddresses = new Set(wallets.map((w) => w.address));
    this.lastAddressRefresh = Date.now();
  }

  private async refreshSupportedTokens() {
    const tokens = await this.prisma.supportedToken.findMany({
      where: { isActive: true },
    });
    this.supportedTokens.clear();
    for (const token of tokens) {
      this.supportedTokens.set(token.contractAddress, {
        symbol: token.symbol,
        decimals: token.decimals,
      });
    }
  }

  private async processBlock(blockNumber: number) {
    let block: any;
    try {
      block = await this.tronService.getBlockByNumber(blockNumber);
    } catch (err) {
      this.logger.warn(`Failed to fetch block ${blockNumber}: ${err}`);
      return;
    }

    const transactions = block?.transactions || [];

    for (const tx of transactions) {
      const contract = tx?.raw_data?.contract?.[0];
      if (!contract) continue;

      const txHash = tx.txID;

      if (contract.type === 'TransferContract') {
        // Native TRX transfer
        await this.handleTrxTransfer(txHash, contract.parameter?.value);
      } else if (contract.type === 'TriggerSmartContract') {
        // Possible TRC-20 transfer
        await this.handleSmartContractTx(txHash, contract.parameter?.value);
      }
    }
  }

  private async handleTrxTransfer(
    txHash: string,
    value: { owner_address: string; to_address: string; amount: number } | undefined,
  ) {
    if (!value) return;

    const toAddress = this.hexToBase58(value.to_address);
    if (!this.walletAddresses.has(toAddress)) return;

    const fromAddress = this.hexToBase58(value.owner_address);
    // value.amount is in SUN — normalize to TRX (1 TRX = 1,000,000 SUN)
    const amountTrx = (Number(value.amount) / 1_000_000).toString();

    await this.createDepositTransaction({
      txHash,
      fromAddress,
      toAddress,
      amount: amountTrx,
      tokenSymbol: 'JOJU',
      tokenAddress: null,
    });
  }

  private async handleSmartContractTx(
    txHash: string,
    value: { owner_address: string; contract_address: string; data: string } | undefined,
  ) {
    if (!value?.data) return;

    const data = value.data;
    // Check if this is a transfer(address,uint256) call
    if (!data.startsWith(TRANSFER_METHOD_ID)) return;

    const contractAddress = this.hexToBase58(value.contract_address);
    const tokenInfo = this.supportedTokens.get(contractAddress);
    if (!tokenInfo) return;

    // Parse transfer data: 4 bytes method + 32 bytes address + 32 bytes amount
    const toAddressHex = '41' + data.substring(8 + 24, 8 + 64);
    const toAddress = this.hexToBase58(toAddressHex);

    if (!this.walletAddresses.has(toAddress)) return;

    const amountHex = data.substring(8 + 64, 8 + 128);
    const rawAmount = BigInt('0x' + amountHex);
    // Normalize raw token units to human-readable (e.g. 100000000 → 100.0 for 6 decimals)
    const amount = tokenInfo.decimals > 0
      ? (Number(rawAmount) / Math.pow(10, tokenInfo.decimals)).toString()
      : rawAmount.toString();

    const fromAddress = this.hexToBase58(value.owner_address);

    await this.createDepositTransaction({
      txHash,
      fromAddress,
      toAddress,
      amount,
      tokenSymbol: tokenInfo.symbol,
      tokenAddress: contractAddress,
    });
  }

  private async createDepositTransaction(params: {
    txHash: string;
    fromAddress: string;
    toAddress: string;
    amount: string;
    tokenSymbol: string;
    tokenAddress: string | null;
  }) {
    // Find wallet owner
    const wallet = await this.prisma.wallet.findUnique({
      where: { address: params.toAddress },
    });
    if (!wallet) return;

    try {
      const depositTx = await this.prisma.transaction.create({
        data: {
          txHash: params.txHash,
          type: TxType.DEPOSIT,
          status: TxStatus.CONFIRMED,
          toUserId: wallet.userId,
          fromAddress: params.fromAddress,
          toAddress: params.toAddress,
          amount: params.amount,
          tokenSymbol: params.tokenSymbol,
          tokenAddress: params.tokenAddress,
        },
      });

      await this.notificationService.create(
        wallet.userId,
        'DEPOSIT',
        'Deposit Received',
        `You received ${params.amount} ${params.tokenSymbol} from ${params.fromAddress}`,
        { txHash: params.txHash },
      );

      this.logger.log(
        `Deposit detected: ${params.amount} ${params.tokenSymbol} → ${params.toAddress} (TX: ${params.txHash})`,
      );

      // Queue auto-sweep to Hot Wallet
      await this.sweepService.queueSweep({
        userId: wallet.userId,
        walletAddress: params.toAddress,
        tokenSymbol: params.tokenSymbol,
        tokenAddress: params.tokenAddress,
        depositTxId: depositTx.id,
        amount: params.amount,
      });
    } catch (err: any) {
      // Skip duplicate txHash (unique constraint)
      if (err?.code === 'P2002') {
        this.logger.debug(`Duplicate deposit TX skipped: ${params.txHash}`);
        return;
      }
      this.logger.error(`Failed to create deposit record: ${err}`);
    }
  }

  private hexToBase58(hexAddress: string): string {
    try {
      return TronWeb.address.fromHex(hexAddress);
    } catch {
      return hexAddress;
    }
  }

  private async saveLastProcessedBlock(blockNumber: number) {
    await this.prisma.systemConfig.upsert({
      where: { key: 'lastProcessedBlock' },
      update: { value: blockNumber.toString() },
      create: { key: 'lastProcessedBlock', value: blockNumber.toString() },
    });
  }
}
