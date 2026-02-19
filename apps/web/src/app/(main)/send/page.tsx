'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';

const QrScanner = dynamic(() => import('@/components/QrScanner'), { ssr: false });

export default function SendPage() {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [pendingAmount, setPendingAmount] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(true);

  const sendableBalance = Math.max(0, balance - pendingAmount);

  useEffect(() => {
    async function fetchBalance() {
      try {
        const { data } = await api.get('/wallet/balance');
        const balData = data.data ?? {};
        const balances = balData.balances ?? [];
        const pending = balData.pendingBySymbol ?? {};
        const joju = balances.find((b: { symbol: string }) => b.symbol === 'JOJU');
        setBalance(Number(joju?.balance ?? 0));
        setPendingAmount(pending['JOJU'] ?? 0);
      } catch {
        setBalance(0);
      } finally {
        setBalanceLoading(false);
      }
    }
    fetchBalance();
  }, []);

  const handleQrScan = useCallback((result: string) => {
    setRecipient(result);
    setShowScanner(false);
  }, []);

  const setPercentage = (pct: number) => {
    const val = sendableBalance * (pct / 100);
    setAmount(val > 0 ? val.toString() : '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!recipient) {
      setError('받는 사람 이메일 또는 주소를 입력해주세요.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError('올바른 금액을 입력해주세요.');
      return;
    }
    if (Number(amount) > sendableBalance) {
      setError(`송금 가능 잔액이 부족합니다. (가용: ${sendableBalance} JOJU)`);
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      await api.post('/transactions/internal-transfer', {
        recipient,
        amount,
        tokenSymbol: 'JOJU',
        memo: memo || undefined,
      });
      setSuccess('송금이 완료되었습니다!');
      setRecipient('');
      setAmount('');
      setMemo('');
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { error?: { message?: string }; message?: string } } })?.response?.data;
      const msg = resp?.error?.message || resp?.message;
      setError(msg || '송금에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg pb-20 sm:pb-0">
      <h1 className="text-xl font-bold text-white">송금</h1>
      <p className="mb-4 text-sm text-gray-400">다른 회원에게 JOJU를 보내세요</p>

      {/* Internal transfer info */}
      <div className="mb-4 rounded-xl border border-purple-500/20 bg-purple-500/10 p-4">
        <div className="flex items-start gap-2">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <div className="text-xs text-purple-300/80">
            <p className="font-medium text-purple-200">내부 송금 안내</p>
            <p className="mt-1">회원간 송금은 블록체인 없이 즉시 처리됩니다. 수수료가 없습니다.</p>
          </div>
        </div>
      </div>

      <div className="glass-card-strong p-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{error}</div>
        )}
        {success && (
          <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400">{success}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">받는 사람</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="이메일 또는 TRON 주소"
                className="input-dark min-w-0 flex-1 rounded-xl px-4 py-3 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 transition-all duration-300 hover:border-purple-500/30 hover:text-purple-400"
                title="QR 스캔"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </button>
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">금액 (JOJU)</label>
              <span className="text-xs text-gray-400">
                {balanceLoading ? (
                  <span className="inline-block h-3 w-16 rounded shimmer align-middle" />
                ) : (
                  <span>
                    송금 가능: <span className="font-semibold text-purple-400">{sendableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                    <span className="text-gray-500"> JOJU</span>
                  </span>
                )}
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="input-dark w-full rounded-xl py-3 pl-4 pr-16 text-right text-sm"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                JOJU
              </span>
            </div>
            <div className="mt-2 flex gap-2">
              {[10, 15, 25, 50].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setPercentage(pct)}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 py-1.5 text-xs font-medium text-gray-400 transition-all duration-300 hover:border-purple-500/30 hover:text-purple-400"
                >
                  {pct}%
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPercentage(100)}
                className="flex-1 rounded-lg border border-purple-500/30 bg-purple-500/10 py-1.5 text-xs font-semibold text-purple-400 transition-all duration-300 hover:bg-purple-500/20"
              >
                Max
              </button>
            </div>
          </div>
          {/* Balance breakdown */}
          {!balanceLoading && pendingAmount > 0 && (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 text-[11px] text-gray-400">
              <div className="flex justify-between">
                <span>총 잔액</span>
                <span className="font-mono text-gray-300">{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} JOJU</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>출금 대기</span>
                <span className="font-mono text-amber-400">-{pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} JOJU</span>
              </div>
              <div className="mt-1.5 flex justify-between border-t border-white/[0.06] pt-1.5 font-medium text-gray-300">
                <span>송금 가능</span>
                <span className="font-mono text-purple-400">{sendableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} JOJU</span>
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">메모 (선택)</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="메모 입력"
              className="input-dark w-full rounded-xl px-4 py-3 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-gradient w-full rounded-xl py-3 text-sm font-semibold text-white"
          >
            {loading ? '처리 중...' : '송금하기'}
          </button>
        </form>
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm glass-card-strong p-6 shadow-2xl animate-fade-in">
            <h3 className="text-lg font-bold text-white">송금 확인</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">받는 사람</span>
                <span className="font-medium text-white">{recipient}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">금액</span>
                <span className="font-medium text-white">{Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} JOJU</span>
              </div>
              {memo && (
                <div className="flex justify-between">
                  <span className="text-gray-400">메모</span>
                  <span className="font-medium text-white">{memo}</span>
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-gray-300 transition-all duration-300 hover:bg-white/10"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                className="btn-gradient flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <QrScanner onScan={handleQrScan} onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
}
