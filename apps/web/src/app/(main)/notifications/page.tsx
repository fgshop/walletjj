'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { NotificationType } from '@joju/types';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const typeIcons: Record<string, string> = {
  DEPOSIT: '💰',
  SEND_COMPLETE: '✈️',
  RECEIVE: '📥',
  WITHDRAWAL_PENDING: '⏳',
  WITHDRAWAL_APPROVED: '✅',
  WITHDRAWAL_REJECTED: '❌',
  WITHDRAWAL_COMPLETE: '🎉',
  WALLET_LOCKED: '🔒',
  WALLET_UNLOCKED: '🔓',
  SYSTEM: '📢',
  PRICE_ALERT: '📈',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications')
      .then(({ data }) => setNotifications(data.data?.items ?? data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch {}
  };

  if (loading) {
    return (
      <div className="pb-20 sm:pb-0">
        <h1 className="text-xl font-bold text-white">알림</h1>
        <p className="mb-6 text-sm text-gray-400">새로운 알림을 확인하세요</p>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4">
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-full shimmer" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded shimmer" />
                  <div className="h-3 w-48 rounded shimmer" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 sm:pb-0">
      <h1 className="text-xl font-bold text-white">알림</h1>
      <p className="mb-6 text-sm text-gray-400">새로운 알림을 확인하세요</p>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center glass-card py-16 text-gray-400">
          <svg className="mb-3 h-12 w-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-sm">알림이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.isRead && markAsRead(n.id)}
              className={`flex w-full items-start gap-3 rounded-xl p-4 text-left transition-all duration-300 ${
                n.isRead
                  ? 'bg-white/[0.03] hover:bg-white/[0.05]'
                  : 'bg-purple-500/[0.08] border border-purple-500/20 hover:bg-purple-500/[0.12]'
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-lg">
                {typeIcons[n.type] || '📢'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{n.title}</span>
                  {!n.isRead && (
                    <span className="h-2 w-2 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50" />
                  )}
                </div>
                <p className="mt-0.5 text-xs text-gray-400">{n.message}</p>
                <p className="mt-1 text-[10px] text-gray-500">
                  {new Date(n.createdAt).toLocaleDateString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
