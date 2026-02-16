import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

  async getBalance(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { address: true },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const cacheKey = `balance:${wallet.address}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const balances = await this.fetchBalancesFromNetwork(wallet.address);

    await this.redis.set(cacheKey, JSON.stringify(balances), 30);

    return balances;
  }

  async ensureWallet(userId: string): Promise<void> {
    const existing = await this.prisma.wallet.findUnique({
      where: { userId },
    });
    if (!existing) {
      await this.createWalletForUser(userId);
    }
  }

  private async fetchBalancesFromNetwork(address: string) {
    try {
      const trxBalance = await this.tronService.getBalance(address);

      const balances: Array<{
        symbol: string;
        contractAddress?: string;
        balance: string;
        decimals: number;
      }> = [
        {
          symbol: 'TRX',
          balance: trxBalance,
          decimals: 6,
        },
      ];

      const tokens = await this.prisma.supportedToken.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      for (const token of tokens) {
        try {
          const balance = await this.tronService.getTrc20Balance(
            address,
            token.contractAddress,
          );
          balances.push({
            symbol: token.symbol,
            contractAddress: token.contractAddress,
            balance,
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
      return {
        address,
        balances: [{ symbol: 'TRX', balance: '0', decimals: 6 }],
      };
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
