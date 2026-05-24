'use client';

import { useRealTimePrices } from '@/lib/use-realtime-prices';

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useRealTimePrices();
  return <>{children}</>;
}
