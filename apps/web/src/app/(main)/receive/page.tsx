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
        <h1 className="text-xl font-bold">입금</h1>
        <p className="mb-6 text-sm text-text-secondary">JOJU를 받으세요</p>
        <div className="flex flex-col items-center rounded-2xl bg-surface p-8 shadow-sm">
          <div className="h-52 w-52 animate-pulse rounded-xl bg-surface-dim" />
          <div className="mt-4 h-4 w-48 animate-pulse rounded bg-surface-dim" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg pb-20 sm:pb-0">
      <h1 className="text-xl font-bold">입금</h1>
      <p className="mb-6 text-sm text-text-secondary">아래 QR 코드 또는 주소로 JOJU를 받으세요</p>

      <div className="rounded-2xl bg-surface p-6 shadow-sm">
        {/* QR Code */}
        <div className="flex flex-col items-center">
          <div className="rounded-2xl border-2 border-border bg-white p-4">
            {address ? (
              <QRCodeSVG
                value={address}
                size={200}
                level="H"
                includeMargin={false}
              />
            ) : (
              <div className="flex h-[200px] w-[200px] items-center justify-center text-sm text-text-secondary">
                주소를 불러올 수 없습니다
              </div>
            )}
          </div>

          {/* Address */}
          <div className="mt-5 w-full">
            <label className="mb-1.5 block text-center text-xs font-medium text-text-secondary">
              내 TRON 주소
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-dim px-3 py-2.5">
              <span className="min-w-0 flex-1 truncate text-center font-mono text-xs text-text">
                {address || '-'}
              </span>
              <button
                onClick={copyAddress}
                disabled={!address}
                className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {copied ? '복사됨' : '복사'}
              </button>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-2">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs text-blue-800">
              <p className="font-medium">입금 안내</p>
              <ul className="mt-1 space-y-0.5">
                <li>TRON(TRC-20) 네트워크만 지원됩니다.</li>
                <li>다른 네트워크로 전송 시 자산이 유실될 수 있습니다.</li>
                <li>QR 코드를 상대방에게 보여주면 쉽게 입금받을 수 있습니다.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
