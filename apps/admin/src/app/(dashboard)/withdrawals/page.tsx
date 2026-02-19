'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '../../../lib/api';
import DataTable, { Column } from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import Modal from '../../../components/Modal';

interface Withdrawal {
  id: string;
  amount: string;
  toAddress: string;
  status: string;
  createdAt: string;
  user?: { email: string; name: string };
  [key: string]: unknown;
}

const STATUS_FILTERS = ['ALL', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED', 'FAILED'] as const;
const STATUS_LABELS: Record<string, string> = {
  ALL: '전체',
  PENDING_APPROVAL: '승인 대기',
  APPROVED: '승인',
  REJECTED: '거부',
  COMPLETED: '완료',
  FAILED: '실패',
};

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [reviewTarget, setReviewTarget] = useState<Withdrawal | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewReason, setReviewReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/withdrawals', {
        params: {
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          page,
          limit: 20,
        },
      });
      const data = res.data.data || res.data;
      setWithdrawals(data.withdrawals || data.items || data);
      setTotalPages(data.totalPages || data.meta?.totalPages || 1);
    } catch {
      /* handled by interceptor */
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const handleReview = async () => {
    if (!reviewTarget) return;
    setActionLoading(true);
    try {
      await api.post(`/admin/withdrawals/${reviewTarget.id}/review`, {
        action: reviewAction,
        reason: reviewReason || undefined,
      });
      setReviewTarget(null);
      setReviewReason('');
      fetchWithdrawals();
    } catch {
      /* handled by interceptor */
    } finally {
      setActionLoading(false);
    }
  };

  const openReview = (row: Withdrawal, action: 'APPROVED' | 'REJECTED') => {
    setReviewTarget(row);
    setReviewAction(action);
    setReviewReason('');
  };

  const columns: Column<Withdrawal>[] = [
    {
      key: 'user',
      label: '사용자',
      render: (row) => <span className="text-text">{row.user?.email || '-'}</span>,
    },
    {
      key: 'amount',
      label: '금액',
      sortable: true,
      render: (row) => <span className="font-mono text-text">{row.amount}</span>,
    },
    {
      key: 'toAddress',
      label: '수신 주소',
      render: (row) => <span className="font-mono text-xs text-text-secondary">{row.toAddress.slice(0, 8)}...{row.toAddress.slice(-6)}</span>,
    },
    {
      key: 'status',
      label: '상태',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      label: '요청일',
      sortable: true,
      render: (row) => <span className="text-text-secondary">{new Date(row.createdAt).toLocaleString('ko-KR')}</span>,
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text">출금 승인</h1>

      {/* Status filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
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
        data={withdrawals}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="출금 요청이 없습니다"
        actions={(row) =>
          row.status === 'PENDING_APPROVAL' ? (
            <div className="flex gap-1">
              <button
                onClick={() => openReview(row, 'APPROVED')}
                className="rounded-lg border border-emerald-500/30 px-3 py-1 text-xs font-medium text-emerald-400 transition-all duration-200 hover:bg-emerald-500/10"
              >
                승인
              </button>
              <button
                onClick={() => openReview(row, 'REJECTED')}
                className="rounded-lg border border-red-500/30 px-3 py-1 text-xs font-medium text-red-400 transition-all duration-200 hover:bg-red-500/10"
              >
                거부
              </button>
            </div>
          ) : null
        }
      />

      <Modal
        open={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        title={reviewAction === 'APPROVED' ? '출금 승인' : '출금 거부'}
        actions={
          <>
            <button
              onClick={() => setReviewTarget(null)}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-text-secondary transition-all duration-200 hover:bg-white/5"
            >
              취소
            </button>
            <button
              onClick={handleReview}
              disabled={actionLoading}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-all duration-200 disabled:opacity-60 ${
                reviewAction === 'APPROVED'
                  ? 'bg-emerald-600/80 hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20'
                  : 'bg-red-600/80 hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/20'
              }`}
            >
              {actionLoading ? '처리 중...' : reviewAction === 'APPROVED' ? '승인' : '거부'}
            </button>
          </>
        }
      >
        {reviewTarget && (
          <div className="space-y-3">
            <p>
              <span className="font-medium text-text">{reviewTarget.user?.email}</span>의 출금 요청을{' '}
              {reviewAction === 'APPROVED' ? '승인' : '거부'}하시겠습니까?
            </p>
            <p className="font-mono text-text">금액: {reviewTarget.amount}</p>
            <p className="font-mono text-xs text-text-secondary">주소: {reviewTarget.toAddress}</p>
            {reviewAction === 'REJECTED' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-text">거부 사유</label>
                <input
                  type="text"
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  placeholder="거부 사유를 입력하세요"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
