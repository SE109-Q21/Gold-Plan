import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin', 'vietnamese'] });

export const metadata: Metadata = {
  title: 'GPLS — Giá Vàng Việt Nam',
  description: 'Tra cứu giá vàng SJC, DOJI theo thời gian thực',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
