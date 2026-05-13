'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBrowsingHistory, useClearHistory } from '@/lib/browsing-history.api';
import { useAuth } from '@/contexts/auth-context';

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function fmtVnd(n: number): string {
  return (n / 1_000_000).toFixed(2) + 'M₫';
}

export default function BrowsingHistoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useBrowsingHistory(page);
  const clearHistory = useClearHistory();

  async function handleClearAll() {
    if (!window.confirm('Clear all browsing history? This cannot be undone.')) return;
    await clearHistory.mutateAsync();
    setPage(1);
  }

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--ink)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        color: 'var(--chalk)',
        font: '500 14px/1.4 var(--font-display)',
      }}>
        <div style={{ font: '700 20px/1 var(--font-display)' }}>Please log in</div>
        <div style={{ color: 'var(--mute)', fontSize: 13 }}>You need to be logged in to view your browsing history.</div>
        <button
          onClick={() => router.push('/auth/login')}
          style={{
            marginTop: 8, height: 38, padding: '0 20px',
            background: 'var(--gold)', border: 0, borderRadius: 8,
            cursor: 'pointer', font: '700 12px/1 var(--font-mono)',
            color: '#0B0B0F', letterSpacing: '0.06em', textTransform: 'uppercase',
          }}
        >
          Log in
        </button>
      </div>
    );
  }

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', color: 'var(--chalk)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 28px', borderBottom: '1px solid var(--line)',
        background: 'var(--ink-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'transparent', border: '1px solid var(--line)',
              borderRadius: 6, cursor: 'pointer', padding: '6px 10px',
              color: 'var(--bone)', font: '700 12px/1 var(--font-mono)',
              letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            ← back
          </button>
          <h1 style={{ font: '700 20px/1 var(--font-display)', margin: 0, letterSpacing: '-0.015em' }}>
            browsing history
          </h1>
        </div>
        <button
          onClick={handleClearAll}
          disabled={clearHistory.isPending}
          style={{
            height: 34, padding: '0 14px',
            background: 'transparent', border: '1px solid rgba(229,72,77,0.5)',
            borderRadius: 6, cursor: clearHistory.isPending ? 'not-allowed' : 'pointer',
            font: '700 11px/1 var(--font-mono)', color: 'var(--down)',
            letterSpacing: '0.04em', textTransform: 'uppercase',
            opacity: clearHistory.isPending ? 0.6 : 1,
          }}
        >
          {clearHistory.isPending ? '…' : 'clear all'}
        </button>
      </div>

      {/* Table */}
      <div style={{ padding: '24px 28px' }}>
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
            padding: '12px 24px',
            font: '700 10px/1 var(--font-mono)', color: 'var(--mute)',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            background: 'var(--ink-3)', borderBottom: '1px solid var(--hairline)',
          }}>
            <span>viewed at</span>
            <span>brand</span>
            <span>gold type</span>
            <span style={{ textAlign: 'right' }}>buy price</span>
          </div>

          {isLoading && (
            <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--mute)', font: '500 13px/1 var(--font-mono)' }}>
              loading…
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--mute)', font: '500 13px/1 var(--font-mono)' }}>
              no history yet
            </div>
          )}

          {!isLoading && items.map((item, i) => (
            <div
              key={item.id}
              style={{
                display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
                padding: '14px 24px', alignItems: 'center',
                borderTop: i === 0 ? 'none' : '1px solid var(--hairline)',
              }}
            >
              <div className="mono" style={{ fontSize: 12, color: 'var(--bone)' }}>
                {fmtDate(item.viewedAt)}
              </div>
              <div style={{ font: '700 13px/1 var(--font-display)' }}>{item.brand}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--mute)' }}>{item.goldType}</div>
              <div style={{ textAlign: 'right', font: '700 14px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
                {fmtVnd(item.buyPrice)}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
            marginTop: 20,
          }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                height: 34, padding: '0 14px',
                background: 'var(--ink-3)', border: '1px solid var(--line)',
                borderRadius: 6, cursor: page <= 1 ? 'not-allowed' : 'pointer',
                font: '700 11px/1 var(--font-mono)', color: page <= 1 ? 'var(--mute)' : 'var(--bone)',
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}
            >
              ← prev
            </button>
            <span className="mono" style={{ fontSize: 12, color: 'var(--mute)' }}>
              page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                height: 34, padding: '0 14px',
                background: 'var(--ink-3)', border: '1px solid var(--line)',
                borderRadius: 6, cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                font: '700 11px/1 var(--font-mono)', color: page >= totalPages ? 'var(--mute)' : 'var(--bone)',
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}
            >
              next →
            </button>
          </div>
        )}

        {/* Summary */}
        {data && (
          <div className="mono" style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: 'var(--mute)' }}>
            {data.total} entries total
          </div>
        )}
      </div>
    </div>
  );
}
