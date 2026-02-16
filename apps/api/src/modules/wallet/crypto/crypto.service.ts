import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { getTronDerivationPath } from '@joju/utils';

// ESM modules loaded dynamically
let HDKey: any;
let mnemonicToSeedSync: any;
let generateMnemonic: any;
let wordlist: any;

@Injectable()
export class CryptoService implements OnModuleInit {
  private readonly logger = new Logger(CryptoService.name);
  private encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    const keyHex = this.configService.get<string>('MASTER_WALLET_ENCRYPTION_KEY', '');
    if (keyHex && keyHex.length === 64) {
      this.encryptionKey = Buffer.from(keyHex, 'hex');
    } else {
      this.encryptionKey = randomBytes(32);
      this.logger.warn(
        'MASTER_WALLET_ENCRYPTION_KEY not set or invalid. Using random key (DO NOT use in production).',
      );
    }
  }

  async onModuleInit() {
    // Load ESM-only modules dynamically using Function() to bypass CJS compilation
    const esmImport = (specifier: string) =>
      Function('s', 'return import(s)')(specifier) as Promise<any>;

    const bip32 = await esmImport('@scure/bip32');
    HDKey = bip32.HDKey;

    const bip39 = await esmImport('@scure/bip39');
    mnemonicToSeedSync = bip39.mnemonicToSeedSync;
    generateMnemonic = bip39.generateMnemonic;

    const englishWordlist = await esmImport('@scure/bip39/wordlists/english.js');
    wordlist = englishWordlist.wordlist;
  }

  generateMnemonic(): string {
    return generateMnemonic(wordlist, 256);
  }

  deriveChildKey(seed: Buffer, index: number): { privateKey: Buffer; publicKey: Buffer } {
    const hdKey = HDKey.fromMasterSeed(new Uint8Array(seed));
    const path = getTronDerivationPath(index);
    const child = hdKey.derive(path);

    if (!child.privateKey || !child.publicKey) {
      throw new Error(`Failed to derive key at path ${path}`);
    }

    return {
      privateKey: Buffer.from(child.privateKey),
      publicKey: Buffer.from(child.publicKey),
    };
  }

  privateKeyToTronAddress(privateKey: Buffer): string {
    const { TronWeb } = require('tronweb');
    const tw = new TronWeb({ fullHost: 'https://api.shasta.trongrid.io' });
    const address = tw.address.fromPrivateKey(privateKey.toString('hex'));
    return address;
  }

  /**
   * Encrypt data using AES-256-GCM (Node.js built-in crypto).
   * Format: nonce(12 bytes) + ciphertext + authTag(16 bytes), hex-encoded
   */
  encrypt(plaintext: string): string {
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, nonce);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([nonce, encrypted, authTag]).toString('hex');
  }

  /**
   * Decrypt AES-256-GCM encrypted data.
   */
  decrypt(encryptedHex: string): string {
    const data = Buffer.from(encryptedHex, 'hex');
    const nonce = data.subarray(0, 12);
    const authTag = data.subarray(data.length - 16);
    const ciphertext = data.subarray(12, data.length - 16);

    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, nonce);
    decipher.setAuthTag(authTag);
    return decipher.update(ciphertext) + decipher.final('utf8');
  }

  mnemonicToSeed(mnemonic: string): Buffer {
    return Buffer.from(mnemonicToSeedSync(mnemonic));
  }
}
