'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '../../../lib/api';
import DataTable, { Column } from '../../../components/DataTable';

interface AuditLog {
  id: string;
  adminName: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
  [key: string]: unknown;
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
    { key: 'adminName', label: '관리자', sortable: true },
    { key: 'action', label: '행위', sortable: true },
    { key: 'resource', label: '대상' },
    {
      key: 'resourceId',
      label: '대상 ID',
      render: (row) =>
        row.resourceId ? (
          <span className="font-mono text-xs">{row.resourceId.slice(0, 8)}...</span>
        ) : (
          '-'
        ),
    },
    {
      key: 'details',
      label: '상세',
      render: (row) => (
        <span className="max-w-[200px] truncate block text-xs text-text-secondary">
          {row.details || '-'}
        </span>
      ),
    },
    {
      key: 'ipAddress',
      label: 'IP',
      render: (row) => <span className="font-mono text-xs">{row.ipAddress || '-'}</span>,
    },
    {
      key: 'createdAt',
      label: '날짜',
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleString('ko-KR'),
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
