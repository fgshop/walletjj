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

  isAddressValid(address: string): boolean {
    return this.tronWeb.isAddress(address);
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
