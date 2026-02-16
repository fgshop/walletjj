import api from './api';

export async function adminLogin(email: string, password: string) {
  const { data } = await api.post('/admin/auth/login', { email, password });
  const token = data.data?.accessToken || data.accessToken;
  if (token) {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminName', data.data?.admin?.name || data.admin?.name || email);
  }
  return data;
}

export function adminLogout() {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminName');
  window.location.href = '/login';
}

export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('adminToken');
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('adminToken');
}

export function getAdminName(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('adminName') || '관리자';
}
