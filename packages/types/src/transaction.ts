import { TxType, TxStatus } from './enums';

export interface Transaction {
  id: string;
  txHash?: string | null;
  type: TxType;
  fromUserId?: string | null;
  toUserId?: string | null;
  fromAddress: string;
  toAddress: string;
  amount: string;
  tokenAddress?: string | null;
  tokenSymbol: string;
  tokenDecimals: number;
  fee?: string | null;
  status: TxStatus;
  blockNumber?: bigint | null;
  confirmedAt?: Date | null;
  memo?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
