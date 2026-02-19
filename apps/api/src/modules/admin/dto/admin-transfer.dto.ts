import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class AdminTransferDto {
  @ApiProperty({ description: 'Source wallet ID (user wallet or master wallet)' })
  @IsString()
  fromWalletId: string;

  @ApiProperty({ description: 'Destination TRON address' })
  @IsString()
  toAddress: string;

  @ApiProperty({ description: 'Amount to transfer (in token units, e.g. 2 for 2 JOJU)' })
  @IsNumber()
  @Min(0.000001)
  amount: number;

  @ApiPropertyOptional({ description: 'Token symbol (default: JOJU)', default: 'JOJU' })
  @IsOptional()
  @IsString()
  tokenSymbol?: string;
}
