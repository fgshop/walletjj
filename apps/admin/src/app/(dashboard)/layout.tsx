'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAdminAuthenticated, adminLogout, getAdminName } from '../../lib/auth';
import Sidebar from '../../components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [adminName, setAdminName] = useState('');

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      router.replace('/login');
    } else {
      setAdminName(getAdminName());
      setReady(true);
    }
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-dim">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-dim">
      <Sidebar />
      <div className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/5 bg-surface-dim/80 px-6 backdrop-blur-xl">
          <div className="lg:hidden w-10" />
          <h2 className="text-sm font-medium text-text-secondary hidden lg:block">관리자 대시보드</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-info flex items-center justify-center text-[10px] font-bold text-white">
                {adminName?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <span className="text-sm font-medium text-text">{adminName}</span>
            </div>
            <button
              onClick={adminLogout}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-text-secondary transition-all duration-200 hover:bg-danger/10 hover:text-danger hover:border-danger/30"
            >
              로그아웃
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
