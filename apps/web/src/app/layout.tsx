import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'GoldTracker — Live Gold Prices Vietnam',
  description: 'Track live gold prices from SJC, DOJI, PNJ and international markets',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" style={{ height: '100%', margin: 0 }}>
      <body style={{ height: '100%', margin: 0, overflow: 'hidden' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
