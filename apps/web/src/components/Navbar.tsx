'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/auth';
import api from '@/lib/api';

export default function Navbar() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    api.get('/notifications/unread-count')
      .then(({ data }) => setUnreadCount(data.data?.count ?? 0))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#06060f]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <a href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-blue-500 transition-shadow duration-300 group-hover:shadow-lg group-hover:shadow-purple-500/20">
            <span className="text-sm font-bold text-white">J</span>
          </div>
          <span className="text-lg font-bold gradient-text">JOJU Wallet</span>
        </a>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/notifications')}
            className="relative rounded-xl p-2 text-gray-400 transition-all duration-300 hover:bg-white/5 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-1 text-[10px] font-bold text-white shadow-lg shadow-purple-500/30">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="rounded-xl px-3 py-1.5 text-sm text-gray-400 transition-all duration-300 hover:bg-white/5 hover:text-white"
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
