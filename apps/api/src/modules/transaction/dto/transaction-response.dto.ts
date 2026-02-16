import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  txHash?: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  fromAddress: string;

  @ApiProperty()
  toAddress: string;

  @ApiProperty()
  amount: string;

  @ApiProperty()
  tokenSymbol: string;

  @ApiProperty()
  tokenDecimals: number;

  @ApiPropertyOptional()
  tokenAddress?: string;

  @ApiPropertyOptional()
  fee?: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  memo?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  confirmedAt?: Date;
}
