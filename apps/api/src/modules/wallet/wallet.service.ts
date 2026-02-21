import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TxType, TxStatus } from '@joju/types';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CryptoService } from './crypto/crypto.service';
import { TronService } from './tron/tron.service';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
    private readonly cryptoService: CryptoService,
    private readonly tronService: TronService,
  ) {}

  async createWalletForUser(userId: string): Promise<{ address: string }> {
    const existing = await this.prisma.wallet.findUnique({
      where: { userId },
    });
    if (existing) {
      return { address: existing.address };
    }

    let masterWallet = await this.prisma.masterWallet.findFirst({
      where: { isActive: true },
    });

    if (!masterWallet) {
      masterWallet = await this.initializeMasterWallet();
    }

    const mnemonic = this.cryptoService.decrypt(masterWallet.encryptedSeed);
    const seed = this.cryptoService.mnemonicToSeed(mnemonic);

    const index = masterWallet.nextIndex;
    const { privateKey } = this.cryptoService.deriveChildKey(seed, index);

    const address = this.cryptoService.privateKeyToTronAddress(privateKey);

    const encryptedKey = this.cryptoService.encrypt(privateKey.toString('hex'));

    await this.prisma.$transaction([
      this.prisma.wallet.create({
        data: {
          userId,
          address,
          encryptedKey,
          derivationIndex: index,
        },
      }),
      this.prisma.masterWallet.update({
        where: { id: masterWallet.id },
        data: { nextIndex: index + 1 },
      }),
    ]);

    this.logger.log(`Wallet created for user ${userId}: ${address} (index: ${index})`);

    return { address };
  }

  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: {
        id: true,
        address: true,
        isLocked: true,
        lockedAt: true,
        lockReason: true,
        createdAt: true,
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found. Please login to create one.');
    }

    return wallet;
  }

  /**
   * Compute user's DB balance for a given token symbol.
   * Formula: SUM(deposits received) + SUM(internal received) - SUM(internal sent) - SUM(completed withdrawals)
   * SWEEP transactions are excluded (they don't affect user balance).
   */
  async getComputedBalance(userId: string, tokenSymbol: string): Promise<number> {
    // Incoming: DEPOSIT + INTERNAL received
    const incoming = await this.prisma.transaction.findMany({
      where: {
        toUserId: userId,
        tokenSymbol,
        status: TxStatus.CONFIRMED,
        type: { in: [TxType.DEPOSIT, TxType.INTERNAL] },
      },
      select: { amount: true },
    });
    const totalIn = incoming.reduce((sum, tx) => sum + Number(tx.amount), 0);

    // Outgoing: INTERNAL sent + EXTERNAL_SEND (completed withdrawals)
    const outgoing = await this.prisma.transaction.findMany({
      where: {
        fromUserId: userId,
        tokenSymbol,
        status: TxStatus.CONFIRMED,
        type: { in: [TxType.INTERNAL, TxType.EXTERNAL_SEND] },
      },
      select: { amount: true },
    });
    const totalOut = outgoing.reduce((sum, tx) => sum + Number(tx.amount), 0);

    return totalIn - totalOut;
  }

  /**
   * Available balance = DB balance - pending withdrawals (not yet completed/rejected/refunded)
   */
  async getAvailableBalance(userId: string, tokenSymbol: string): Promise<number> {
    const computed = await this.getComputedBalance(userId, tokenSymbol);

    const pendingWithdrawals = await this.prisma.withdrawalRequest.findMany({
      where: {
        userId,
        tokenSymbol,
        status: { in: ['PENDING_24H', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSING'] },
      },
      select: { amount: true },
    });
    const pendingSum = pendingWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);

    return computed - pendingSum;
  }

  async getBalance(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { address: true },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Get all supported tokens
    const tokens = await this.prisma.supportedToken.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Build balance list from DB computation
    const symbols = ['JOJU', ...tokens.map((t) => t.symbol)];
    const uniqueSymbols = [...new Set(symbols)];

    const balances: Array<{
      symbol: string;
      contractAddress?: string;
      balance: string;
      decimals: number;
    }> = [];

    for (const symbol of uniqueSymbols) {
      const computed = await this.getComputedBalance(userId, symbol);
      const token = tokens.find((t) => t.symbol === symbol);
      balances.push({
        symbol,
        contractAddress: token?.contractAddress,
        balance: computed.toString(),
        decimals: token?.decimals ?? 6,
      });
    }

    // Pending withdrawals by symbol
    const pendingWithdrawals = await this.prisma.withdrawalRequest.findMany({
      where: {
        userId,
        status: { in: ['PENDING_24H', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSING'] },
      },
      select: { amount: true, tokenSymbol: true },
    });

    const pendingBySymbol: Record<string, number> = {};
    for (const w of pendingWithdrawals) {
      const sym = w.tokenSymbol;
      pendingBySymbol[sym] = (pendingBySymbol[sym] ?? 0) + Number(w.amount);
    }

    return {
      address: wallet.address,
      balances,
      pendingBySymbol,
      fetchedAt: new Date().toISOString(),
    };
  }

  async ensureWallet(userId: string): Promise<void> {
    const existing = await this.prisma.wallet.findUnique({
      where: { userId },
    });
    if (!existing) {
      await this.createWalletForUser(userId);
    }
  }

  private async initializeMasterWallet() {
    const mnemonic = this.cryptoService.generateMnemonic();
    const seed = this.cryptoService.mnemonicToSeed(mnemonic);

    const { privateKey } = this.cryptoService.deriveChildKey(seed, 0);
    const address = this.cryptoService.privateKeyToTronAddress(privateKey);

    const encryptedSeed = this.cryptoService.encrypt(mnemonic);
    const encryptedKey = this.cryptoService.encrypt(privateKey.toString('hex'));

    const masterWallet = await this.prisma.masterWallet.create({
      data: {
        address,
        encryptedSeed,
        encryptedKey,
        nextIndex: 1,
        description: 'Auto-generated master wallet',
      },
    });

    this.logger.warn(
      `Master wallet initialized: ${address}. BACK UP THE MNEMONIC SECURELY IN PRODUCTION!`,
    );

    return masterWallet;
  }
}
