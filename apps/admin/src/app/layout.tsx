import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JOJUWallet Admin',
  description: 'JOJUWallet 관리자 대시보드',
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
      <body className="bg-surface-dim text-text antialiased">{children}</body>
    </html>
  );
}
