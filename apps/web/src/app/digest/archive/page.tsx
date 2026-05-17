'use client';
import { ProtectedRoute } from '@/components/ProtectedRoute';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDigestArchive } from '@/lib/digest.api';
import type { DigestDto } from '@gpls/shared';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
}

function fmtVnd(n: number) {
  return n.toLocaleString('en-US') + '₫';
}

function PctBadge({ pct }: { pct: number }) {
  const isUp = pct >= 0;
  return (
    <span style={{
      font: '700 11px/1 var(--font-mono)', letterSpacing: '0.06em',
      padding: '3px 8px', borderRadius: 4,
      color: isUp ? 'var(--up)' : 'var(--down)',
      background: isUp ? 'rgba(88,200,150,0.12)' : 'rgba(229,72,77,0.12)',
      border: `1px solid ${isUp ? 'rgba(88,200,150,0.3)' : 'rgba(229,72,77,0.3)'}`,
    }}>
      {isUp ? '+' : ''}{pct.toFixed(2)}%
    </span>
  );
}

function DigestCard({ item }: { item: DigestDto }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      onClick={() => setExpanded(p => !p)}
      style={{
        background: 'var(--ink-2)', border: '1px solid var(--line)',
        borderRadius: 8, padding: '16px 20px', marginBottom: 8,
        cursor: 'pointer',
        transition: 'border-color 120ms',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--mute)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ font: '700 15px/1 var(--font-display)', color: 'var(--chalk)', flex: '1 1 auto' }}>
          {fmtDate(item.date)}
        </span>
        <PctBadge pct={item.pctChangeSjc} />
        <span style={{ font: '700 14px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums', color: 'var(--chalk)' }}>
          {fmtVnd(item.sjcBuyVnd)}
        </span>
        <span style={{ font: '700 14px/1 var(--font-mono)', color: expanded ? 'var(--gold)' : 'var(--mute)', marginLeft: 4 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          {/* Price grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { lbl: 'SJC Buy',  val: fmtVnd(item.sjcBuyVnd)  },
              { lbl: 'SJC Sell', val: fmtVnd(item.sjcSellVnd) },
              { lbl: 'XAU/USD',  val: `$${item.xauUsd.toFixed(2)}` },
            ].map(cell => (
              <div key={cell.lbl} style={{
                background: 'var(--ink-3)', borderRadius: 6, padding: '10px 12px',
                border: '1px solid var(--hairline)',
              }}>
                <div style={{ font: '700 9px/1 var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mute)', marginBottom: 6 }}>
                  {cell.lbl}
                </div>
                <div style={{ font: '700 15px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums', color: 'var(--chalk)' }}>
                  {cell.val}
                </div>
              </div>
            ))}
          </div>

          {/* Highlight */}
          {item.highlight && (
            <div style={{
              background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)',
              borderRadius: 6, padding: '10px 14px',
            }}>
              <div style={{ font: '700 9px/1 var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>
                Highlight
              </div>
              <div style={{ font: '500 13px/1.5 var(--font-display)', color: 'var(--chalk)' }}>
                {item.highlight}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {item.aiSummary && (
            <div style={{
              background: 'var(--ink-3)', border: '1px solid var(--line)',
              borderRadius: 6, padding: '10px 14px',
            }}>
              <div style={{ font: '700 9px/1 var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mute)', marginBottom: 6 }}>
                AI Analysis
              </div>
              <div style={{ font: '400 13px/1.6 var(--font-display)', color: 'var(--bone)' }}>
                {item.aiSummary}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--ink-2)', border: '1px solid var(--line)',
      borderRadius: 8, padding: '16px 20px', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ height: 15, width: 180, borderRadius: 4, background: 'var(--ink-3)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
        <div style={{ height: 20, width: 60, borderRadius: 4, background: 'var(--ink-3)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
        <div style={{ height: 14, width: 100, borderRadius: 4, background: 'var(--ink-3)', animation: 'pulse 1.5s ease-in-out infinite', marginLeft: 'auto' }}/>
      </div>
    </div>
  );
}

function DigestArchiveContent() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useDigestArchive(page);

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    height: 34, padding: '0 16px',
    background: disabled ? 'var(--ink-3)' : 'var(--ink-2)',
    border: `1px solid ${disabled ? 'var(--hairline)' : 'var(--line)'}`,
    borderRadius: 8, cursor: disabled ? 'default' : 'pointer',
    font: '700 11px/1 var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase',
    color: disabled ? 'var(--mute)' : 'var(--chalk)',
    opacity: disabled ? 0.5 : 1,
  });

  return (
    <div style={{ background: 'var(--ink)', minHeight: '100vh', color: 'var(--chalk)' }}>
      <div style={{ padding: '32px 40px', maxWidth: 860, margin: '0 auto' }}>
        {/* Back button */}
        <button
          onClick={() => router.back()}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--mute)', font: '500 13px/1 var(--font-display)',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '0 0 24px', marginBottom: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          back
        </button>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ font: '800 36px/1 var(--font-display)', margin: '0 0 10px', letterSpacing: '-0.025em' }}>
            Digest Archive
          </h1>
          <p style={{ font: '400 14px/1.5 var(--font-display)', color: 'var(--mute)', margin: 0 }}>
            Morning gold market digests, weekdays at 7:30 AM ICT
          </p>
        </div>

        {/* Cards */}
        {isLoading && [0, 1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}

        {!isLoading && items.length === 0 && (
          <div style={{
            padding: '64px 0', textAlign: 'center',
            font: '500 15px/1.5 var(--font-display)', color: 'var(--mute)',
          }}>
            No digests available yet.
          </div>
        )}

        {!isLoading && items.map(item => (
          <DigestCard key={item.id} item={item} />
        ))}

        {/* Pagination */}
        {!isLoading && total > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
            <button
              style={btnStyle(page <= 1)}
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              ← Prev
            </button>

            <span style={{ font: '500 13px/1 var(--font-display)', color: 'var(--mute)' }}>
              Page {page} of {totalPages}
            </span>

            <button
              style={btnStyle(page >= totalPages)}
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DigestArchivePage() {
  return <ProtectedRoute><DigestArchiveContent /></ProtectedRoute>;
}
