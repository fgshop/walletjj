import { AdminRole } from './enums';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress: string;
  createdAt: Date;
}

export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  updatedBy?: string | null;
  updatedAt: Date;
  createdAt: Date;
}
