import { WithdrawalStatus } from './enums';

export interface WithdrawalRequest {
  id: string;
  userId: string;
  transactionId?: string | null;
  toAddress: string;
  amount: string;
  tokenAddress?: string | null;
  tokenSymbol: string;
  status: WithdrawalStatus;
  isFirstExternal: boolean;
  availableAt: Date;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  reviewNote?: string | null;
  completedAt?: Date | null;
  failReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
