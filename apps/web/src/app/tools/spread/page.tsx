'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSpreadRanking, useSpreadHistory } from '@/lib/spread.api';
import type { GoldType, GoldBrand, SpreadRankingDto } from '@gpls/shared';

const GOLD_TYPES: { value: GoldType; label: string }[] = [
  { value: 'MIEN_SJC' as GoldType, label: 'Miếng SJC' },
  { value: 'NHAN_9999' as GoldType, label: 'Nhẫn 9999' },
  { value: 'VANG_24K' as GoldType, label: 'Vàng 24K' },
  { value: 'VANG_18K' as GoldType, label: 'Vàng 18K' },
];

const DAY_OPTIONS = [3, 7, 14, 30];

function SpreadBar({ pct, max }: { pct: number; max: number }) {
  const width = max > 0 ? (pct / max) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--ink-3)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${width}%`, background: 'var(--gold)', borderRadius: 3, transition: 'width 300ms var(--ease)' }}/>
      </div>
      <span style={{ font: '600 12px/1 var(--font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--bone)', minWidth: 50, textAlign: 'right' }}>
        {pct.toFixed(2)}%
      </span>
    </div>
  );
}

function SparkHistory({ brand, goldType, days }: { brand: GoldBrand; goldType: GoldType; days: number }) {
  const { data = [], isLoading } = useSpreadHistory(brand, goldType, days);

  if (isLoading) {
    return <div style={{ height: 40, background: 'var(--ink-3)', borderRadius: 4, animation: 'pulse 1.5s ease-in-out infinite' }}/>;
  }
  if (data.length < 2) {
    return <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ font: '500 11px/1 var(--font-mono)', color: 'var(--mute)' }}>no data</span></div>;
  }

  const spreads = data.map(p => p.spreadPct);
  const max = Math.max(...spreads);
  const min = Math.min(...spreads);
  const range = max - min || 1;

  const W = 120, H = 40, pad = 2;
  const pts = spreads.map((v, i) => {
    const x = pad + (i / (spreads.length - 1)) * (W - pad * 2);
    const y = pad + ((max - v) / range) * (H - pad * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
    </svg>
  );
}

function RankingTable({ items, days }: { items: SpreadRankingDto[]; days: number }) {
  const maxPct = Math.max(...items.map(r => r.spreadPct), 0.01);

  if (items.length === 0) {
    return (
      <div style={{ padding: '48px 22px', textAlign: 'center', color: 'var(--mute)', font: '500 14px/1.5 var(--font-display)' }}>
        No spread data available
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '28px 80px 2fr 1.2fr 1.2fr 1fr 120px',
        padding: '10px 20px', gap: 12, minWidth: 700,
        font: '700 9px/1 var(--font-mono)', color: 'var(--mute)',
        letterSpacing: '0.14em', textTransform: 'uppercase',
        background: 'var(--ink-3)', borderBottom: '1px solid var(--hairline)',
        alignItems: 'center',
      }}>
        <span>#</span>
        <span>brand</span>
        <span>spread %</span>
        <span style={{ textAlign: 'right' }}>buy</span>
        <span style={{ textAlign: 'right' }}>sell</span>
        <span style={{ textAlign: 'right' }}>spread ₫</span>
        <span style={{ textAlign: 'center' }}>trend ({days}d)</span>
      </div>

      {items.map((r, i) => (
        <div
          key={`${r.brand}-${r.goldType}`}
          style={{
            display: 'grid', gridTemplateColumns: '28px 80px 2fr 1.2fr 1.2fr 1fr 120px',
            padding: '14px 20px', gap: 12, minWidth: 700,
            borderTop: i === 0 ? 'none' : '1px solid var(--hairline)',
            alignItems: 'center',
            background: r.isMostEfficient ? 'rgba(212,175,55,0.04)' : 'transparent',
          }}
        >
          <span style={{ font: '700 13px/1 var(--font-mono)', color: i === 0 ? 'var(--gold)' : 'var(--mute)' }}>
            {i + 1}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ font: '700 12px/1 var(--font-mono)', color: 'var(--gold)', letterSpacing: '0.06em' }}>{r.brand}</span>
            {r.isMostEfficient && (
              <span style={{
                font: '700 8px/1 var(--font-mono)', letterSpacing: '0.1em',
                color: '#0B0B0F', background: 'var(--gold)',
                padding: '2px 5px', borderRadius: 3,
              }}>
                BEST
              </span>
            )}
          </div>

          <SpreadBar pct={r.spreadPct} max={maxPct}/>

          <div style={{ textAlign: 'right', font: '600 13px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
            {r.buyPrice.toLocaleString('en-US')}₫
          </div>

          <div style={{ textAlign: 'right', font: '600 13px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
            {r.sellPrice.toLocaleString('en-US')}₫
          </div>

          <div style={{ textAlign: 'right', font: '600 13px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums', color: 'var(--down)' }}>
            {r.spreadVnd.toLocaleString('en-US')}₫
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <SparkHistory brand={r.brand as GoldBrand} goldType={r.goldType as GoldType} days={days}/>
          </div>
        </div>
      ))}
    </>
  );
}

export default function SpreadPage() {
  const router = useRouter();
  const [goldType, setGoldType] = useState<GoldType>('MIEN_SJC' as GoldType);
  const [days, setDays] = useState(7);

  const { data: ranking = [], isLoading } = useSpreadRanking(goldType);

  const chipStyle = (active: boolean): React.CSSProperties => ({
    height: 30, padding: '0 14px',
    background: active ? 'var(--gold)' : 'var(--ink-3)',
    border: `1px solid ${active ? 'var(--gold)' : 'var(--line)'}`,
    borderRadius: 6, cursor: 'pointer',
    font: '700 11px/1 var(--font-mono)', letterSpacing: '0.08em',
    color: active ? '#0B0B0F' : 'var(--bone)',
  });

  const bestSpread = ranking.find(r => r.isMostEfficient);
  const worstSpread = ranking.length > 0 ? ranking[ranking.length - 1] : null;
  const avgSpread = ranking.length > 0
    ? ranking.reduce((s, r) => s + r.spreadPct, 0) / ranking.length
    : null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', color: 'var(--chalk)', overflowX: 'hidden' }}>
    <div style={{ padding: '24px 28px 40px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <button
            onClick={() => router.back()}
            style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--mute)', font: '500 12px/1 var(--font-mono)', marginBottom: 12, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            ← Back
          </button>
          <h1 style={{ font: '800 36px/1 var(--font-display)', margin: 0, letterSpacing: '-0.025em' }}>spread ranking</h1>
          <p style={{ font: '400 14px/1.5 var(--font-display)', color: 'var(--mute)', margin: '8px 0 0', maxWidth: 480 }}>
            Compare buy/sell spreads across brands — lower spread = cheaper to trade.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {GOLD_TYPES.map(g => (
            <button key={g.value} style={chipStyle(goldType === g.value)} onClick={() => setGoldType(g.value)}>
              {g.label}
            </button>
          ))}
        </div>
        <div style={{ height: 20, width: 1, background: 'var(--hairline)' }}/>
        <div style={{ display: 'flex', gap: 6 }}>
          {DAY_OPTIONS.map(d => (
            <button key={d} style={chipStyle(days === d)} onClick={() => setDays(d)}>
              {d}D
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      {!isLoading && ranking.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { lbl: 'Most efficient', val: bestSpread ? `${bestSpread.brand} · ${bestSpread.spreadPct.toFixed(2)}%` : '—', tint: 'var(--gold)' },
            { lbl: 'Avg spread',     val: avgSpread != null ? `${avgSpread.toFixed(2)}%` : '—',                              tint: 'var(--chalk)' },
            { lbl: 'Widest spread',  val: worstSpread ? `${worstSpread.brand} · ${worstSpread.spreadPct.toFixed(2)}%` : '—', tint: 'var(--down)' },
          ].map(s => (
            <div key={s.lbl} style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 18 }}>
              <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>{s.lbl}</div>
              <div style={{ font: '700 20px/1 var(--font-display)', color: s.tint }}>{s.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Ranking table */}
      <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', overflowX: 'auto' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ font: '700 16px/1 var(--font-display)', margin: 0 }}>rankings</h3>
          <span className="mono" style={{ fontSize: 10, color: 'var(--mute)' }}>sorted by spread % · low = best</span>
        </div>

        {isLoading && (
          <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 80px 2fr 1.2fr 1.2fr 1fr 120px', gap: 12, alignItems: 'center' }}>
                {[28, 60, 200, 80, 80, 70, 120].map((w, j) => (
                  <div key={j} style={{ height: 14, width: w, borderRadius: 4, background: 'var(--ink-3)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
                ))}
              </div>
            ))}
          </div>
        )}

        {!isLoading && <RankingTable items={ranking} days={days}/>}
      </div>
    </div>
    </div>
  );
}
