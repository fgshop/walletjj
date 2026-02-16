export interface SupportedToken {
  id: string;
  contractAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  iconUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceHistory {
  id: string;
  symbol: string;
  priceUsd: number;
  volume24h?: number | null;
  change24h?: number | null;
  timestamp: Date;
  createdAt: Date;
}
