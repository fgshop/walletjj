import { Platform } from './enums';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  isEmailVerified: boolean;
  isActive: boolean;
  isSuspended: boolean;
  suspendReason?: string | null;
  lastLoginAt?: Date | null;
  lastLoginIp?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface Session {
  id: string;
  userId: string;
  refreshToken: string;
  platform: Platform;
  deviceInfo?: string | null;
  ipAddress?: string | null;
  expiresAt: Date;
  createdAt: Date;
}

export interface EmailVerification {
  id: string;
  email: string;
  code: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}
