import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class LockWalletDto {
  @ApiProperty({ description: 'Reason for locking the wallet' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class UnlockWalletDto {
  @ApiPropertyOptional({ description: 'Reason for unlocking' })
  @IsOptional()
  @IsString()
  reason?: string;
}
