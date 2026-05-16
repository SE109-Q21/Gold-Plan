'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useLatestDigest } from '@/lib/digest.api';

function todayKey(): string {
  return `digest_dismissed_${new Date().toISOString().slice(0, 10)}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function fmtVnd(n: number): string {
  return (n / 1_000_000).toFixed(2) + 'M₫';
}

export function DigestCard() {
  const { user } = useAuth();
  const { data: digest } = useLatestDigest();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!sessionStorage.getItem(todayKey());
  });

  // Only render for logged-in users with digest data
  if (!user || !digest) return null;
  if (dismissed) return null;

  function handleDismiss() {
    sessionStorage.setItem(todayKey(), '1');
    setDismissed(true);
  }

  const pctColor = digest.pctChangeSjc >= 0 ? 'var(--up)' : 'var(--down)';
  const pctSign = digest.pctChangeSjc >= 0 ? '+' : '';

  return (
    <div style={{
      background: 'var(--ink-2)',
      border: '1px solid var(--line)',
      borderRadius: 8,
      padding: '16px 20px',
      marginBottom: 20,
    }}>
      {/* Collapsed row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          font: '600 13px/1 var(--font-display)',
          color: 'var(--chalk)',
        }}>
          <span>📊</span>
          <span>
            Today&apos;s Digest
            <span style={{ color: 'var(--mute)', marginLeft: 6 }}>·</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--mute)', marginLeft: 6 }}>
              {fmtDate(digest.date)}
            </span>
          </span>
          <span
            className="mono"
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: pctColor,
              background: digest.pctChangeSjc >= 0 ? 'rgba(88,200,150,0.10)' : 'rgba(229,72,77,0.10)',
              border: `1px solid ${pctColor}`,
              borderRadius: 4,
              padding: '2px 6px',
            }}
          >
            {pctSign}{digest.pctChangeSjc.toFixed(2)}%
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              background: 'transparent',
              border: '1px solid var(--line)',
              borderRadius: 4,
              padding: '4px 10px',
              font: '600 11px/1 var(--font-mono)',
              color: 'var(--bone)',
              cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            {expanded ? '▲ collapse' : '▼ expand'}
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss digest"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--mute)',
              font: '500 14px/1 var(--font-mono)',
              padding: '2px 4px',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--hairline)' }}>
          {/* Date heading */}
          <div style={{
            font: '700 15px/1 var(--font-display)',
            color: 'var(--chalk)',
            marginBottom: 14,
          }}>
            Market Digest — {fmtDate(digest.date)}
          </div>

          {/* 3-column price row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 12,
            marginBottom: 14,
          }}>
            {/* SJC Buy */}
            <div style={{
              background: 'var(--ink-3)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: '10px 14px',
            }}>
              <div className="mono" style={{
                fontSize: 9,
                color: 'var(--mute)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}>
                SJC Buy
              </div>
              <div style={{
                font: '700 16px/1 var(--font-display)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {fmtVnd(digest.sjcBuyVnd)}
              </div>
            </div>

            {/* SJC Sell */}
            <div style={{
              background: 'var(--ink-3)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: '10px 14px',
            }}>
              <div className="mono" style={{
                fontSize: 9,
                color: 'var(--mute)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}>
                SJC Sell
              </div>
              <div style={{
                font: '700 16px/1 var(--font-display)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {fmtVnd(digest.sjcSellVnd)}
              </div>
            </div>

            {/* XAU/USD */}
            <div style={{
              background: 'var(--ink-3)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: '10px 14px',
            }}>
              <div className="mono" style={{
                fontSize: 9,
                color: 'var(--mute)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}>
                XAU/USD
              </div>
              <div style={{
                font: '700 16px/1 var(--font-display)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                ${digest.xauUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* % change badge */}
          <div style={{ marginBottom: 12 }}>
            <span
              className="mono"
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: pctColor,
                background: digest.pctChangeSjc >= 0 ? 'rgba(88,200,150,0.10)' : 'rgba(229,72,77,0.10)',
                border: `1px solid ${pctColor}`,
                borderRadius: 4,
                padding: '4px 10px',
              }}
            >
              SJC {pctSign}{digest.pctChangeSjc.toFixed(2)}% vs previous
            </span>
          </div>

          {/* Highlight */}
          <div style={{
            font: '600 13px/1.5 var(--font-display)',
            color: 'var(--chalk)',
            marginBottom: digest.aiSummary ? 10 : 0,
          }}>
            {digest.highlight}
          </div>

          {/* AI Summary */}
          {digest.aiSummary && (
            <div style={{
              font: 'italic 500 12px/1.6 var(--font-display)',
              color: 'var(--mute)',
              paddingTop: 10,
              borderTop: '1px solid var(--hairline)',
            }}>
              {digest.aiSummary}
            </div>
          )}

          {/* Collapse button */}
          <div style={{ marginTop: 14, textAlign: 'center' }}>
            <button
              onClick={() => setExpanded(false)}
              style={{
                background: 'transparent',
                border: '1px solid var(--line)',
                borderRadius: 4,
                padding: '5px 16px',
                font: '600 11px/1 var(--font-mono)',
                color: 'var(--mute)',
                cursor: 'pointer',
                letterSpacing: '0.04em',
              }}
            >
              ▲ collapse
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
