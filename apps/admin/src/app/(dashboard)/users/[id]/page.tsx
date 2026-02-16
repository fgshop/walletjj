'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import StatusBadge from '../../../../components/StatusBadge';

interface UserDetail {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
  wallet?: {
    id: string;
    address: string;
    isLocked: boolean;
    createdAt: string;
  };
  transactions?: Array<{
    id: string;
    type: string;
    amount: string;
    status: string;
    createdAt: string;
  }>;
  withdrawals?: Array<{
    id: string;
    amount: string;
    toAddress: string;
    status: string;
    createdAt: string;
  }>;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/admin/users/${params.id}`)
      .then((res) => setUser(res.data.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-text-secondary">사용자를 찾을 수 없습니다</p>
        <button onClick={() => router.back()} className="text-sm text-primary hover:underline">
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => router.back()} className="mb-4 text-sm text-primary hover:underline">
        &larr; 사용자 목록
      </button>

      <h1 className="mb-6 text-2xl font-bold text-text">사용자 상세</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Info */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-text">기본 정보</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-text-secondary">이름</dt>
              <dd className="text-sm font-medium text-text">{user.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-text-secondary">이메일</dt>
              <dd className="text-sm font-medium text-text">{user.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-text-secondary">상태</dt>
              <dd><StatusBadge status={user.status} /></dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-text-secondary">가입일</dt>
              <dd className="text-sm font-medium text-text">
                {new Date(user.createdAt).toLocaleString('ko-KR')}
              </dd>
            </div>
          </dl>
        </div>

        {/* Wallet Info */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-text">지갑 정보</h2>
          {user.wallet ? (
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-text-secondary">주소</dt>
                <dd className="text-sm font-mono text-text break-all">{user.wallet.address}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-text-secondary">잠금 상태</dt>
                <dd>
                  <StatusBadge status={user.wallet.isLocked ? 'LOCKED' : 'UNLOCKED'} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-text-secondary">생성일</dt>
                <dd className="text-sm font-medium text-text">
                  {new Date(user.wallet.createdAt).toLocaleString('ko-KR')}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-text-secondary">지갑 없음</p>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      {user.transactions && user.transactions.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-text">최근 거래</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 font-semibold text-text-secondary">유형</th>
                  <th className="px-3 py-2 font-semibold text-text-secondary">금액</th>
                  <th className="px-3 py-2 font-semibold text-text-secondary">상태</th>
                  <th className="px-3 py-2 font-semibold text-text-secondary">날짜</th>
                </tr>
              </thead>
              <tbody>
                {user.transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-text">{tx.type}</td>
                    <td className="px-3 py-2 font-mono text-text">{tx.amount}</td>
                    <td className="px-3 py-2"><StatusBadge status={tx.status} /></td>
                    <td className="px-3 py-2 text-text-secondary">
                      {new Date(tx.createdAt).toLocaleString('ko-KR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Withdrawal History */}
      {user.withdrawals && user.withdrawals.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-text">출금 내역</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 font-semibold text-text-secondary">금액</th>
                  <th className="px-3 py-2 font-semibold text-text-secondary">수신 주소</th>
                  <th className="px-3 py-2 font-semibold text-text-secondary">상태</th>
                  <th className="px-3 py-2 font-semibold text-text-secondary">날짜</th>
                </tr>
              </thead>
              <tbody>
                {user.withdrawals.map((w) => (
                  <tr key={w.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-mono text-text">{w.amount}</td>
                    <td className="px-3 py-2 font-mono text-xs text-text">
                      {w.toAddress.slice(0, 8)}...{w.toAddress.slice(-6)}
                    </td>
                    <td className="px-3 py-2"><StatusBadge status={w.status} /></td>
                    <td className="px-3 py-2 text-text-secondary">
                      {new Date(w.createdAt).toLocaleString('ko-KR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
