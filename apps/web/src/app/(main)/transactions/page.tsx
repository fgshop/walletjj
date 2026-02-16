'use client';

import { useEffect, useState, useCallback } from 'react';
import TransactionList from '@/components/TransactionList';
import api from '@/lib/api';
import { TxType } from '@joju/types';

type FilterType = 'ALL' | TxType;

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchTransactions = useCallback(async (p: number, type: FilterType, append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (type !== 'ALL') params.set('type', type);
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

  const filters: { value: FilterType; label: string }[] = [
    { value: 'ALL', label: '전체' },
    { value: TxType.INTERNAL, label: '내부 송금' },
    { value: TxType.EXTERNAL_SEND, label: '외부 출금' },
    { value: TxType.EXTERNAL_RECEIVE, label: '외부 입금' },
    { value: TxType.DEPOSIT, label: '입금' },
  ];

  return (
    <div className="pb-20 sm:pb-0">
      <h1 className="text-xl font-bold">거래내역</h1>
      <p className="mb-6 text-sm text-text-secondary">모든 거래 내역을 확인하세요</p>

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition ${
              filter === f.value
                ? 'bg-primary text-white'
                : 'bg-surface text-text-secondary hover:bg-surface-dim'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-surface p-4 shadow-sm">
        <TransactionList transactions={transactions} loading={loading && page === 1} />

        {hasMore && !loading && transactions.length > 0 && (
          <button
            onClick={loadMore}
            className="mt-4 w-full rounded-lg border border-border py-2.5 text-sm font-medium text-text-secondary transition hover:bg-surface-dim"
          >
            더 보기
          </button>
        )}
      </div>
    </div>
  );
}
