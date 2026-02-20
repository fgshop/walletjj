'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, logout } from '@/lib/auth';

interface UserInfo {
  name: string;
  email: string;
}

const menuSections = [
  {
    title: '자산',
    items: [
      { href: '/transactions', label: '거래내역', icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', desc: '입출금 및 송금 내역 조회' },
      { href: '/notifications', label: '알림', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', desc: '거래 알림 및 시스템 공지' },
    ],
  },
  {
    title: '계정',
    items: [
      { href: '/more/profile', label: '회원정보', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', desc: '이름, 이메일, 연락처 관리' },
      { href: '/more/security', label: '보안 설정', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', desc: '비밀번호 변경' },
    ],
  },
  {
    title: '설정',
    items: [
      { href: '/more/settings', label: '환경설정', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', desc: '언어, 알림 설정' },
    ],
  },
  {
    title: '정보',
    items: [
      { href: '/more/terms', label: '이용약관', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', desc: '서비스 이용약관' },
      { href: '/more/privacy', label: '개인정보처리방침', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', desc: '개인정보 수집 및 이용' },
      { href: '/more/about', label: '앱 정보', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', desc: 'JOJU Wallet v1.0' },
    ],
  },
];

export default function MorePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    getUser().then(setUser).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="pb-20 sm:pb-0">
      {/* Profile card */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-500">
          <span className="text-xl font-bold text-white">{user?.name?.charAt(0) || 'U'}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-white truncate">{user?.name || '사용자'}</h1>
          <p className="text-sm text-gray-400 truncate">{user?.email || ''}</p>
        </div>
        <a
          href="/more/profile"
          className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          편집
        </a>
      </div>

      {/* Menu sections */}
      {menuSections.map((section) => (
        <div key={section.title} className="mb-5">
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">{section.title}</h2>
          <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.06] bg-white/[0.02]">
            {section.items.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-white/[0.03]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]">
                  <svg className="h-[18px] w-[18px] text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-[11px] text-gray-500">{item.desc}</p>
                </div>
                <svg className="h-4 w-4 shrink-0 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      ))}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="mt-2 w-full rounded-xl border border-red-500/10 bg-red-500/5 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
      >
        로그아웃
      </button>

      <p className="mt-6 text-center text-[11px] text-gray-600">JOJU Wallet v1.0.0</p>
    </div>
  );
}
