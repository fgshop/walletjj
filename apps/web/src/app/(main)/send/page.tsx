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
  const [onchainBalance, setOnchainBalance] = useState<number>(0);
  const [pendingAmount, setPendingAmount] = useState<number>(0);
  const [internalNet, setInternalNet] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(true);

  const effectiveBalance = Math.max(0, onchainBalance + internalNet - pendingAmount);

  useEffect(() => {
    async function fetchBalance() {
      try {
        const { data } = await api.get('/wallet/balance');
        const balData = data.data ?? {};
        const balances = balData.balances ?? [];
        const pending = balData.pendingBySymbol ?? {};
        const internalNetMap = balData.internalNetBySymbol ?? {};
        const joju = balances.find((b: { symbol: string }) => b.symbol === 'JOJU');
        setOnchainBalance(Number(joju?.balance ?? 0));
        setPendingAmount(pending['JOJU'] ?? 0);
        setInternalNet(internalNetMap['JOJU'] ?? 0);
      } catch {
        setOnchainBalance(0);
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
    const val = effectiveBalance * (pct / 100);
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
    if (Number(amount) > effectiveBalance) {
      setError('유효 잔액이 부족합니다.');
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
      <p className="mb-6 text-sm text-gray-400">다른 회원에게 JOJU를 보내세요</p>

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
                    유효 잔액: <span className="font-semibold text-purple-400">{effectiveBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                    <span className="text-gray-500"> JOJU</span>
                  </span>
                )}
              </span>
            </div>
            <input
              type="number"
              step="any"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="input-dark w-full rounded-xl px-4 py-3 text-sm"
            />
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
