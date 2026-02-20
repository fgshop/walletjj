'use client';

import { useEffect, useState } from 'react';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';

export default function ProfilePage() {
  const [user, setUser] = useState<{ name: string; email: string; phone: string | null; createdAt: string } | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getUser().then((u) => {
      setUser(u);
      setName(u.name || '');
      setPhone(u.phone || '');
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.patch('/users/me', { name, phone: phone || undefined });
      setMessage('저장되었습니다.');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-20 sm:pb-0">
      <a href="/more" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        더보기
      </a>
      <h1 className="text-xl font-bold text-white">회원정보</h1>
      <p className="mb-6 text-sm text-gray-400">프로필 정보를 수정하세요</p>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-400">이메일</label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-gray-500 outline-none"
          />
          <p className="mt-1 text-[11px] text-gray-600">이메일은 변경할 수 없습니다</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-400">이름</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-purple-500/50"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-400">연락처</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-purple-500/50 placeholder:text-gray-600"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-400">가입일</label>
          <input
            type="text"
            value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
            disabled
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-gray-500 outline-none"
          />
        </div>

        {message && (
          <p className={`text-sm ${message.includes('실패') ? 'text-red-400' : 'text-green-400'}`}>{message}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </div>
  );
}
