import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtPayload } from '../../common/types/jwt-payload.interface';
import { Platform } from '@joju/types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly walletService: WalletService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
      },
    });

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.prisma.emailVerification.create({
      data: {
        email: dto.email,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    // Create TRON wallet immediately
    const wallet = await this.walletService.createWalletForUser(user.id);

    this.logger.log(`User registered: ${dto.email}, verification code: ${code}`);
    await this.emailService.sendVerificationCode(dto.email, code);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isEmailVerified: user.isEmailVerified,
      address: wallet.address,
      createdAt: user.createdAt,
      message: 'Verification code sent to your email',
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const verification = await this.prisma.emailVerification.findFirst({
      where: {
        email: dto.email,
        code: dto.code,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerification.update({
        where: { id: verification.id },
        data: { isUsed: true },
      }),
      this.prisma.user.update({
        where: { email: dto.email },
        data: { isEmailVerified: true },
      }),
    ]);

    return { message: 'Email verified successfully' };
  }

  async resendVerificationCode(email: string) {
    if (!email) throw new BadRequestException('Email is required');

    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.isEmailVerified) throw new BadRequestException('Email is already verified');

    // Invalidate old codes
    await this.prisma.emailVerification.updateMany({
      where: { email, isUsed: false },
      data: { isUsed: true },
    });

    // Generate new code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.prisma.emailVerification.create({
      data: {
        email,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    this.logger.log(`Resend verification code for ${email}: ${code}`);
    await this.emailService.sendVerificationCode(email, code);

    return { message: 'New verification code sent' };
  }

  async login(dto: LoginDto, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive || user.isSuspended) {
      throw new UnauthorizedException('Account is suspended or deactivated');
    }

    // Check email verification BEFORE password so unverified users
    // are always redirected to the verify page
    if (!user.isEmailVerified) {
      throw new BadRequestException({
        message: 'Email not verified',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      });
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate JWT tokens
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload as any, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET')!,
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d') as any,
    });

    // Create session
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const expiresAt = this.calculateExpiry(refreshExpiresIn);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        platform: dto.platform || Platform.WEB,
        ipAddress,
        expiresAt,
      },
    });

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ipAddress },
    });

    // Ensure wallet exists (for users registered before wallet-on-register)
    this.walletService.ensureWallet(user.id).catch(() => {});

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      },
    };
  }

  async refresh(refreshToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!session.user.isActive || session.user.isSuspended) {
      throw new UnauthorizedException('Account is suspended or deactivated');
    }

    // Generate new token pair
    const payload: JwtPayload = { sub: session.userId, email: session.user.email };
    const newAccessToken = this.jwtService.sign(payload);
    const newRefreshToken = this.jwtService.sign(payload as any, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET')!,
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d') as any,
    });

    // Rotate refresh token
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const expiresAt = this.calculateExpiry(refreshExpiresIn);

    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshToken: newRefreshToken, expiresAt },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        phone: session.user.phone,
        isEmailVerified: session.user.isEmailVerified,
        createdAt: session.user.createdAt,
      },
    };
  }

  async logout(refreshToken: string) {
    await this.prisma.session.deleteMany({
      where: { refreshToken },
    });
    return { message: 'Logged out successfully' };
  }

  private calculateExpiry(duration: string): Date {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // default 7d

    const value = parseInt(match[1]);
    const unit = match[2];
    const ms = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    }[unit]!;

    return new Date(Date.now() + value * ms);
  }
}
