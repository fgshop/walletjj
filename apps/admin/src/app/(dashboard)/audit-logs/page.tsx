'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '../../../lib/api';
import DataTable, { Column } from '../../../components/DataTable';

interface AuditLog {
  id: string;
  admin?: { name: string; email: string; role: string };
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown> | null;
  ipAddress?: string;
  createdAt: string;
  [key: string]: unknown;
}

const ACTION_LABELS: Record<string, string> = {
  USER_SUSPEND: '사용자 정지',
  USER_ACTIVATE: '사용자 활성화',
  WITHDRAWAL_APPROVE: '출금 승인',
  WITHDRAWAL_REJECT: '출금 거절',
  WALLET_LOCK: '지갑 잠금',
  WALLET_UNLOCK: '지갑 잠금 해제',
  WALLET_SWEEP: '지갑 스윕 (자금 회수)',
  WALLET_MIGRATE_ALL: '전체 자금 마이그레이션',
  WALLET_RECONCILE: '잔액 동기화 (정산)',
  ADMIN_TRANSFER: '관리자 송금',
  CREATE_TOKEN: '토큰 등록',
  UPDATE_TOKEN: '토큰 정보 수정',
  DELETE_TOKEN: '토큰 삭제',
};

const RESOURCE_LABELS: Record<string, string> = {
  User: '사용자',
  Wallet: '지갑',
  Withdrawal: '출금 요청',
  SupportedToken: '지원 토큰',
  Transaction: '거래',
};

function formatDetails(action: string, details: Record<string, unknown> | null | undefined): string {
  if (!details) return '-';
  const parts: string[] = [];

  // Common fields
  if (details.reason) parts.push(`사유: ${details.reason}`);
  if (details.email) parts.push(`이메일: ${details.email}`);
  if (details.userName) parts.push(`사용자: ${details.userName}`);

  // Withdrawal specific
  if (details.amount) parts.push(`금액: ${details.amount} ${details.token || details.tokenSymbol || ''}`);
  if (details.toAddress) parts.push(`수신 주소: ${String(details.toAddress).slice(0, 10)}...`);
  if (details.txHash) parts.push(`TX: ${String(details.txHash).slice(0, 12)}...`);

  // Wallet specific
  if (details.address) parts.push(`주소: ${String(details.address).slice(0, 10)}...`);
  if (details.matched !== undefined) parts.push(`일치: ${details.matched}건`);
  if (details.swept !== undefined) parts.push(`회수: ${details.swept}건`);
  if (details.topUp !== undefined) parts.push(`보충: ${details.topUp}건`);
  if (details.errors !== undefined) parts.push(`오류: ${details.errors}건`);
  if (details.skipped !== undefined) parts.push(`건너뜀: ${details.skipped}건`);
  if (details.walletsProcessed !== undefined) parts.push(`처리 지갑: ${details.walletsProcessed}건`);

  // Token specific
  if (details.symbol) parts.push(`심볼: ${details.symbol}`);
  if (details.name && !details.userName) parts.push(`이름: ${details.name}`);
  if (details.contractAddress) parts.push(`컨트랙트: ${String(details.contractAddress).slice(0, 10)}...`);

  // Transfer specific
  if (details.fromAddress) parts.push(`보낸 주소: ${String(details.fromAddress).slice(0, 10)}...`);

  if (parts.length > 0) return parts.join(' | ');

  // Fallback: show raw JSON briefly
  const raw = JSON.stringify(details);
  return raw.length > 80 ? raw.slice(0, 80) + '...' : raw;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/audit-logs', {
        params: { search: search || undefined, page, limit: 20 },
      });
      const data = res.data.data || res.data;
      setLogs(data.logs || data.items || data);
      setTotalPages(data.totalPages || data.meta?.totalPages || 1);
    } catch {
      /* handled by interceptor */
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns: Column<AuditLog>[] = [
    {
      key: 'admin',
      label: '관리자',
      sortable: true,
      render: (row) => (
        <div>
          <span className="text-text font-medium">{row.admin?.name || '-'}</span>
          <p className="text-[11px] text-text-secondary">{row.admin?.email || ''}</p>
        </div>
      ),
    },
    {
      key: 'action',
      label: '행위',
      sortable: true,
      render: (row) => {
        const label = ACTION_LABELS[row.action] || row.action;
        return <span className="text-text font-medium">{label}</span>;
      },
    },
    {
      key: 'resource',
      label: '대상',
      render: (row) => <span>{RESOURCE_LABELS[row.resource] || row.resource}</span>,
    },
    {
      key: 'resourceId',
      label: '대상 ID',
      render: (row) =>
        row.resourceId ? (
          <span className="font-mono text-xs text-text-secondary">{row.resourceId.slice(0, 8)}...</span>
        ) : (
          <span className="text-text-secondary/50">-</span>
        ),
    },
    {
      key: 'details',
      label: '상세 설명',
      render: (row) => {
        const desc = formatDetails(row.action, row.details);
        const raw = row.details ? JSON.stringify(row.details, null, 2) : '';
        return (
          <span className="max-w-[300px] truncate block text-xs text-text-secondary" title={raw}>
            {desc}
          </span>
        );
      },
    },
    {
      key: 'ipAddress',
      label: 'IP',
      render: (row) => <span className="font-mono text-xs text-text-secondary">{row.ipAddress || '-'}</span>,
    },
    {
      key: 'createdAt',
      label: '날짜',
      sortable: true,
      render: (row) => <span className="text-text-secondary">{new Date(row.createdAt).toLocaleString('ko-KR')}</span>,
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text">감사 로그</h1>
      <DataTable
        columns={columns}
        data={logs}
        searchPlaceholder="관리자, 행위, 대상으로 검색..."
        onSearch={(q) => { setSearch(q); setPage(1); }}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="감사 로그가 없습니다"
      />
    </div>
  );
}
