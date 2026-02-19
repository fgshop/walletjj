'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface BalanceInfo {
  joju: string;
  usdt: string;
  address: string;
  pendingJoju: number;
  pendingUsdt: number;
  internalNetJoju: number;
  internalNetUsdt: number;
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

export default function BalanceCard() {
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddress, setShowAddress] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

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
        const internalNet = balData.internalNetBySymbol ?? {};
        const jojuBal = balances.find((b: { symbol: string }) => b.symbol === 'JOJU');
        const usdtBal = balances.find((b: { symbol: string }) => b.symbol === 'USDT');
        setBalance({
          joju: jojuBal?.balance ?? '0',
          usdt: usdtBal?.balance ?? '0',
          address: walletRes.data.data?.address ?? '',
          pendingJoju: pending['JOJU'] ?? 0,
          pendingUsdt: pending['USDT'] ?? 0,
          internalNetJoju: internalNet['JOJU'] ?? 0,
          internalNetUsdt: internalNet['USDT'] ?? 0,
        });
      } catch {
        setBalance({ joju: '0', usdt: '0', address: '', pendingJoju: 0, pendingUsdt: 0, internalNetJoju: 0, internalNetUsdt: 0 });
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
      <div className="balance-gradient rounded-2xl p-6 glow-purple">
        <div className="relative z-10">
          <div className="h-6 w-24 rounded shimmer" />
          <div className="mt-4 h-10 w-40 rounded shimmer" />
          <div className="mt-3 h-5 w-32 rounded shimmer" />
        </div>
      </div>
    );
  }

  const onchainJoju = Number(balance?.joju ?? 0);
  const onchainUsdt = Number(balance?.usdt ?? 0);
  const effectiveJoju = onchainJoju + (balance?.internalNetJoju ?? 0) - (balance?.pendingJoju ?? 0);
  const effectiveUsdt = onchainUsdt + (balance?.internalNetUsdt ?? 0) - (balance?.pendingUsdt ?? 0);

  return (
    <div className="balance-gradient rounded-2xl p-6 text-white shadow-xl shadow-purple-500/10 glow-purple">
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white/70">유효 잔액</p>
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="flex h-8 items-center gap-1 rounded-full bg-white/10 px-3 text-xs font-medium text-white/70 backdrop-blur-sm transition-all duration-300 hover:bg-white/15 hover:text-white/90"
          >
            상세
            <svg className={`h-3 w-3 transition-transform duration-300 ${showDetail ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <div className="mt-4 space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight">{fmt(Math.max(0, effectiveJoju))}</span>
            <span className="text-sm font-medium text-white/70">JOJU</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold text-white/90">{fmt(Math.max(0, effectiveUsdt))}</span>
            <span className="text-xs font-medium text-white/60">USDT</span>
          </div>
        </div>

        {showDetail && (
          <div className="mt-4 space-y-3 rounded-xl bg-black/20 p-4 text-xs backdrop-blur-sm">
            {/* JOJU breakdown */}
            <div className="space-y-1.5">
              <p className="font-semibold text-white/80">JOJU 상세</p>
              <div className="flex justify-between text-white/60">
                <span>온체인 잔액</span>
                <span className="font-mono">{fmt(onchainJoju)} JOJU</span>
              </div>
              {(balance?.internalNetJoju ?? 0) !== 0 && (
                <div className="flex justify-between text-white/60">
                  <span>내부 수신</span>
                  <span className={`font-mono ${(balance?.internalNetJoju ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(balance?.internalNetJoju ?? 0) >= 0 ? '+' : ''}{fmt(balance?.internalNetJoju ?? 0)} JOJU
                  </span>
                </div>
              )}
              {(balance?.pendingJoju ?? 0) > 0 && (
                <div className="flex justify-between text-white/60">
                  <span>출금 대기</span>
                  <span className="font-mono text-amber-400">-{fmt(balance?.pendingJoju ?? 0)} JOJU</span>
                </div>
              )}
            </div>
            {/* USDT breakdown */}
            <div className="space-y-1.5 border-t border-white/10 pt-3">
              <p className="font-semibold text-white/80">USDT 상세</p>
              <div className="flex justify-between text-white/60">
                <span>온체인 잔액</span>
                <span className="font-mono">{fmt(onchainUsdt)} USDT</span>
              </div>
              {(balance?.internalNetUsdt ?? 0) !== 0 && (
                <div className="flex justify-between text-white/60">
                  <span>내부 수신</span>
                  <span className={`font-mono ${(balance?.internalNetUsdt ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(balance?.internalNetUsdt ?? 0) >= 0 ? '+' : ''}{fmt(balance?.internalNetUsdt ?? 0)} USDT
                  </span>
                </div>
              )}
              {(balance?.pendingUsdt ?? 0) > 0 && (
                <div className="flex justify-between text-white/60">
                  <span>출금 대기</span>
                  <span className="font-mono text-amber-400">-{fmt(balance?.pendingUsdt ?? 0)} USDT</span>
                </div>
              )}
            </div>
          </div>
        )}

        {balance?.address && (
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => setShowAddress(!showAddress)}
              className="text-xs font-mono text-white/50 transition-colors duration-300 hover:text-white/80"
            >
              {showAddress ? balance.address : `${balance.address.slice(0, 8)}...${balance.address.slice(-6)}`}
            </button>
            <button onClick={copyAddress} className="text-white/50 transition-colors duration-300 hover:text-white/80">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
