'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyEmail } from '@/lib/auth';
import api from '@/lib/api';

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [autoSent, setAutoSent] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleResend = useCallback(async () => {
    if (!email || resending) return;
    setResending(true);
    setResendMsg('');
    setError('');
    try {
      await api.post('/auth/resend-code', { email });
      setResendMsg('새 인증 코드가 전송되었습니다. 이메일을 확인해주세요.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch {
      setResendMsg('코드 재전송에 실패했습니다.');
    } finally {
      setResending(false);
    }
  }, [email, resending]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Auto-send a new code when arriving from login redirect
  useEffect(() => {
    if (email && !autoSent) {
      setAutoSent(true);
      handleResend();
    }
  }, [email, autoSent, handleResend]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newCode = [...code];
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResendMsg('');
    const fullCode = code.join('');

    if (fullCode.length !== 6) {
      setError('6자리 인증 코드를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await verifyEmail({ email, code: fullCode });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { error?: { message?: string }; message?: string } } })?.response?.data;
      const msg = resp?.error?.message || resp?.message;
      setError(msg || '인증에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-auth-mesh px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-500 shadow-lg shadow-purple-500/20">
            <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold gradient-text">이메일 인증</h1>
          <p className="mt-2 text-sm text-gray-400">
            {email ? `${email}로 전송된 인증 코드를 입력해주세요` : '이메일로 전송된 인증 코드를 입력해주세요'}
          </p>
        </div>

        <div className="gradient-border">
          <form onSubmit={handleSubmit} className="glass-card-strong p-7">
            {error && (
              <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{error}</div>
            )}
            {success && (
              <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400">
                이메일 인증이 완료되었습니다! 로그인 페이지로 이동합니다.
              </div>
            )}
            {resendMsg && (
              <div className={`mb-4 rounded-lg p-3 text-sm ${resendMsg.includes('전송되었') ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                {resendMsg}
              </div>
            )}

            <div className="flex justify-center gap-3" onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="input-dark h-13 w-12 rounded-xl text-center text-lg font-semibold"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="btn-gradient mt-7 w-full rounded-xl py-3 text-sm font-semibold text-white"
            >
              {loading ? '인증 중...' : '인증하기'}
            </button>

            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={resending || !email}
                onClick={handleResend}
                className="text-sm font-medium text-cyan-400 transition-colors hover:text-cyan-300 disabled:opacity-50"
              >
                {resending ? '전송 중...' : '코드 재전송'}
              </button>
              <span className="text-gray-600">|</span>
              <a href="/login" className="text-sm font-medium text-purple-400 transition-colors hover:text-purple-300">
                로그인으로 돌아가기
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-auth-mesh">
        <div className="text-gray-400">로딩 중...</div>
      </div>
    }>
      <VerifyForm />
    </Suspense>
  );
}
