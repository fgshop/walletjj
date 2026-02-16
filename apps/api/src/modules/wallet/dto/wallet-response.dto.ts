import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WalletResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'TRON address starting with T' })
  address: string;

  @ApiProperty()
  isLocked: boolean;

  @ApiPropertyOptional()
  lockedAt?: Date | null;

  @ApiPropertyOptional()
  lockReason?: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class BalanceItemDto {
  @ApiProperty()
  symbol: string;

  @ApiProperty({ required: false })
  contractAddress?: string;

  @ApiProperty()
  balance: string;

  @ApiProperty()
  decimals: number;
}

export class WalletBalanceResponseDto {
  @ApiProperty()
  address: string;

  @ApiProperty({ type: [BalanceItemDto] })
  balances: BalanceItemDto[];
}
