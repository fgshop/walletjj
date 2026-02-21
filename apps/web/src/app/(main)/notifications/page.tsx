'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { NotificationType } from '@joju/types';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  body?: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown> | null;
}

const typeIcons: Record<string, { emoji: string; bg: string; color: string }> = {
  DEPOSIT: { emoji: '💰', bg: 'bg-green-500/10', color: 'text-green-400' },
  SEND_COMPLETE: { emoji: '✈️', bg: 'bg-blue-500/10', color: 'text-blue-400' },
  RECEIVE: { emoji: '📥', bg: 'bg-emerald-500/10', color: 'text-emerald-400' },
  WITHDRAWAL_PENDING: { emoji: '⏳', bg: 'bg-orange-500/10', color: 'text-orange-400' },
  WITHDRAWAL_APPROVED: { emoji: '✅', bg: 'bg-green-500/10', color: 'text-green-400' },
  WITHDRAWAL_REJECTED: { emoji: '❌', bg: 'bg-red-500/10', color: 'text-red-400' },
  WITHDRAWAL_COMPLETE: { emoji: '🎉', bg: 'bg-green-500/10', color: 'text-green-400' },
  WALLET_LOCKED: { emoji: '🔒', bg: 'bg-red-500/10', color: 'text-red-400' },
  WALLET_UNLOCKED: { emoji: '🔓', bg: 'bg-green-500/10', color: 'text-green-400' },
  SYSTEM: { emoji: '📢', bg: 'bg-purple-500/10', color: 'text-purple-400' },
  PRICE_ALERT: { emoji: '📈', bg: 'bg-cyan-500/10', color: 'text-cyan-400' },
};

const typeLabels: Record<string, string> = {
  DEPOSIT: '입금 알림',
  SEND_COMPLETE: '송금 완료',
  RECEIVE: '수신 알림',
  WITHDRAWAL_PENDING: '출금 대기',
  WITHDRAWAL_APPROVED: '출금 승인',
  WITHDRAWAL_REJECTED: '출금 거절',
  WITHDRAWAL_COMPLETE: '출금 완료',
  WALLET_LOCKED: '지갑 잠금',
  WALLET_UNLOCKED: '지갑 잠금 해제',
  SYSTEM: '시스템 알림',
  PRICE_ALERT: '시세 알림',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const toggle = (n: Notification) => {
    setExpandedId(prev => prev === n.id ? null : n.id);
    if (!n.isRead) markAsRead(n.id);
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
          {notifications.map((n) => {
            const icon = typeIcons[n.type] || typeIcons.SYSTEM;
            const isExpanded = expandedId === n.id;
            return (
              <div
                key={n.id}
                className={`rounded-xl transition-all duration-300 ${
                  n.isRead
                    ? 'bg-white/[0.03]'
                    : 'bg-purple-500/[0.08] border border-purple-500/20'
                }`}
              >
                <button
                  onClick={() => toggle(n)}
                  className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-white/[0.03] rounded-xl"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${icon.bg} text-lg`}>
                    {icon.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{n.title}</span>
                      {!n.isRead && (
                        <span className="h-2 w-2 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50" />
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gray-400">{n.message}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-gray-500">
                      {new Date(n.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </span>
                    <svg
                      className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expandable detail */}
                <div className={`overflow-hidden transition-all duration-200 ease-in-out ${isExpanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="mx-4 mb-4 space-y-2 rounded-lg bg-white/[0.03] p-3">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${icon.bg} ${icon.color}`}>
                        {typeLabels[n.type] || n.type}
                      </span>
                      {n.isRead ? (
                        <span className="text-[10px] text-gray-500">읽음</span>
                      ) : (
                        <span className="text-[10px] text-purple-400">읽지 않음</span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-gray-300">{n.body || n.message}</p>
                    <p className="text-[10px] text-gray-500">
                      {new Date(n.createdAt).toLocaleString('ko-KR', {
                        year: 'numeric', month: 'long', day: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
