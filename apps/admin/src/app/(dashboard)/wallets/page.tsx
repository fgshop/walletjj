'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '../../../lib/api';
import DataTable, { Column } from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import Modal from '../../../components/Modal';

interface Wallet {
  id: string;
  address: string;
  isLocked: boolean;
  createdAt: string;
  user?: { email: string; name: string };
  [key: string]: unknown;
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

  const fetchWallets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/wallets', {
        params: { search: search || undefined, page, limit: 20 },
      });
      const data = res.data.data || res.data;
      setWallets(data.wallets || data.items || data);
      setTotalPages(data.totalPages || data.meta?.totalPages || 1);
    } catch {
      /* handled by interceptor */
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const handleAction = async () => {
    if (!modalTarget) return;
    setActionLoading(true);
    try {
      await api.post(`/admin/wallets/${modalTarget.id}/${modalAction}`);
      setModalTarget(null);
      fetchWallets();
    } catch {
      /* handled by interceptor */
    } finally {
      setActionLoading(false);
    }
  };

  const columns: Column<Wallet>[] = [
    {
      key: 'address',
      label: '주소',
      render: (row) => <span className="font-mono text-xs">{row.address.slice(0, 8)}...{row.address.slice(-6)}</span>,
    },
    {
      key: 'user',
      label: '사용자',
      render: (row) => row.user?.email || '-',
    },
    {
      key: 'isLocked',
      label: '잠금 상태',
      render: (row) => <StatusBadge status={row.isLocked ? 'LOCKED' : 'UNLOCKED'} />,
    },
    {
      key: 'createdAt',
      label: '생성일',
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleDateString('ko-KR'),
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text">지갑 관리</h1>
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
          <button
            onClick={() => {
              setModalTarget(row);
              setModalAction(row.isLocked ? 'unlock' : 'lock');
            }}
            className={`rounded-lg border px-3 py-1 text-xs font-medium transition ${
              row.isLocked
                ? 'border-success/30 text-success hover:bg-success/10'
                : 'border-danger/30 text-danger hover:bg-danger/10'
            }`}
          >
            {row.isLocked ? '잠금 해제' : '잠금'}
          </button>
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
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface-dim"
            >
              취소
            </button>
            <button
              onClick={handleAction}
              disabled={actionLoading}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60 ${
                modalAction === 'lock' ? 'bg-danger hover:bg-danger/80' : 'bg-success hover:bg-success/80'
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
