export interface Wallet {
  id: string;
  userId: string;
  address: string;
  derivationIndex: number;
  isLocked: boolean;
  lockedAt?: Date | null;
  lockedBy?: string | null;
  lockReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MasterWallet {
  id: string;
  address: string;
  nextIndex: number;
  description?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
