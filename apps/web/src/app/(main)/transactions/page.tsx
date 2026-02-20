'use client';

import { useEffect, useState, useCallback } from 'react';
import TransactionList from '@/components/TransactionList';
import api from '@/lib/api';
import { TxType } from '@joju/types';
import { getUser } from '@/lib/auth';

type FilterType = 'ALL' | 'INTERNAL' | 'WITHDRAWAL' | 'DEPOSIT';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    getUser()
      .then((u) => setCurrentUserId(u.id))
      .catch(() => {});
  }, []);

  const fetchTransactions = useCallback(async (p: number, type: FilterType, append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (type === 'INTERNAL') params.set('type', TxType.INTERNAL);
      else if (type === 'WITHDRAWAL') params.set('type', TxType.EXTERNAL_SEND);
      else if (type === 'DEPOSIT') {
        // Fetch both EXTERNAL_RECEIVE and DEPOSIT types
        params.set('type', TxType.EXTERNAL_RECEIVE);
      }
      const { data } = await api.get(`/transactions?${params}`);
      const items = data.data?.items ?? data.data ?? [];
      setTransactions((prev) => append ? [...prev, ...items] : items);
      setHasMore(items.length === 20);
    } catch {
      if (!append) setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchTransactions(1, filter);
  }, [filter, fetchTransactions]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchTransactions(next, filter, true);
  };

  const filters: { value: FilterType; label: string; tag?: string; tagClass?: string }[] = [
    { value: 'ALL', label: '전체' },
    { value: 'INTERNAL', label: '내부송금', tag: '내부', tagClass: 'text-purple-400' },
    { value: 'WITHDRAWAL', label: '출금', tag: '온체인', tagClass: 'text-cyan-400' },
    { value: 'DEPOSIT', label: '입금', tag: '온체인', tagClass: 'text-cyan-400' },
  ];

  return (
    <div className="pb-20 sm:pb-0">
      <h1 className="text-xl font-bold text-white">거래내역</h1>
      <p className="mb-6 text-sm text-gray-400">모든 거래 내역을 확인하세요</p>

      {/* Filter pills */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-300 ${
              filter === f.value
                ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 text-white border border-purple-500/30'
                : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 hover:text-white'
            }`}
          >
            {f.label}
            {f.tag && <span className={`ml-1 text-[9px] font-semibold ${filter === f.value ? 'text-white/60' : (f.tagClass || '')}`}>({f.tag})</span>}
          </button>
        ))}
      </div>

      <div>
        <TransactionList transactions={transactions} loading={loading && page === 1} currentUserId={currentUserId} />

        {hasMore && !loading && transactions.length > 0 && (
          <button
            onClick={loadMore}
            className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-gray-400 transition-all duration-300 hover:bg-white/10 hover:text-white"
          >
            더 보기
          </button>
        )}
      </div>
    </div>
  );
}
