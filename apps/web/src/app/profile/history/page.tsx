'use client';
import { ProtectedRoute } from '@/components/ProtectedRoute';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBrowsingHistory, useClearHistory, useLowestSeen } from '@/lib/browsing-history.api';

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

function BrowsingHistoryContent() {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useBrowsingHistory(page);
  const { data: lowestData } = useLowestSeen();
  const clearHistory = useClearHistory();

  // Build a lookup map: "brand|goldType" -> lowestPrice
  const lowestMap = new Map<string, number>(
    (lowestData ?? []).map((item) => [`${item.brand}|${item.goldType}`, item.lowestPrice]),
  );

  async function handleClearAll() {
    if (!window.confirm('Clear all browsing history? This cannot be undone.')) return;
    await clearHistory.mutateAsync();
    setPage(1);
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
            display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr 1fr',
            padding: '12px 24px',
            font: '700 10px/1 var(--font-mono)', color: 'var(--mute)',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            background: 'var(--ink-3)', borderBottom: '1px solid var(--hairline)',
          }}>
            <span>viewed at</span>
            <span>brand</span>
            <span>gold type</span>
            <span style={{ textAlign: 'right' }}>buy price</span>
            <span style={{ textAlign: 'right' }}>giá thấp nhất</span>
            <span style={{ textAlign: 'right' }}>vs thấp nhất</span>
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

          {!isLoading && items.map((item, i) => {
            const lowestPrice = lowestMap.get(`${item.brand}|${item.goldType}`);
            const isLowest = lowestPrice !== undefined && item.buyPrice === lowestPrice;
            const vsPct = lowestPrice !== undefined && lowestPrice > 0
              ? ((item.buyPrice - lowestPrice) / lowestPrice) * 100
              : null;

            return (
              <div
                key={item.id}
                style={{
                  display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr 1fr',
                  padding: '14px 24px', alignItems: 'center',
                  borderTop: i === 0 ? 'none' : '1px solid var(--hairline)',
                }}
              >
                <div className="mono" style={{ fontSize: 12, color: 'var(--bone)' }}>
                  {fmtDate(item.viewedAt)}
                </div>
                <div style={{ font: '700 13px/1 var(--font-display)' }}>{item.brand}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--mute)' }}>{item.goldType}</div>
                <div style={{
                  textAlign: 'right',
                  font: '700 14px/1 var(--font-display)',
                  fontVariantNumeric: 'tabular-nums',
                  color: isLowest ? 'var(--up)' : undefined,
                }}>
                  {fmtVnd(item.buyPrice)}
                </div>
                <div style={{
                  textAlign: 'right',
                  font: '600 13px/1 var(--font-display)',
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--up)',
                }}>
                  {lowestPrice !== undefined ? fmtVnd(lowestPrice) : '—'}
                </div>
                <div style={{
                  textAlign: 'right',
                  font: '600 12px/1 var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  color: vsPct === null ? 'var(--mute)' : vsPct === 0 ? 'var(--up)' : 'var(--bone)',
                }}>
                  {vsPct === null ? '—' : vsPct === 0 ? '= thấp nhất' : `+${vsPct.toFixed(1)}%`}
                </div>
              </div>
            );
          })}
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

export default function BrowsingHistoryPage() {
  return <ProtectedRoute><BrowsingHistoryContent /></ProtectedRoute>;
}
