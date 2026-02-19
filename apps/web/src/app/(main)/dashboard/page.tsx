'use client';

import { useEffect, useState, useCallback } from 'react';
import BalanceCard from '@/components/BalanceCard';
import TransactionList from '@/components/TransactionList';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';
import { WithdrawalStatus, NotificationType } from '@joju/types';

interface WithdrawalItem {
  id: string;
  toAddress: string;
  amount: string;
  tokenSymbol: string;
  status: WithdrawalStatus;
  createdAt: string;
}

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const withdrawalStatusConfig: Record<WithdrawalStatus, { label: string; className: string; icon: string }> = {
  [WithdrawalStatus.PENDING_24H]: { label: '24시간 대기', className: 'text-orange-400', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  [WithdrawalStatus.PENDING_APPROVAL]: { label: '승인 대기', className: 'text-amber-400', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  [WithdrawalStatus.APPROVED]: { label: '승인됨', className: 'text-blue-400', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  [WithdrawalStatus.REJECTED]: { label: '거절됨', className: 'text-red-400', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
  [WithdrawalStatus.PROCESSING]: { label: '처리중', className: 'text-blue-400', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
  [WithdrawalStatus.COMPLETED]: { label: '완료', className: 'text-green-400', icon: 'M5 13l4 4L19 7' },
  [WithdrawalStatus.FAILED]: { label: '실패', className: 'text-red-400', icon: 'M6 18L18 6M6 6l12 12' },
  [WithdrawalStatus.REFUNDED]: { label: '환불됨', className: 'text-gray-400', icon: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6' },
};

const notifTypeIcons: Record<string, { bg: string; color: string; path: string }> = {
  DEPOSIT: { bg: 'bg-green-500/10', color: 'text-green-400', path: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' },
  SEND_COMPLETE: { bg: 'bg-blue-500/10', color: 'text-blue-400', path: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8' },
  RECEIVE: { bg: 'bg-emerald-500/10', color: 'text-emerald-400', path: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' },
  WITHDRAWAL_PENDING: { bg: 'bg-orange-500/10', color: 'text-orange-400', path: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  WITHDRAWAL_APPROVED: { bg: 'bg-green-500/10', color: 'text-green-400', path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  WITHDRAWAL_REJECTED: { bg: 'bg-red-500/10', color: 'text-red-400', path: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
  WITHDRAWAL_COMPLETE: { bg: 'bg-green-500/10', color: 'text-green-400', path: 'M5 13l4 4L19 7' },
  WALLET_LOCKED: { bg: 'bg-red-500/10', color: 'text-red-400', path: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
  WALLET_UNLOCKED: { bg: 'bg-green-500/10', color: 'text-green-400', path: 'M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z' },
  SYSTEM: { bg: 'bg-purple-500/10', color: 'text-purple-400', path: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
  PRICE_ALERT: { bg: 'bg-cyan-500/10', color: 'text-cyan-400', path: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return '좋은 밤이에요';
  if (h < 12) return '좋은 아침이에요';
  if (h < 18) return '좋은 오후에요';
  return '좋은 저녁이에요';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export default function DashboardPage() {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [wdLoading, setWdLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notiLoading, setNotiLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [copied, setCopied] = useState(false);

  const fetchAll = useCallback(async () => {
    // Fire all requests in parallel
    const userP = getUser().catch(() => null);
    const txP = api.get('/transactions?page=1&limit=5').catch(() => null);
    const wdP = api.get('/withdrawals?page=1&limit=5').catch(() => null);
    const notiP = api.get('/notifications?page=1&limit=4').catch(() => null);
    const unreadP = api.get('/notifications/unread-count').catch(() => null);

    const [user, txRes, wdRes, notiRes, unreadRes] = await Promise.all([userP, txP, wdP, notiP, unreadP]);

    if (user) {
      setUserName(user.name);
      setUserEmail(user.email);
      setCurrentUserId(user.id);
    }
    if (txRes) {
      setTransactions(txRes.data.data?.items ?? txRes.data.data ?? []);
    }
    setTxLoading(false);

    if (wdRes) {
      const items = wdRes.data.data?.items ?? wdRes.data.data ?? [];
      // Show only active (non-completed) withdrawals
      const active = items.filter((w: WithdrawalItem) =>
        ![WithdrawalStatus.COMPLETED, WithdrawalStatus.REFUNDED].includes(w.status)
      );
      setWithdrawals(active.slice(0, 3));
    }
    setWdLoading(false);

    if (notiRes) {
      setNotifications((notiRes.data.data?.items ?? notiRes.data.data ?? []).slice(0, 4));
    }
    setNotiLoading(false);

    if (unreadRes) {
      setUnreadCount(unreadRes.data.data?.count ?? 0);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pendingWdCount = withdrawals.filter(w =>
    [WithdrawalStatus.PENDING_24H, WithdrawalStatus.PENDING_APPROVAL, WithdrawalStatus.PROCESSING, WithdrawalStatus.APPROVED].includes(w.status)
  ).length;

  return (
    <div className="space-y-6 pb-24 sm:pb-0">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-white">
          {userName ? (
            <>
              {userName}님, {getGreeting()}
              <span className="ml-1.5 inline-block animate-[float_3s_ease-in-out_infinite] text-lg">
                {new Date().getHours() < 12 ? '\u2600\uFE0F' : new Date().getHours() < 18 ? '\uD83C\uDF24\uFE0F' : '\uD83C\uDF19'}
              </span>
            </>
          ) : (
            <span className="inline-block h-7 w-48 rounded shimmer align-middle" />
          )}
        </h1>
        {userEmail && (
          <p className="mt-0.5 text-sm text-gray-500">{userEmail}</p>
        )}
      </div>

      {/* Balance Card */}
      <BalanceCard />

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {[
          { href: '/receive', label: '입금', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4', gradient: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/20', iconColor: 'text-green-400' },
          { href: '/send', label: '송금', icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8', gradient: 'from-purple-500/20 to-blue-500/20', border: 'border-purple-500/20', iconColor: 'text-purple-400' },
          { href: '/withdraw', label: '출금', icon: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1', gradient: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/20', iconColor: 'text-blue-400' },
          { href: '/transactions', label: '거래내역', icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', gradient: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/20', iconColor: 'text-amber-400' },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`group flex flex-col items-center gap-2 rounded-2xl border ${item.border} bg-gradient-to-br ${item.gradient} p-3.5 sm:p-4 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg active:scale-[0.97]`}
          >
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-white/5 transition-all duration-300 group-hover:bg-white/10">
              <svg className={`h-5 w-5 ${item.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-300 group-hover:text-white">{item.label}</span>
          </a>
        ))}
      </div>

      {/* Active Withdrawals */}
      {!wdLoading && withdrawals.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">진행 중인 출금</h2>
              {pendingWdCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500/20 px-1.5 text-[10px] font-bold text-orange-400">
                  {pendingWdCount}
                </span>
              )}
            </div>
            <a href="/withdraw" className="text-xs font-medium text-purple-400 transition-colors hover:text-purple-300">
              전체보기
            </a>
          </div>
          <div className="space-y-2">
            {withdrawals.map((wd) => {
              const config = withdrawalStatusConfig[wd.status];
              return (
                <div
                  key={wd.id}
                  className="glass-card flex items-center gap-3 p-4 transition-all duration-300 hover:bg-white/[0.06]"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5`}>
                    <svg className={`h-5 w-5 ${config.className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {Number(wd.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {wd.tokenSymbol}
                      </span>
                      <span className={`rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium ${config.className}`}>
                        {config.label}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="truncate font-mono text-[11px] text-gray-500">
                        {wd.toAddress.slice(0, 8)}...{wd.toAddress.slice(-6)}
                      </span>
                      <button
                        onClick={() => copyAddress(wd.toAddress)}
                        className="shrink-0 text-gray-600 transition-colors hover:text-gray-400"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] text-gray-500">{timeAgo(wd.createdAt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notifications Preview */}
      {!notiLoading && (notifications.length > 0 || unreadCount > 0) && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">알림</h2>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-1.5 text-[10px] font-bold text-white shadow-sm shadow-purple-500/30">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <a href="/notifications" className="text-xs font-medium text-purple-400 transition-colors hover:text-purple-300">
              전체보기
            </a>
          </div>
          <div className="glass-card divide-y divide-white/[0.04] overflow-hidden">
            {notifications.map((n) => {
              const icon = notifTypeIcons[n.type] || notifTypeIcons.SYSTEM;
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 p-3.5 transition-all duration-300 hover:bg-white/[0.03] ${
                    !n.isRead ? 'bg-purple-500/[0.04]' : ''
                  }`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${icon.bg}`}>
                    <svg className={`h-4 w-4 ${icon.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon.path} />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium text-white">{n.title}</span>
                      {!n.isRead && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50" />
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gray-500">{n.message}</p>
                  </div>
                  <span className="shrink-0 pt-0.5 text-[10px] text-gray-600">{timeAgo(n.createdAt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">최근 거래</h2>
          <a href="/transactions" className="text-xs font-medium text-purple-400 transition-colors hover:text-purple-300">
            전체보기
          </a>
        </div>
        <div className="glass-card p-4">
          <TransactionList transactions={transactions} loading={txLoading} currentUserId={currentUserId} />
        </div>
      </div>

      {/* Copied toast */}
      {copied && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 animate-fade-in rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur-xl sm:bottom-6">
          주소가 복사되었습니다
        </div>
      )}
    </div>
  );
}
