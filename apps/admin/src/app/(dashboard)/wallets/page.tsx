'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '../../../lib/api';
import DataTable, { Column } from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import Modal from '../../../components/Modal';

interface BalanceEntry {
  symbol: string;
  balance: string;
  decimals: number;
}

interface WalletBalance {
  balances: BalanceEntry[];
  pendingBySymbol: Record<string, number>;
}

interface Wallet {
  id: string;
  address: string;
  isLocked: boolean;
  createdAt: string;
  user?: { email: string; name: string };
  [key: string]: unknown;
}

function fmtBalance(value: string | number, decimals?: number): string {
  const num = Number(value);
  if (isNaN(num)) return '0.00';
  // TRC-20 tokens with high decimals - normalize
  if (decimals && decimals > 0 && num > 1_000_000) {
    return (num / Math.pow(10, decimals)).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export default function WalletsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [modalTarget, setModalTarget] = useState<Wallet | null>(null);
  const [modalAction, setModalAction] = useState<'lock' | 'unlock'>('lock');
  const [actionLoading, setActionLoading] = useState(false);
  const [sweepLoading, setSweepLoading] = useState<Record<string, boolean>>({});
  const [migrateLoading, setMigrateLoading] = useState(false);
  const [migrateResult, setMigrateResult] = useState<string | null>(null);

  // Balance state: walletId -> WalletBalance
  const [balances, setBalances] = useState<Record<string, WalletBalance>>({});
  const [balanceLoading, setBalanceLoading] = useState<Record<string, boolean>>({});

  const fetchWallets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/wallets', {
        params: { search: search || undefined, page, limit: 20 },
      });
      const data = res.data.data || res.data;
      const items: Wallet[] = data.wallets || data.items || data;
      setWallets(items);
      setTotalPages(data.totalPages || data.meta?.totalPages || 1);
      return items;
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  const fetchBalances = useCallback(async (walletList: Wallet[]) => {
    if (walletList.length === 0) return;

    // Mark all as loading
    const loadingState: Record<string, boolean> = {};
    walletList.forEach((w) => { loadingState[w.id] = true; });
    setBalanceLoading((prev) => ({ ...prev, ...loadingState }));

    // Fetch balances in parallel
    const results = await Promise.allSettled(
      walletList.map((w) => api.get(`/admin/wallets/${w.id}/balance`))
    );

    const newBalances: Record<string, WalletBalance> = {};
    const doneLoading: Record<string, boolean> = {};

    results.forEach((result, i) => {
      const walletId = walletList[i].id;
      doneLoading[walletId] = false;
      if (result.status === 'fulfilled') {
        const data = result.value.data.data || result.value.data;
        newBalances[walletId] = {
          balances: data.balances || [],
          pendingBySymbol: data.pendingBySymbol || {},
        };
      }
    });

    setBalances((prev) => ({ ...prev, ...newBalances }));
    setBalanceLoading((prev) => ({ ...prev, ...doneLoading }));
  }, []);

  useEffect(() => {
    fetchWallets().then((items) => {
      if (items.length > 0) fetchBalances(items);
    });
  }, [fetchWallets, fetchBalances]);

  const handleAction = async () => {
    if (!modalTarget) return;
    setActionLoading(true);
    try {
      await api.post(`/admin/wallets/${modalTarget.id}/${modalAction}`);
      setModalTarget(null);
      const items = await fetchWallets();
      if (items.length > 0) fetchBalances(items);
    } catch {
      /* handled by interceptor */
    } finally {
      setActionLoading(false);
    }
  };

  const handleSweep = async (walletId: string) => {
    setSweepLoading((prev) => ({ ...prev, [walletId]: true }));
    try {
      await api.post(`/admin/wallets/${walletId}/sweep`);
      const items = await fetchWallets();
      if (items.length > 0) fetchBalances(items);
    } catch {
      /* handled by interceptor */
    } finally {
      setSweepLoading((prev) => ({ ...prev, [walletId]: false }));
    }
  };

  const handleMigrateAll = async () => {
    if (!confirm('모든 지갑의 온체인 잔액을 DB에 반영하고 Hot Wallet로 sweep 하시겠습니까?')) return;
    setMigrateLoading(true);
    setMigrateResult(null);
    try {
      const res = await api.post('/admin/wallets/migrate-balances');
      const data = res.data.data || res.data;
      const migrated = (data.results || []).filter((r: any) => r.status === 'migrated').length;
      const skipped = (data.results || []).filter((r: any) => r.status === 'already-migrated').length;
      setMigrateResult(`마이그레이션 완료: ${migrated}건 처리, ${skipped}건 스킵`);
      const items = await fetchWallets();
      if (items.length > 0) fetchBalances(items);
    } catch {
      setMigrateResult('마이그레이션 실패');
    } finally {
      setMigrateLoading(false);
    }
  };

  const columns: Column<Wallet>[] = [
    {
      key: 'user',
      label: '사용자',
      render: (row) => (
        <div>
          <span className="text-text font-medium">{row.user?.name || '-'}</span>
          <p className="text-xs text-text-secondary">{row.user?.email || ''}</p>
        </div>
      ),
    },
    {
      key: 'address',
      label: '주소',
      render: (row) => (
        <span className="font-mono text-xs text-text-secondary">
          {row.address.slice(0, 8)}...{row.address.slice(-6)}
        </span>
      ),
    },
    {
      key: 'balance',
      label: '잔액',
      render: (row) => {
        const isLoading = balanceLoading[row.id];
        const bal = balances[row.id];

        if (isLoading || (!bal && !balanceLoading.hasOwnProperty(row.id))) {
          return (
            <div className="space-y-1">
              <div className="h-4 w-24 rounded bg-white/5 animate-pulse" />
              <div className="h-3 w-20 rounded bg-white/5 animate-pulse" />
            </div>
          );
        }

        if (!bal || bal.balances.length === 0) {
          return <span className="text-xs text-text-secondary">-</span>;
        }

        return (
          <div className="space-y-0.5">
            {bal.balances.map((b) => {
              const pending = bal.pendingBySymbol[b.symbol] || 0;
              return (
                <div key={b.symbol} className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-text tabular-nums">
                    {fmtBalance(b.balance, b.decimals)}
                  </span>
                  <span className="text-[11px] font-medium text-text-secondary">{b.symbol}</span>
                  {pending > 0 && (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400" title="출금 대기 중">
                      -{fmtBalance(pending)} 대기
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      },
    },
    {
      key: 'isLocked',
      label: '상태',
      render: (row) => <StatusBadge status={row.isLocked ? 'LOCKED' : 'UNLOCKED'} />,
    },
    {
      key: 'createdAt',
      label: '생성일',
      sortable: true,
      render: (row) => (
        <span className="text-text-secondary">
          {new Date(row.createdAt).toLocaleDateString('ko-KR')}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">지갑 관리</h1>
        <div className="flex items-center gap-3">
          {migrateResult && (
            <span className="text-xs text-text-secondary">{migrateResult}</span>
          )}
          <button
            onClick={handleMigrateAll}
            disabled={migrateLoading}
            className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-400 transition-all duration-200 hover:bg-cyan-500/20 disabled:opacity-50"
          >
            {migrateLoading ? '처리 중...' : '전체 마이그레이션'}
          </button>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={wallets}
        searchPlaceholder="주소 또는 이메일로 검색..."
        onSearch={(q) => { setSearch(q); setPage(1); }}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="등록된 지갑이 없습니다"
        actions={(row) => (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleSweep(row.id)}
              disabled={sweepLoading[row.id]}
              className="rounded-lg border border-cyan-500/30 px-3 py-1 text-xs font-medium text-cyan-400 transition-all duration-200 hover:bg-cyan-500/10 disabled:opacity-50"
              title="온체인 잔액을 DB에 반영하고 Hot Wallet로 이동"
            >
              {sweepLoading[row.id] ? '처리중...' : 'Sweep'}
            </button>
            <button
              onClick={() => {
                setModalTarget(row);
                setModalAction(row.isLocked ? 'unlock' : 'lock');
              }}
              className={`rounded-lg border px-3 py-1 text-xs font-medium transition-all duration-200 ${
                row.isLocked
                  ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                  : 'border-red-500/30 text-red-400 hover:bg-red-500/10'
              }`}
            >
              {row.isLocked ? '잠금 해제' : '잠금'}
            </button>
          </div>
        )}
      />

      <Modal
        open={!!modalTarget}
        onClose={() => setModalTarget(null)}
        title={modalAction === 'lock' ? '지갑 잠금' : '지갑 잠금 해제'}
        actions={
          <>
            <button
              onClick={() => setModalTarget(null)}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-text-secondary transition-all duration-200 hover:bg-white/5"
            >
              취소
            </button>
            <button
              onClick={handleAction}
              disabled={actionLoading}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-all duration-200 disabled:opacity-60 ${
                modalAction === 'lock'
                  ? 'bg-red-600/80 hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/20'
                  : 'bg-emerald-600/80 hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20'
              }`}
            >
              {actionLoading ? '처리 중...' : modalAction === 'lock' ? '잠금' : '해제'}
            </button>
          </>
        }
      >
        {modalTarget && (
          <p>
            {modalAction === 'lock'
              ? `지갑 ${modalTarget.address.slice(0, 8)}...을 잠그시겠습니까? 잠금 시 출금이 제한됩니다.`
              : `지갑 ${modalTarget.address.slice(0, 8)}...의 잠금을 해제하시겠습니까?`}
          </p>
        )}
      </Modal>
    </div>
  );
}
