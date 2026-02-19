'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import DataTable, { Column } from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';

interface User {
  id: string;
  name: string;
  email: string;
  status: string;
  wallet?: { address: string };
  createdAt: string;
  [key: string]: unknown;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users', {
        params: { search: search || undefined, page, limit: 20 },
      });
      const data = res.data.data || res.data;
      setUsers(data.users || data.items || data);
      setTotalPages(data.totalPages || data.meta?.totalPages || 1);
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
      render: (row) =>
        row.wallet?.address ? (
          <span className="font-mono text-xs text-text-secondary">{row.wallet.address.slice(0, 8)}...{row.wallet.address.slice(-6)}</span>
        ) : (
          <span className="text-text-secondary/50">-</span>
        ),
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
