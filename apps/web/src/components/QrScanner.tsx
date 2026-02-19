'use client';

import { useEffect, useRef, useState } from 'react';

interface QrScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function QrScanner({ onScan, onClose }: QrScannerProps) {
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let html5QrCode: any = null;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        html5QrCode = new Html5Qrcode('qr-reader');
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            html5QrCode.stop().catch(() => {});
            onScan(decodedText);
          },
          () => {},
        );
      } catch (err: any) {
        setError(
          err?.message?.includes('NotAllowed') || err?.message?.includes('Permission')
            ? '카메라 권한을 허용해주세요.'
            : '카메라를 사용할 수 없습니다.',
        );
      }
    }

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm glass-card-strong p-4 shadow-2xl animate-fade-in">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-white">QR 코드 스캔</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-all duration-300 hover:bg-white/10 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <svg className="h-10 w-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-400">{error}</p>
          </div>
        ) : (
          <div
            id="qr-reader"
            ref={containerRef}
            className="overflow-hidden rounded-xl"
          />
        )}

        <p className="mt-3 text-center text-xs text-gray-500">
          TRON 주소 QR 코드를 카메라에 비춰주세요
        </p>
      </div>
    </div>
  );
}
