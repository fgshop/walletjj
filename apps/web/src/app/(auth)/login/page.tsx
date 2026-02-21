'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await login({ email, password });
      router.push('/dashboard');
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { error?: { message?: string; code?: string; email?: string }; message?: string } } })?.response?.data;
      const errCode = resp?.error?.code;

      if (errCode === 'EMAIL_NOT_VERIFIED') {
        // Redirect to email verification page
        router.push(`/verify?email=${encodeURIComponent(email)}`);
        return;
      }

      const msg = resp?.error?.message || resp?.message;
      setError(msg || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-auth-mesh px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-500 shadow-lg shadow-purple-500/20">
            <span className="text-xl font-bold text-white">J</span>
          </div>
          <h1 className="text-3xl font-bold gradient-text">JOJU Wallet</h1>
          <p className="mt-2 text-sm text-gray-400">계정에 로그인하세요</p>
        </div>

        {/* Glass Card */}
        <div className="gradient-border">
          <form onSubmit={handleSubmit} className="glass-card-strong p-7">
            {error && (
              <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{error}</div>
            )}

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="input-dark w-full rounded-xl px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">비밀번호</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호 입력"
                    className="input-dark w-full rounded-xl px-4 py-3 pr-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-300"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gradient mt-7 w-full rounded-xl py-3 text-sm font-semibold text-white"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>

            <p className="mt-5 text-center text-sm text-gray-400">
              계정이 없으신가요?{' '}
              <a href="/register" className="font-medium text-purple-400 transition-colors hover:text-purple-300">
                회원가입
              </a>
            </p>

            {/* Test credentials */}
            <div className="mt-6 pt-4 border-t border-white/10 text-center">
              <p className="text-xs text-gray-500">테스트 계정</p>
              <p className="text-xs text-gray-400 mt-1">test@jojuwallet.com / Test1234!</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
