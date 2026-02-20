'use client';

import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import StatsCard from '../../../components/StatsCard';

interface InternalTransferStats {
  total: number;
  today: number;
  totalAmount: string;
}

interface DashboardStats {
  totalUsers: number;
  activeWallets: number;
  pendingWithdrawals: number;
  todayTransactions: number;
  internalTransfers?: InternalTransferStats;
}

interface BalanceSummary {
  onchainTotal: string;
  offchainTotal: string;
  hotWalletBalance: string;
  hotWalletAddress: string | null;
  walletCount: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [balances, setBalances] = useState<BalanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [balancesLoading, setBalancesLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/dashboard/stats')
      .then((res) => setStats(res.data.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false));

    api
      .get('/admin/dashboard/balances')
      .then((res) => setBalances(res.data.data || res.data))
      .catch(() => {})
      .finally(() => setBalancesLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text">대시보드</h1>

      {/* Balance Summary */}
      <h2 className="mb-3 text-lg font-semibold text-text">잔액 현황</h2>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatsCard
          icon={<OnchainIcon />}
          label="온체인 잔액 합계 (유저 지갑)"
          value={
            balancesLoading
              ? '로딩...'
              : `${Number(balances?.onchainTotal ?? 0).toLocaleString()} JOJU`
          }
          change={balances ? `${balances.walletCount}개 지갑` : undefined}
        />
        <StatsCard
          icon={<OffchainIcon />}
          label="오프체인 잔액 합계 (DB)"
          value={
            balancesLoading
              ? '로딩...'
              : `${Number(balances?.offchainTotal ?? 0).toLocaleString()} JOJU`
          }
          change={balances ? `${balances.walletCount}명 유저` : undefined}
        />
        <StatsCard
          icon={<HotWalletIcon />}
          label="Hot Wallet 잔액"
          value={
            balancesLoading
              ? '로딩...'
              : `${Number(balances?.hotWalletBalance ?? 0).toLocaleString()} JOJU`
          }
          change={balances?.hotWalletAddress
            ? `${balances.hotWalletAddress.slice(0, 6)}...${balances.hotWalletAddress.slice(-4)}`
            : '미설정'}
        />
      </div>

      {/* General Stats */}
      <h2 className="mb-3 text-lg font-semibold text-text">운영 현황</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatsCard
          icon={<UsersIcon />}
          label="전체 사용자"
          value={stats?.totalUsers?.toLocaleString() ?? '0'}
        />
        <StatsCard
          icon={<WalletIcon />}
          label="활성 지갑"
          value={stats?.activeWallets?.toLocaleString() ?? '0'}
        />
        <StatsCard
          icon={<WithdrawalIcon />}
          label="대기 중 출금"
          value={stats?.pendingWithdrawals?.toLocaleString() ?? '0'}
          changeType={stats?.pendingWithdrawals ? 'up' : 'neutral'}
        />
        <StatsCard
          icon={<TxIcon />}
          label="오늘 거래"
          value={stats?.todayTransactions?.toLocaleString() ?? '0'}
        />
        <StatsCard
          icon={<InternalTxIcon />}
          label="오늘 내부 송금"
          value={stats?.internalTransfers?.today?.toLocaleString() ?? '0'}
        />
        <StatsCard
          icon={<InternalTxIcon />}
          label="내부 송금 총액"
          value={`${Number(stats?.internalTransfers?.totalAmount ?? 0).toLocaleString()} JOJU`}
          change={stats?.internalTransfers?.total ? `총 ${stats.internalTransfers.total.toLocaleString()}건` : undefined}
        />
      </div>
    </div>
  );
}

function UsersIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110-6h5.25A2.25 2.25 0 0121 6m0 6v-6m0 6a2.25 2.25 0 01-2.25 2.25H15a3 3 0 100 6h3.75A2.25 2.25 0 0021 18m0-6v6" />
    </svg>
  );
}

function WithdrawalIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  );
}

function TxIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function InternalTxIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 004.5 9.75v7.5a2.25 2.25 0 002.25 2.25h7.5a2.25 2.25 0 002.25-2.25v-7.5a2.25 2.25 0 00-2.25-2.25h-.75m0-3l-3-3m0 0l-3 3m3-3v11.25m6-2.25h.75a2.25 2.25 0 012.25 2.25v7.5a2.25 2.25 0 01-2.25 2.25h-7.5a2.25 2.25 0 01-2.25-2.25v-.75" />
    </svg>
  );
}

function OnchainIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.556a4.5 4.5 0 00-6.364-6.364L4.5 8.318m12.246 3.682a3 3 0 00-4.681-3.268" />
    </svg>
  );
}

function OffchainIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  );
}

function HotWalletIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
    </svg>
  );
}
