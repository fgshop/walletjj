'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '../../../lib/api';
import DataTable, { Column } from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import Modal from '../../../components/Modal';

interface HotWallet {
  id: string;
  address: string;
  nextIndex: number;
  description: string;
  createdAt: string;
  balances: { symbol: string; balance: string; decimals: number }[];
  userWalletCount: number;
}

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
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<string | null>(null);
  const [hotWallet, setHotWallet] = useState<HotWallet | null>(null);
  const [hotWalletLoading, setHotWalletLoading] = useState(true);

  // Transfer modal state
  const [transferSource, setTransferSource] = useState<Wallet | null>(null);
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferResult, setTransferResult] = useState<string | null>(null);

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

    // Fetch balances sequentially to avoid TronGrid rate limits
    for (const w of walletList) {
      try {
        const res = await api.get(`/admin/wallets/${w.id}/balance`);
        const data = res.data.data || res.data;
        setBalances((prev) => ({
          ...prev,
          [w.id]: {
            balances: data.balances || [],
            pendingBySymbol: data.pendingBySymbol || {},
          },
        }));
      } catch {
        // skip failed wallet
      }
      setBalanceLoading((prev) => ({ ...prev, [w.id]: false }));
    }
  }, []);

  useEffect(() => {
    fetchWallets().then((items) => {
      if (items.length > 0) fetchBalances(items);
    });
    api.get('/admin/wallets/hot-wallet')
      .then((res) => setHotWallet(res.data.data || res.data))
      .catch(() => {})
      .finally(() => setHotWalletLoading(false));
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

  const handleTransfer = async () => {
    if (!transferSource || !transferTo || !transferAmount) return;
    setTransferLoading(true);
    setTransferResult(null);
    try {
      await api.post('/admin/wallets/transfer', {
        fromWalletId: transferSource.id,
        toAddress: transferTo,
        amount: Number(transferAmount),
        tokenSymbol: 'JOJU',
      });
      setTransferResult('송금 완료');
      setTransferSource(null);
      setTransferTo('');
      setTransferAmount('');
      const items = await fetchWallets();
      if (items.length > 0) fetchBalances(items);
    } catch {
      setTransferResult('송금 실패');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleReconcile = async () => {
    if (!confirm('온체인 잔액을 오프체인(DB) 잔액에 맞게 동기화하시겠습니까?\n(초과분 → Hot Wallet, 부족분 ← Hot Wallet)')) return;
    setReconcileLoading(true);
    setReconcileResult(null);
    try {
      const res = await api.post('/admin/wallets/reconcile');
      const data = res.data.data || res.data;
      const results = data.results || [];
      const swept = results.filter((r: any) => r.action === 'swept-excess').length;
      const topped = results.filter((r: any) => r.action === 'topped-up').length;
      const synced = results.filter((r: any) => r.action === 'synced').length;
      const errors = results.filter((r: any) => r.action.includes('error')).length;
      setReconcileResult(`동기화 완료: ${synced}건 일치, ${swept}건 회수, ${topped}건 보충${errors > 0 ? `, ${errors}건 오류` : ''}`);
      const items = await fetchWallets();
      if (items.length > 0) fetchBalances(items);
    } catch {
      setReconcileResult('동기화 실패');
    } finally {
      setReconcileLoading(false);
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
          {(migrateResult || reconcileResult || transferResult) && (
            <span className="text-xs text-text-secondary">{transferResult || reconcileResult || migrateResult}</span>
          )}
          <button
            onClick={handleReconcile}
            disabled={reconcileLoading || migrateLoading}
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 transition-all duration-200 hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {reconcileLoading ? '동기화 중...' : '잔액 동기화'}
          </button>
          <button
            onClick={handleMigrateAll}
            disabled={migrateLoading || reconcileLoading}
            className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-400 transition-all duration-200 hover:bg-cyan-500/20 disabled:opacity-50"
          >
            {migrateLoading ? '처리 중...' : '전체 마이그레이션'}
          </button>
        </div>
      </div>

      {/* Hot Wallet Card */}
      {hotWalletLoading ? (
        <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="h-5 w-48 rounded bg-white/5 animate-pulse" />
        </div>
      ) : hotWallet ? (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-400">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                  </svg>
                  Hot Wallet (마스터 지갑)
                </span>
                <span className="text-xs text-text-secondary">
                  파생 지갑 {hotWallet.userWalletCount}개
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-mono text-sm text-text">{hotWallet.address}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(hotWallet.address)}
                  className="rounded p-1 text-text-secondary transition-colors hover:bg-white/10 hover:text-text"
                  title="주소 복사"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                </button>
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                생성일: {new Date(hotWallet.createdAt).toLocaleDateString('ko-KR')}
              </p>
            </div>
            <div className="flex gap-4">
              {hotWallet.balances.map((b) => (
                <div key={b.symbol} className="text-right">
                  <p className="text-lg font-bold text-text tabular-nums">{fmtBalance(b.balance, b.decimals)}</p>
                  <p className="text-xs font-medium text-amber-400">{b.symbol}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

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
              onClick={() => {
                setTransferSource(row);
                setTransferTo('');
                setTransferAmount('');
                setTransferResult(null);
              }}
              className="rounded-lg border border-violet-500/30 px-3 py-1 text-xs font-medium text-violet-400 transition-all duration-200 hover:bg-violet-500/10"
              title="이 지갑에서 다른 주소로 온체인 송금"
            >
              송금
            </button>
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

      {/* Transfer Modal */}
      <Modal
        open={!!transferSource}
        onClose={() => setTransferSource(null)}
        title="온체인 송금"
        actions={
          <>
            <button
              onClick={() => setTransferSource(null)}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-text-secondary transition-all duration-200 hover:bg-white/5"
            >
              취소
            </button>
            <button
              onClick={handleTransfer}
              disabled={transferLoading || !transferTo || !transferAmount}
              className="rounded-lg bg-violet-600/80 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-violet-600 hover:shadow-lg hover:shadow-violet-500/20 disabled:opacity-60"
            >
              {transferLoading ? '처리 중...' : '송금 실행'}
            </button>
          </>
        }
      >
        {transferSource && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">출발 지갑</label>
              <p className="font-mono text-sm text-text">
                {transferSource.user?.name && <span className="mr-2 font-sans text-text-secondary">({transferSource.user.name})</span>}
                {transferSource.address}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">받는 주소 (TRON)</label>
              <input
                type="text"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                placeholder="T..."
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-text placeholder-text-secondary/50 outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">수량 (JOJU)</label>
              <input
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text placeholder-text-secondary/50 outline-none focus:border-violet-500/50"
              />
            </div>
            {transferResult && (
              <p className={`text-sm font-medium ${transferResult.includes('완료') ? 'text-emerald-400' : 'text-red-400'}`}>
                {transferResult}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
