'use client';

import { useState } from 'react';
import api from '@/lib/api';

export default function SecurityPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      setMessage('새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      await api.patch('/users/me', { currentPassword, newPassword });
      setMessage('비밀번호가 변경되었습니다.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('비밀번호 변경에 실패했습니다. 현재 비밀번호를 확인하세요.');
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
      <h1 className="text-xl font-bold text-white">보안 설정</h1>
      <p className="mb-6 text-sm text-gray-400">비밀번호를 변경하세요</p>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-400">현재 비밀번호</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-purple-500/50"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-400">새 비밀번호</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="8자 이상"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-purple-500/50 placeholder:text-gray-600"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-400">새 비밀번호 확인</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-purple-500/50"
          />
        </div>

        {message && (
          <p className={`text-sm ${message.includes('실패') || message.includes('일치') || message.includes('이상') ? 'text-red-400' : 'text-green-400'}`}>{message}</p>
        )}

        <button
          onClick={handleChangePassword}
          disabled={saving || !currentPassword || !newPassword}
          className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? '변경 중...' : '비밀번호 변경'}
        </button>
      </div>
    </div>
  );
}
