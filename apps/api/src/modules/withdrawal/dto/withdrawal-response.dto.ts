import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WithdrawalResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  toAddress: string;

  @ApiProperty()
  amount: string;

  @ApiProperty()
  tokenSymbol: string;

  @ApiPropertyOptional()
  tokenAddress?: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  isFirstExternal: boolean;

  @ApiProperty()
  availableAt: Date;

  @ApiPropertyOptional()
  reviewedBy?: string;

  @ApiPropertyOptional()
  reviewedAt?: Date;

  @ApiPropertyOptional()
  reviewNote?: string;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  failReason?: string;

  @ApiProperty()
  createdAt: Date;
}
