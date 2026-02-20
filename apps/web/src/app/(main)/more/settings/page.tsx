'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [txAlert, setTxAlert] = useState(true);
  const [priceAlert, setPriceAlert] = useState(false);
  const [currency, setCurrency] = useState('KRW');

  useEffect(() => {
    const saved = localStorage.getItem('joju_settings');
    if (saved) {
      const s = JSON.parse(saved);
      setPushEnabled(s.pushEnabled ?? true);
      setTxAlert(s.txAlert ?? true);
      setPriceAlert(s.priceAlert ?? false);
      setCurrency(s.currency ?? 'KRW');
    }
  }, []);

  const save = (updates: Record<string, unknown>) => {
    const next = { pushEnabled, txAlert, priceAlert, currency, ...updates };
    localStorage.setItem('joju_settings', JSON.stringify(next));
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-purple-600' : 'bg-white/10'}`}
    >
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );

  return (
    <div className="pb-20 sm:pb-0">
      <a href="/more" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        더보기
      </a>
      <h1 className="text-xl font-bold text-white">환경설정</h1>
      <p className="mb-6 text-sm text-gray-400">앱 환경을 설정하세요</p>

      {/* Notifications */}
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">알림</h2>
      <div className="mb-5 divide-y divide-white/[0.06] rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center justify-between px-4 py-3.5">
          <div>
            <p className="text-sm font-medium text-white">푸시 알림</p>
            <p className="text-[11px] text-gray-500">거래 및 시스템 알림 수신</p>
          </div>
          <Toggle checked={pushEnabled} onChange={(v) => { setPushEnabled(v); save({ pushEnabled: v }); }} />
        </div>
        <div className="flex items-center justify-between px-4 py-3.5">
          <div>
            <p className="text-sm font-medium text-white">거래 알림</p>
            <p className="text-[11px] text-gray-500">입출금 시 알림</p>
          </div>
          <Toggle checked={txAlert} onChange={(v) => { setTxAlert(v); save({ txAlert: v }); }} />
        </div>
        <div className="flex items-center justify-between px-4 py-3.5">
          <div>
            <p className="text-sm font-medium text-white">시세 알림</p>
            <p className="text-[11px] text-gray-500">가격 변동 알림</p>
          </div>
          <Toggle checked={priceAlert} onChange={(v) => { setPriceAlert(v); save({ priceAlert: v }); }} />
        </div>
      </div>

      {/* Display */}
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">표시</h2>
      <div className="mb-5 divide-y divide-white/[0.06] rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center justify-between px-4 py-3.5">
          <div>
            <p className="text-sm font-medium text-white">표시 통화</p>
            <p className="text-[11px] text-gray-500">잔액 환산 통화</p>
          </div>
          <select
            value={currency}
            onChange={(e) => { setCurrency(e.target.value); save({ currency: e.target.value }); }}
            className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white outline-none"
          >
            <option value="KRW">KRW (원)</option>
            <option value="USD">USD ($)</option>
          </select>
        </div>
        <div className="flex items-center justify-between px-4 py-3.5">
          <div>
            <p className="text-sm font-medium text-white">언어</p>
            <p className="text-[11px] text-gray-500">인터페이스 언어</p>
          </div>
          <span className="text-xs text-gray-400">한국어</span>
        </div>
      </div>
    </div>
  );
}
