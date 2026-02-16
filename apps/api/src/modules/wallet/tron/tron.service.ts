import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TronService {
  private readonly logger = new Logger(TronService.name);
  private tronWeb: any;

  constructor(private readonly configService: ConfigService) {
    const fullHost = this.configService.get<string>(
      'TRON_FULL_HOST',
      'https://api.shasta.trongrid.io',
    );
    const apiKey = this.configService.get<string>('TRON_API_KEY', '');

    const { TronWeb } = require('tronweb');
    this.tronWeb = new TronWeb({
      fullHost,
      headers: apiKey ? { 'TRON-PRO-API-KEY': apiKey } : {},
    });
  }

  async getBalance(address: string): Promise<string> {
    const balance = await this.tronWeb.trx.getBalance(address);
    return balance.toString();
  }

  async getTrc20Balance(
    address: string,
    contractAddress: string,
  ): Promise<string> {
    const contract = await this.tronWeb.contract().at(contractAddress);
    const balance = await contract.balanceOf(address).call();
    return balance.toString();
  }

  async sendTrx(
    fromPrivateKey: string,
    toAddress: string,
    amountSun: number,
  ): Promise<string> {
    const tw = this.createSigningInstance(fromPrivateKey);
    const tx = await tw.trx.sendTransaction(toAddress, amountSun);
    if (!tx.result) {
      throw new Error(`TRX transfer failed: ${JSON.stringify(tx)}`);
    }
    return tx.txid;
  }

  async sendTrc20(
    fromPrivateKey: string,
    toAddress: string,
    contractAddress: string,
    amount: string,
  ): Promise<string> {
    const tw = this.createSigningInstance(fromPrivateKey);
    const contract = await tw.contract().at(contractAddress);
    const tx = await contract.transfer(toAddress, amount).send();
    return tx;
  }

  async getTransaction(txHash: string): Promise<any> {
    return this.tronWeb.trx.getTransaction(txHash);
  }

  async getBlockNumber(): Promise<number> {
    const block = await this.tronWeb.trx.getCurrentBlock();
    return block.block_header?.raw_data?.number ?? 0;
  }

  async getBlockByNumber(blockNumber: number): Promise<any> {
    return this.tronWeb.trx.getBlock(blockNumber);
  }

  async getTrc20TransferEvents(
    contractAddress: string,
    options: { minBlockTimestamp: number; maxBlockTimestamp: number },
  ): Promise<any[]> {
    try {
      const events = await this.tronWeb.event.getEventsByContractAddress(
        contractAddress,
        {
          eventName: 'Transfer',
          minBlockTimestamp: options.minBlockTimestamp,
          maxBlockTimestamp: options.maxBlockTimestamp,
          limit: 200,
        },
      );
      return events.data || events || [];
    } catch (err) {
      this.logger.warn(`Failed to fetch TRC-20 events: ${err}`);
      return [];
    }
  }

  isAddressValid(address: string): boolean {
    return this.tronWeb.isAddress(address);
  }

  /** Fetch on-chain TRX transaction history for an address via TronGrid API */
  async getAccountTransactions(
    address: string,
    options?: { limit?: number; onlyTo?: boolean },
  ): Promise<any[]> {
    const limit = options?.limit ?? 50;
    const fullHost = this.configService.get<string>('TRON_FULL_HOST', 'https://api.shasta.trongrid.io');
    const apiKey = this.configService.get<string>('TRON_API_KEY', '');
    const onlyTo = options?.onlyTo ? '&only_to=true' : '';
    const url = `${fullHost}/v1/accounts/${address}/transactions?limit=${limit}${onlyTo}`;

    try {
      const fetch = globalThis.fetch;
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (apiKey) headers['TRON-PRO-API-KEY'] = apiKey;
      const resp = await (fetch as any)(url, { headers });
      const json = await resp.json();
      return json.data ?? [];
    } catch (err) {
      this.logger.warn(`Failed to fetch account transactions for ${address}: ${err}`);
      return [];
    }
  }

  /** Fetch on-chain TRC-20 transfer history for an address via TronGrid API */
  async getAccountTrc20Transactions(
    address: string,
    options?: { limit?: number; onlyTo?: boolean },
  ): Promise<any[]> {
    const limit = options?.limit ?? 50;
    const fullHost = this.configService.get<string>('TRON_FULL_HOST', 'https://api.shasta.trongrid.io');
    const apiKey = this.configService.get<string>('TRON_API_KEY', '');
    const onlyTo = options?.onlyTo ? '&only_to=true' : '';
    const url = `${fullHost}/v1/accounts/${address}/transactions/trc20?limit=${limit}${onlyTo}`;

    try {
      const fetch = globalThis.fetch;
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (apiKey) headers['TRON-PRO-API-KEY'] = apiKey;
      const resp = await (fetch as any)(url, { headers });
      const json = await resp.json();
      return json.data ?? [];
    } catch (err) {
      this.logger.warn(`Failed to fetch TRC-20 transactions for ${address}: ${err}`);
      return [];
    }
  }

  private createSigningInstance(privateKey: string): any {
    const fullHost = this.configService.get<string>(
      'TRON_FULL_HOST',
      'https://api.shasta.trongrid.io',
    );
    const apiKey = this.configService.get<string>('TRON_API_KEY', '');
    const { TronWeb } = require('tronweb');
    return new TronWeb({
      fullHost,
      headers: apiKey ? { 'TRON-PRO-API-KEY': apiKey } : {},
      privateKey,
    });
  }
}
