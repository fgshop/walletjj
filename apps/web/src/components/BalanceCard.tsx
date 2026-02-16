'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface BalanceInfo {
  joju: string;
  usdt: string;
  address: string;
  pendingJoju: number;
  pendingUsdt: number;
}

export default function BalanceCard() {
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddress, setShowAddress] = useState(false);

  useEffect(() => {
    async function fetchBalance() {
      try {
        const [walletRes, balanceRes] = await Promise.all([
          api.get('/wallet'),
          api.get('/wallet/balance'),
        ]);
        const balData = balanceRes.data.data ?? {};
        const balances = balData.balances ?? [];
        const pending = balData.pendingBySymbol ?? {};
        const jojuBal = balances.find((b: { symbol: string }) => b.symbol === 'JOJU');
        const usdtBal = balances.find((b: { symbol: string }) => b.symbol === 'USDT');
        setBalance({
          joju: jojuBal?.balance ?? '0',
          usdt: usdtBal?.balance ?? '0',
          address: walletRes.data.data?.address ?? '',
          pendingJoju: pending['JOJU'] ?? 0,
          pendingUsdt: pending['USDT'] ?? 0,
        });
      } catch {
        setBalance({ joju: '0', usdt: '0', address: '', pendingJoju: 0, pendingUsdt: 0 });
      } finally {
        setLoading(false);
      }
    }
    fetchBalance();
  }, []);

  const copyAddress = () => {
    if (balance?.address) {
      navigator.clipboard.writeText(balance.address);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl bg-primary p-6">
        <div className="h-6 w-24 rounded bg-white/20" />
        <div className="mt-4 h-10 w-40 rounded bg-white/20" />
        <div className="mt-3 h-5 w-32 rounded bg-white/20" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-light p-6 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white/70">총 잔액</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <div className="mt-4 space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{Number(balance?.joju ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
          <span className="text-sm font-medium text-white/70">JOJU</span>
        </div>
        {(balance?.pendingJoju ?? 0) > 0 && (
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span>출금 대기: -{balance!.pendingJoju.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-yellow-200">
              가용: {Math.max(0, Number(balance!.joju) - balance!.pendingJoju).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} JOJU
            </span>
          </div>
        )}
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-semibold text-white/90">{Number(balance?.usdt ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
          <span className="text-xs font-medium text-white/60">USDT</span>
        </div>
        {(balance?.pendingUsdt ?? 0) > 0 && (
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span>출금 대기: -{balance!.pendingUsdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-yellow-200">
              가용: {Math.max(0, Number(balance!.usdt) - balance!.pendingUsdt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDT
            </span>
          </div>
        )}
      </div>

      {balance?.address && (
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => setShowAddress(!showAddress)}
            className="text-xs text-white/50 transition hover:text-white/80"
          >
            {showAddress ? balance.address : `${balance.address.slice(0, 8)}...${balance.address.slice(-6)}`}
          </button>
          <button onClick={copyAddress} className="text-white/50 transition hover:text-white/80">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
