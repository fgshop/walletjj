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
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-surface/80 px-6 backdrop-blur">
          <div className="lg:hidden w-10" />
          <h2 className="text-sm font-medium text-text-secondary hidden lg:block">관리자 대시보드</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-text">{adminName}</span>
            <button
              onClick={adminLogout}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-danger/10 hover:text-danger hover:border-danger/30"
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
