'use client';

import { useExchangeRates } from '@/lib/exchange-rate.api';

function timeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

const SOURCE_COLOR: Record<string, string> = {
  live: 'var(--up)',
  stale: 'var(--gold)',
  fallback: 'var(--mute)',
};

export function ExchangeRateCard() {
  const { data, isLoading } = useExchangeRates();

  const sourceColor = data ? (SOURCE_COLOR[data.source] ?? 'var(--mute)') : 'var(--mute)';

  return (
    <div style={{
      background: 'var(--ink-2)',
      border: '1px solid var(--line)',
      borderRadius: 14,
      padding: '18px 24px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span className="mono" style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          exchange rates
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {data && (
            <span style={{
              font: '700 9px/1 var(--font-mono)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#0B0B0F',
              background: sourceColor,
              padding: '3px 6px',
              borderRadius: 3,
            }}>
              {data.source}
            </span>
          )}
          <span className="mono" style={{ fontSize: 10, color: 'var(--mute)' }}>
            {isLoading ? 'loading…' : data ? `Updated ${timeAgo(data.updatedAt)}` : '—'}
          </span>
        </div>
      </div>

      {/* Rate cells */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* USD / VND */}
        <div style={{ padding: 14, background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 10 }}>
          <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>
            usd / vnd
          </div>
          <div style={{ font: '700 22px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
            {isLoading ? (
              <span style={{ color: 'var(--mute)' }}>—</span>
            ) : data ? (
              data.usdVnd.toLocaleString('en-US', { maximumFractionDigits: 0 })
            ) : (
              <span style={{ color: 'var(--mute)' }}>—</span>
            )}
          </div>
        </div>

        {/* EUR / VND */}
        <div style={{ padding: 14, background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 10 }}>
          <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>
            eur / vnd
          </div>
          <div style={{ font: '700 22px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
            {isLoading ? (
              <span style={{ color: 'var(--mute)' }}>—</span>
            ) : data ? (
              data.eurVnd.toLocaleString('en-US', { maximumFractionDigits: 0 })
            ) : (
              <span style={{ color: 'var(--mute)' }}>—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
