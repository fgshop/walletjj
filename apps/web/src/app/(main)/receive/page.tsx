'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '@/lib/api';

export default function ReceivePage() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchWallet() {
      try {
        const { data } = await api.get('/wallet');
        setAddress(data.data?.address ?? '');
      } catch {
        setAddress('');
      } finally {
        setLoading(false);
      }
    }
    fetchWallet();
  }, []);

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-lg pb-20 sm:pb-0">
        <h1 className="text-xl font-bold text-white">입금</h1>
        <p className="mb-6 text-sm text-gray-400">JOJU를 받으세요</p>
        <div className="flex flex-col items-center glass-card-strong p-8">
          <div className="h-52 w-52 rounded-xl shimmer" />
          <div className="mt-4 h-4 w-48 rounded shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg pb-20 sm:pb-0">
      <h1 className="text-xl font-bold text-white">입금</h1>
      <p className="mb-6 text-sm text-gray-400">아래 QR 코드 또는 주소로 JOJU를 받으세요</p>

      <div className="glass-card-strong p-6">
        {/* QR Code */}
        <div className="flex flex-col items-center">
          <div className="rounded-2xl border border-white/10 bg-white p-4">
            {address ? (
              <QRCodeSVG
                value={address}
                size={200}
                level="H"
                includeMargin={false}
              />
            ) : (
              <div className="flex h-[200px] w-[200px] items-center justify-center text-sm text-gray-400">
                주소를 불러올 수 없습니다
              </div>
            )}
          </div>

          {/* Address */}
          <div className="mt-5 w-full">
            <label className="mb-1.5 block text-center text-xs font-medium text-gray-400">
              내 TRON 주소
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
              <span className="min-w-0 flex-1 truncate text-center font-mono text-xs text-gray-300">
                {address || '-'}
              </span>
              <button
                onClick={copyAddress}
                disabled={!address}
                className="btn-gradient shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {copied ? '복사됨' : '복사'}
              </button>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
          <div className="flex items-start gap-2">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <div className="text-xs text-cyan-300/80">
              <p className="font-medium text-cyan-300">입금 안내</p>
              <ul className="mt-1.5 space-y-1">
                <li>이 주소로 입금하면 <span className="font-semibold text-cyan-200">잔액에 자동 반영</span>됩니다.</li>
                <li>반영된 잔액은 <span className="font-semibold text-cyan-200">송금 + 출금</span> 모두 사용 가능합니다.</li>
                <li>TRON(TRC-20) 네트워크만 지원됩니다.</li>
                <li>다른 네트워크로 전송 시 자산이 유실될 수 있습니다.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
