'use client';

import { useExchangeRates } from '@/lib/exchange-rate.api';
import { cn } from '@/lib/utils';

function timeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

const SOURCE_BADGE_CLS: Record<string, string> = {
  live:     'bg-up',
  stale:    'bg-gold',
  fallback: 'bg-[rgba(100,100,120,0.5)]',
};

export function ExchangeRateCard() {
  const { data, isLoading } = useExchangeRates();

  return (
    <div className="bg-ink-2 border border-line rounded-[14px] p-[18px_24px]">
      <div className="flex justify-between items-center mb-4">
        <span className="font-mono text-[10px] leading-none text-mute tracking-[0.14em] uppercase">
          exchange rates
        </span>
        <div className="flex items-center gap-[10px]">
          {data && (
            <span className={cn(
              'font-mono text-[9px] leading-none font-bold tracking-[0.14em] uppercase px-[6px] py-[3px] rounded-[3px] text-gold-ink',
              SOURCE_BADGE_CLS[data.source] ?? 'bg-[rgba(100,100,120,0.5)]',
            )}>
              {data.source}
            </span>
          )}
          <span className="font-mono text-[10px] leading-none text-mute">
            {isLoading ? 'loading…' : data ? `Updated ${timeAgo(data.updatedAt)}` : '—'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-[14px] bg-ink-3 border border-line rounded-[10px]">
          <div className="font-mono text-[9px] leading-none text-mute tracking-[0.14em] uppercase mb-[6px]">
            usd / vnd
          </div>
          <div className="font-display text-[22px] leading-none font-bold tabular-nums">
            {isLoading || !data
              ? <span className="text-mute">—</span>
              : data.usdVnd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
        </div>

        <div className="p-[14px] bg-ink-3 border border-line rounded-[10px]">
          <div className="font-mono text-[9px] leading-none text-mute tracking-[0.14em] uppercase mb-[6px]">
            eur / vnd
          </div>
          <div className="font-display text-[22px] leading-none font-bold tabular-nums">
            {isLoading || !data
              ? <span className="text-mute">—</span>
              : data.eurVnd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>
    </div>
  );
}
