'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';

interface BalanceEntry {
  symbol: string;
  balance: string;
  decimals: number;
}

interface BalanceData {
  address: string;
  balances: BalanceEntry[];
  pendingBySymbol: Record<string, number>;
  fetchedAt: string;
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

export default function BalanceCard() {
  const [address, setAddress] = useState('');
  const [balances, setBalances] = useState<BalanceEntry[]>([]);
  const [pending, setPending] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchBalance = useCallback(async () => {
    try {
      const [walletRes, balanceRes] = await Promise.all([
        api.get('/wallet'),
        api.get('/wallet/balance'),
      ]);
      const data: BalanceData = balanceRes.data.data ?? balanceRes.data ?? {};
      setAddress(walletRes.data.data?.address ?? '');
      setBalances(data.balances ?? []);
      setPending(data.pendingBySymbol ?? {});
    } catch {
      setBalances([]);
    }
  }, []);

  useEffect(() => {
    fetchBalance().finally(() => setLoading(false));
  }, [fetchBalance]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBalance();
    setRefreshing(false);
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  if (loading) {
    return (
      <div className="balance-gradient rounded-2xl p-6 glow-purple">
        <div className="relative z-10">
          <div className="h-5 w-20 rounded shimmer" />
          <div className="mt-4 h-24 rounded-xl shimmer" />
        </div>
      </div>
    );
  }

  const getBal = (symbol: string) => {
    const entry = balances.find((b) => b.symbol === symbol);
    return Number(entry?.balance ?? 0);
  };

  const joju = getBal('JOJU');
  const usdt = getBal('USDT');
  const pendingJoju = pending['JOJU'] ?? 0;
  const pendingUsdt = pending['USDT'] ?? 0;

  const availableJoju = Math.max(0, joju - pendingJoju);
  const availableUsdt = Math.max(0, usdt - pendingUsdt);

  return (
    <div className="balance-gradient rounded-2xl p-5 text-white shadow-xl shadow-purple-500/10 glow-purple sm:p-6">
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white/80">내 자산</p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="잔액 새로고침"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur-sm transition-all duration-300 hover:bg-white/20 hover:text-white disabled:opacity-50"
          >
            <svg
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Unified balance card */}
        <div className="mt-4 rounded-xl bg-white/[0.07] p-4 backdrop-blur-sm">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums tracking-tight">{fmt(joju)}</span>
            <span className="text-sm font-medium text-white/50">JOJU</span>
          </div>
          {usdt > 0 && (
            <div className="mt-2 border-t border-white/10 pt-2">
              <span className="text-lg font-semibold tabular-nums text-white/80">{fmt(usdt)}</span>
              <span className="ml-1.5 text-xs text-white/40">USDT</span>
            </div>
          )}
          <div className="mt-2 flex items-center gap-1.5">
            <span className="rounded bg-purple-400/15 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
              송금 + 출금 가능
            </span>
          </div>
        </div>

        {/* Pending withdrawal notice */}
        {(pendingJoju > 0 || pendingUsdt > 0) && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2">
            <svg className="h-3.5 w-3.5 shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-medium text-amber-300">
              {pendingJoju > 0 && (
                <span>출금 대기: -{fmt(pendingJoju)} JOJU (가용: {fmt(availableJoju)})</span>
              )}
              {pendingUsdt > 0 && (
                <span>출금 대기: -{fmt(pendingUsdt)} USDT (가용: {fmt(availableUsdt)})</span>
              )}
            </div>
          </div>
        )}

        {/* Wallet address */}
        {address && (
          <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
            <button
              onClick={() => setShowAddress(!showAddress)}
              className="font-mono text-xs text-white/50 transition-colors duration-300 hover:text-white/80"
            >
              {showAddress ? address : `${address.slice(0, 8)}...${address.slice(-6)}`}
            </button>
            <button
              onClick={copyAddress}
              title={copied ? '복사됨!' : '주소 복사'}
              className="text-white/50 transition-colors duration-300 hover:text-white/80"
            >
              {copied ? (
                <svg className="h-3.5 w-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
