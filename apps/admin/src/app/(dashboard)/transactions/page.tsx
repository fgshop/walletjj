'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '../../../lib/api';
import DataTable, { Column } from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';

interface Transaction {
  id: string;
  txHash: string | null;
  type: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  tokenSymbol: string;
  fee: string | null;
  status: string;
  memo: string | null;
  createdAt: string;
  confirmedAt: string | null;
  fromUser: { id: string; email: string; name: string } | null;
  toUser: { id: string; email: string; name: string } | null;
  [key: string]: unknown;
}

const TYPE_FILTERS = ['ALL', 'INTERNAL', 'EXTERNAL_SEND', 'EXTERNAL_RECEIVE', 'DEPOSIT', 'SWEEP'] as const;
const TYPE_LABELS: Record<string, string> = {
  ALL: '전체',
  INTERNAL: '내부 전송',
  EXTERNAL_SEND: '외부 출금',
  EXTERNAL_RECEIVE: '외부 입금',
  DEPOSIT: '입금',
  SWEEP: 'Sweep',
};

const STATUS_FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'FAILED'] as const;
const STATUS_LABELS: Record<string, string> = {
  ALL: '전체',
  PENDING: '대기',
  CONFIRMED: '완료',
  FAILED: '실패',
};

function truncateAddr(addr: string) {
  if (!addr) return '-';
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Transaction | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | undefined> = { page, limit: 20 };
      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search) params.search = search;

      const res = await api.get('/admin/transactions', { params });
      const data = res.data.data || res.data;
      setTransactions(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch {
      /* handled by interceptor */
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, statusFilter, search]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleSearch = (q: string) => {
    setSearch(q);
    setPage(1);
  };

  const columns: Column<Transaction>[] = [
    {
      key: 'type',
      label: '유형',
      render: (row) => (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${typeStyle(row.type)}`}>
          {typeIcon(row.type)}
          {TYPE_LABELS[row.type] || row.type}
        </span>
      ),
    },
    {
      key: 'fromUser',
      label: '보낸 사람',
      render: (row) => (
        <div>
          {row.fromUser ? (
            <>
              <p className="text-sm text-text">{row.fromUser.name}</p>
              <p className="text-xs text-text-secondary">{row.fromUser.email}</p>
            </>
          ) : (
            <span className="font-mono text-xs text-text-secondary">{truncateAddr(row.fromAddress)}</span>
          )}
        </div>
      ),
    },
    {
      key: 'toUser',
      label: '받는 사람',
      render: (row) => (
        <div>
          {row.toUser ? (
            <>
              <p className="text-sm text-text">{row.toUser.name}</p>
              <p className="text-xs text-text-secondary">{row.toUser.email}</p>
            </>
          ) : (
            <span className="font-mono text-xs text-text-secondary">{truncateAddr(row.toAddress)}</span>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      label: '금액',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-sm font-medium text-text">
          {Number(row.amount).toLocaleString()} <span className="text-text-secondary">{row.tokenSymbol}</span>
        </span>
      ),
    },
    {
      key: 'status',
      label: '상태',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      label: '일시',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-text-secondary">{new Date(row.createdAt).toLocaleString('ko-KR')}</span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">거래 내역</h1>
          <p className="mt-1 text-sm text-text-secondary">
            전체 {total.toLocaleString()}건의 거래
          </p>
        </div>
      </div>

      {/* Type filter */}
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="mr-1 flex items-center text-xs font-medium text-text-secondary">유형:</span>
        {TYPE_FILTERS.map((t) => (
          <button
            key={t}
            onClick={() => { setTypeFilter(t); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              typeFilter === t
                ? 'bg-gradient-to-r from-primary to-info text-white shadow-md shadow-primary/20'
                : 'border border-white/10 text-text-secondary hover:bg-white/5 hover:text-text'
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="mr-1 flex items-center text-xs font-medium text-text-secondary">상태:</span>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              statusFilter === s
                ? 'bg-gradient-to-r from-primary to-info text-white shadow-md shadow-primary/20'
                : 'border border-white/10 text-text-secondary hover:bg-white/5 hover:text-text'
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={transactions}
        searchPlaceholder="이메일, 이름, 주소, TxHash 검색..."
        onSearch={handleSearch}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="거래 내역이 없습니다"
        actions={(row) => (
          <button
            onClick={() => setDetail(row)}
            className="rounded-lg border border-white/10 px-3 py-1 text-xs font-medium text-text-secondary transition-all duration-200 hover:bg-white/5 hover:text-text"
          >
            상세
          </button>
        )}
      />

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetail(null)} />
          <div className="relative z-10 w-full max-w-lg glass-card rounded-2xl border border-white/10 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-text">거래 상세</h3>
              <button onClick={() => setDetail(null)} className="text-text-secondary hover:text-text transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <DetailRow label="유형">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${typeStyle(detail.type)}`}>
                  {typeIcon(detail.type)}
                  {TYPE_LABELS[detail.type] || detail.type}
                </span>
              </DetailRow>
              <DetailRow label="상태"><StatusBadge status={detail.status} /></DetailRow>
              <DetailRow label="금액">
                <span className="font-mono font-medium text-text">{Number(detail.amount).toLocaleString()} {detail.tokenSymbol}</span>
              </DetailRow>
              {detail.fee && <DetailRow label="수수료"><span className="font-mono text-text-secondary">{detail.fee} TRX</span></DetailRow>}
              <hr className="border-white/5" />
              <DetailRow label="보낸 사람">
                {detail.fromUser ? (
                  <div>
                    <span className="text-text">{detail.fromUser.name}</span>
                    <span className="ml-2 text-xs text-text-secondary">({detail.fromUser.email})</span>
                  </div>
                ) : (
                  <span className="text-text-secondary">외부</span>
                )}
              </DetailRow>
              <DetailRow label="보낸 주소"><span className="font-mono text-xs text-text-secondary break-all">{detail.fromAddress}</span></DetailRow>
              <DetailRow label="받는 사람">
                {detail.toUser ? (
                  <div>
                    <span className="text-text">{detail.toUser.name}</span>
                    <span className="ml-2 text-xs text-text-secondary">({detail.toUser.email})</span>
                  </div>
                ) : (
                  <span className="text-text-secondary">외부</span>
                )}
              </DetailRow>
              <DetailRow label="받는 주소"><span className="font-mono text-xs text-text-secondary break-all">{detail.toAddress}</span></DetailRow>
              <hr className="border-white/5" />
              {detail.txHash && (
                <DetailRow label="TxHash"><span className="font-mono text-xs text-text-secondary break-all">{detail.txHash}</span></DetailRow>
              )}
              {detail.memo && <DetailRow label="메모"><span className="text-text-secondary">{detail.memo}</span></DetailRow>}
              <DetailRow label="생성일"><span className="text-text-secondary">{new Date(detail.createdAt).toLocaleString('ko-KR')}</span></DetailRow>
              {detail.confirmedAt && (
                <DetailRow label="확인일"><span className="text-text-secondary">{new Date(detail.confirmedAt).toLocaleString('ko-KR')}</span></DetailRow>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setDetail(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-text-secondary transition-all duration-200 hover:bg-white/5 hover:text-text"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-20 shrink-0 text-xs font-medium text-text-secondary">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function typeStyle(type: string) {
  switch (type) {
    case 'INTERNAL': return 'bg-blue-500/15 text-blue-400';
    case 'EXTERNAL_SEND': return 'bg-orange-500/15 text-orange-400';
    case 'EXTERNAL_RECEIVE': return 'bg-emerald-500/15 text-emerald-400';
    case 'DEPOSIT': return 'bg-purple-500/15 text-purple-400';
    case 'SWEEP': return 'bg-cyan-500/15 text-cyan-400';
    default: return 'bg-slate-500/15 text-slate-400';
  }
}

function typeIcon(type: string) {
  switch (type) {
    case 'INTERNAL':
      return (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      );
    case 'EXTERNAL_SEND':
      return (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
        </svg>
      );
    case 'EXTERNAL_RECEIVE':
    case 'DEPOSIT':
      return (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 4.5l-15 15m0 0h11.25m-11.25 0V8.25" />
        </svg>
      );
    case 'SWEEP':
      return (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
        </svg>
      );
    default:
      return null;
  }
}
