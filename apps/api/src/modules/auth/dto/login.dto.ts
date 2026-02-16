import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsEnum } from 'class-validator';
import { Platform } from '@prisma/client';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password1' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ enum: Platform, default: Platform.WEB })
  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform = Platform.WEB;
}
