import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class InternalTransferDto {
  @ApiProperty({ description: 'Recipient TRON address or email' })
  @IsNotEmpty()
  @IsString()
  recipient: string;

  @ApiProperty({ description: 'Amount in smallest unit (sun for TRX)' })
  @IsNotEmpty()
  @IsString()
  amount: string;

  @ApiProperty({ description: 'Token symbol', default: 'TRX' })
  @IsOptional()
  @IsString()
  tokenSymbol?: string;

  @ApiProperty({ description: 'TRC-20 contract address (null for TRX)', required: false })
  @IsOptional()
  @IsString()
  tokenAddress?: string;

  @ApiProperty({ description: 'Optional memo', required: false })
  @IsOptional()
  @IsString()
  memo?: string;
}
