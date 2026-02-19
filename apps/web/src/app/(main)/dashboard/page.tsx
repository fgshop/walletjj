'use client';

import { useEffect, useState } from 'react';
import BalanceCard from '@/components/BalanceCard';
import TransactionList from '@/components/TransactionList';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';

export default function DashboardPage() {
  const [userName, setUserName] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);

  useEffect(() => {
    getUser()
      .then((u) => { setUserName(u.name); setCurrentUserId(u.id); })
      .catch(() => {});

    api.get('/transactions?page=1&limit=5')
      .then(({ data }) => setTransactions(data.data?.items ?? data.data ?? []))
      .catch(() => {})
      .finally(() => setTxLoading(false));
  }, []);

  return (
    <div className="space-y-6 pb-20 sm:pb-0">
      <div>
        <h1 className="text-xl font-bold text-white">
          {userName ? `${userName}님, 안녕하세요` : '대시보드'}
        </h1>
        <p className="text-sm text-gray-400">자산 현황과 최근 거래를 확인하세요</p>
      </div>

      <BalanceCard />

      {/* Quick Actions */}
      <div className="flex items-center gap-3">
        <a
          href="/send"
          className="btn-gradient flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          송금
        </a>
        <a
          href="/withdraw"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-purple-500/30"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          출금
        </a>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">최근 거래</h2>
          <a href="/transactions" className="text-xs font-medium text-purple-400 transition-colors hover:text-purple-300">
            전체보기
          </a>
        </div>
        <div className="glass-card p-4">
          <TransactionList transactions={transactions} loading={txLoading} currentUserId={currentUserId} />
        </div>
      </div>
    </div>
  );
}
