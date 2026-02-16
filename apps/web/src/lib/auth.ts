import api from './api';

interface LoginParams {
  email: string;
  password: string;
}

interface RegisterParams {
  name: string;
  email: string;
  password: string;
}

interface VerifyEmailParams {
  email: string;
  code: string;
}

export async function login({ email, password }: LoginParams) {
  const { data } = await api.post('/auth/login', { email, password, platform: 'WEB' });
  const { accessToken, refreshToken } = data.data;
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  return data.data;
}

export async function register({ name, email, password }: RegisterParams) {
  const { data } = await api.post('/auth/register', { name, email, password });
  return data.data;
}

export async function verifyEmail({ email, code }: VerifyEmailParams) {
  const { data } = await api.post('/auth/verify-email', { email, code });
  return data.data;
}

export async function logout() {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken });
    }
  } finally {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
}

export async function getUser() {
  const { data } = await api.get('/users/me');
  return data.data;
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('accessToken');
}
