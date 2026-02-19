import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JOJUWallet - TRON TRC-20 Wallet',
  description: 'TRON 네트워크 기반 TRC-20 지갑 플랫폼',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="bg-[#06060f] text-white antialiased">{children}</body>
    </html>
  );
}
