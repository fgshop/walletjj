'use client';

export default function AboutPage() {
  return (
    <div className="pb-20 sm:pb-0">
      <a href="/more" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        더보기
      </a>

      <div className="flex flex-col items-center py-8">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-500 shadow-lg shadow-purple-500/20">
          <span className="text-3xl font-bold text-white">J</span>
        </div>
        <h1 className="text-2xl font-bold text-white">JOJU Wallet</h1>
        <p className="mt-1 text-sm text-gray-400">TRC-20 디지털 자산 지갑</p>
        <p className="mt-4 text-xs text-gray-500">버전 1.0.0</p>
      </div>

      <div className="mb-5 divide-y divide-white/[0.06] rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-sm text-gray-400">네트워크</span>
          <span className="text-sm text-white">TRON (Shasta Testnet)</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-sm text-gray-400">지원 토큰</span>
          <span className="text-sm text-white">TRX, TRC-20</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-sm text-gray-400">빌드</span>
          <span className="text-sm text-white">2026.02.20</span>
        </div>
      </div>

      <div className="space-y-3 text-center">
        <a href="/more/terms" className="block text-sm text-purple-400 hover:text-purple-300">이용약관</a>
        <a href="/more/privacy" className="block text-sm text-purple-400 hover:text-purple-300">개인정보처리방침</a>
      </div>

      <p className="mt-8 text-center text-[11px] text-gray-600">&copy; 2026 JOJU Wallet. All rights reserved.</p>
    </div>
  );
}
