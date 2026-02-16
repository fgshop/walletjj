import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateWithdrawalDto {
  @ApiProperty({ description: 'External TRON address to withdraw to' })
  @IsNotEmpty()
  @IsString()
  toAddress: string;

  @ApiProperty({ description: 'Amount in smallest unit' })
  @IsNotEmpty()
  @IsString()
  amount: string;

  @ApiPropertyOptional({ description: 'Token symbol', default: 'TRX' })
  @IsOptional()
  @IsString()
  tokenSymbol?: string;

  @ApiPropertyOptional({ description: 'TRC-20 contract address (null for TRX)' })
  @IsOptional()
  @IsString()
  tokenAddress?: string;
}
