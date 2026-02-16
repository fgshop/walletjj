import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CryptoService } from './crypto/crypto.service';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * Create a TRON wallet for a new user.
   * Called automatically after login if the user doesn't have a wallet.
   */
  async createWalletForUser(userId: string): Promise<{ address: string }> {
    // Check if user already has a wallet
    const existing = await this.prisma.wallet.findUnique({
      where: { userId },
    });
    if (existing) {
      return { address: existing.address };
    }

    // Get or create master wallet
    let masterWallet = await this.prisma.masterWallet.findFirst({
      where: { isActive: true },
    });

    if (!masterWallet) {
      masterWallet = await this.initializeMasterWallet();
    }

    // Decrypt master seed
    const mnemonic = this.cryptoService.decrypt(masterWallet.encryptedSeed);
    const seed = this.cryptoService.mnemonicToSeed(mnemonic);

    // Derive child key at next index
    const index = masterWallet.nextIndex;
    const { privateKey } = this.cryptoService.deriveChildKey(seed, index);

    // Generate TRON address
    const address = this.cryptoService.privateKeyToTronAddress(privateKey);

    // Encrypt private key for storage
    const encryptedKey = this.cryptoService.encrypt(privateKey.toString('hex'));

    // Save wallet and increment index in a transaction
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

  /**
   * Get wallet info for the current user.
   */
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
   * Get balance for the user's wallet (TRX + TRC-20 tokens).
   * Results are cached in Redis for 30 seconds.
   */
  async getBalance(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { address: true },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Check Redis cache
    const cacheKey = `balance:${wallet.address}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch TRX balance from TRON network
    const balances = await this.fetchBalancesFromNetwork(wallet.address);

    // Cache for 30 seconds
    await this.redis.set(cacheKey, JSON.stringify(balances), 30);

    return balances;
  }

  /**
   * Ensure user has a wallet - called after login.
   */
  async ensureWallet(userId: string): Promise<void> {
    const existing = await this.prisma.wallet.findUnique({
      where: { userId },
    });
    if (!existing) {
      await this.createWalletForUser(userId);
    }
  }

  private async fetchBalancesFromNetwork(address: string) {
    const tronHost = this.configService.get<string>(
      'TRON_FULL_HOST',
      'https://api.shasta.trongrid.io',
    );
    const apiKey = this.configService.get<string>('TRON_API_KEY', '');

    try {
      const { TronWeb } = require('tronweb');
      const tronWeb = new TronWeb({
        fullHost: tronHost,
        headers: apiKey ? { 'TRON-PRO-API-KEY': apiKey } : {},
      });

      // Get TRX balance
      const trxBalance = await tronWeb.trx.getBalance(address);

      const balances: Array<{
        symbol: string;
        contractAddress?: string;
        balance: string;
        decimals: number;
      }> = [
        {
          symbol: 'TRX',
          balance: trxBalance.toString(),
          decimals: 6,
        },
      ];

      // Get TRC-20 balances from supported tokens
      const tokens = await this.prisma.supportedToken.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      for (const token of tokens) {
        try {
          const contract = await tronWeb.contract().at(token.contractAddress);
          const balance = await contract.balanceOf(address).call();
          balances.push({
            symbol: token.symbol,
            contractAddress: token.contractAddress,
            balance: balance.toString(),
            decimals: token.decimals,
          });
        } catch (err) {
          this.logger.warn(
            `Failed to fetch ${token.symbol} balance for ${address}: ${err}`,
          );
        }
      }

      return { address, balances };
    } catch (err) {
      this.logger.error(`Failed to fetch balances for ${address}: ${err}`);
      // Return zero balances on error
      return {
        address,
        balances: [{ symbol: 'TRX', balance: '0', decimals: 6 }],
      };
    }
  }

  private async initializeMasterWallet() {
    const mnemonic = this.cryptoService.generateMnemonic();
    const seed = this.cryptoService.mnemonicToSeed(mnemonic);

    // Derive the master address (index 0 is used as hot wallet address)
    const { privateKey } = this.cryptoService.deriveChildKey(seed, 0);
    const address = this.cryptoService.privateKeyToTronAddress(privateKey);

    const encryptedSeed = this.cryptoService.encrypt(mnemonic);
    const encryptedKey = this.cryptoService.encrypt(privateKey.toString('hex'));

    const masterWallet = await this.prisma.masterWallet.create({
      data: {
        address,
        encryptedSeed,
        encryptedKey,
        nextIndex: 1, // 0 is used by master
        description: 'Auto-generated master wallet',
      },
    });

    this.logger.warn(
      `Master wallet initialized: ${address}. BACK UP THE MNEMONIC SECURELY IN PRODUCTION!`,
    );

    return masterWallet;
  }
}
