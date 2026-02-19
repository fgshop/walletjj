'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import DataTable, { Column } from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';

const TRONSCAN_URL = process.env.NEXT_PUBLIC_TRONSCAN_URL || 'https://tronscan.org';

interface User {
  id: string;
  name: string;
  email: string;
  status: string;
  wallet?: { id: string; address: string };
  createdAt: string;
  [key: string]: unknown;
}

interface WalletBalanceData {
  balances: Array<{ symbol: string; balance: string }>;
  offchainBalances: Array<{ symbol: string; balance: string }>;
}

function fmtBal(value: string | number): string {
  const num = Number(value);
  if (isNaN(num) || num === 0) return '0';
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // walletId → { onchain, offchain }
  const [balanceMap, setBalanceMap] = useState<Record<string, { onchain: string; offchain: string; loading: boolean }>>({});

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users', {
        params: { search: search || undefined, page, limit: 20 },
      });
      const data = res.data.data || res.data;
      const items: User[] = data.users || data.items || data;
      setUsers(items);
      setTotalPages(data.totalPages || data.meta?.totalPages || 1);

      // Reset balance map and fetch balances for users with wallets
      const initial: Record<string, { onchain: string; offchain: string; loading: boolean }> = {};
      const walletsToFetch: Array<{ walletId: string }> = [];
      for (const user of items) {
        if (user.wallet?.id) {
          initial[user.wallet.id] = { onchain: '-', offchain: '-', loading: true };
          walletsToFetch.push({ walletId: user.wallet.id });
        }
      }
      setBalanceMap(initial);

      // Fetch balances sequentially to avoid TronGrid rate limits
      for (const { walletId } of walletsToFetch) {
        try {
          const res = await api.get(`/admin/wallets/${walletId}/balance`);
          const d: WalletBalanceData = res.data.data || res.data;
          const onchainJoju = d.balances?.find((b) => b.symbol === 'JOJU');
          const offchainJoju = d.offchainBalances?.find((b) => b.symbol === 'JOJU');
          setBalanceMap((prev) => ({
            ...prev,
            [walletId]: {
              onchain: fmtBal(onchainJoju?.balance ?? '0'),
              offchain: fmtBal(offchainJoju?.balance ?? '0'),
              loading: false,
            },
          }));
        } catch {
          setBalanceMap((prev) => ({
            ...prev,
            [walletId]: { onchain: 'err', offchain: 'err', loading: false },
          }));
        }
      }
    } catch {
      /* handled by interceptor */
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (query: string) => {
    setSearch(query);
    setPage(1);
  };

  const handleCopy = (userId: string, address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const columns: Column<User>[] = [
    { key: 'name', label: '이름', sortable: true },
    { key: 'email', label: '이메일', sortable: true },
    {
      key: 'status',
      label: '상태',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'wallet',
      label: '지갑 주소',
      render: (row) => {
        if (!row.wallet?.address) {
          return <span className="text-text-secondary/50">-</span>;
        }
        const addr = row.wallet.address;
        const isCopied = copiedId === row.id;
        const bal = row.wallet.id ? balanceMap[row.wallet.id] : null;
        return (
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="font-mono text-xs text-text-secondary">
                {addr.slice(0, 8)}...{addr.slice(-6)}
              </span>
              {/* Copy */}
              <button
                onClick={() => handleCopy(row.id, addr)}
                title={isCopied ? '복사됨!' : '주소 복사'}
                className="relative rounded p-1 text-text-secondary/50 transition-colors duration-150 hover:bg-white/5 hover:text-text-secondary"
              >
                {isCopied ? (
                  <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
              {/* Tronscan link */}
              <a
                href={`${TRONSCAN_URL}/#/address/${addr}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Tronscan에서 보기"
                className="rounded p-1 text-text-secondary/50 transition-colors duration-150 hover:bg-white/5 hover:text-primary-light"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </span>
            {/* Balance row */}
            {bal && (
              <div className="flex items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1" title="온체인 잔액 (블록체인)">
                  <span className="text-cyan-400/70">온체인</span>
                  {bal.loading ? (
                    <span className="inline-block h-3 w-10 rounded shimmer align-middle" />
                  ) : (
                    <span className="font-mono text-text-secondary">{bal.onchain}</span>
                  )}
                </span>
                <span className="text-text-secondary/30">|</span>
                <span className="inline-flex items-center gap-1" title="오프체인 잔액 (DB 계산)">
                  <span className="text-purple-400/70">오프체인</span>
                  {bal.loading ? (
                    <span className="inline-block h-3 w-10 rounded shimmer align-middle" />
                  ) : (
                    <span className="font-mono text-text-secondary">{bal.offchain}</span>
                  )}
                </span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      label: '가입일',
      sortable: true,
      render: (row) => <span className="text-text-secondary">{new Date(row.createdAt).toLocaleDateString('ko-KR')}</span>,
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text">사용자 관리</h1>
      <DataTable
        columns={columns}
        data={users}
        searchPlaceholder="이름 또는 이메일로 검색..."
        onSearch={handleSearch}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="등록된 사용자가 없습니다"
        actions={(row) => (
          <Link
            href={`/users/${row.id}`}
            className="rounded-lg border border-white/10 px-3 py-1 text-xs font-medium text-primary-light transition-all duration-200 hover:bg-primary/10 hover:border-primary/30"
          >
            상세
          </Link>
        )}
      />
    </div>
  );
}
