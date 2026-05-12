'use client';

import { useState } from 'react';
import { useInternationalPrice, useDomesticPrices, usePriceHistory, useComparison } from '@/lib/price.api';
import { LineChart, Sparkline } from '@/components/ui/ChartPrimitives';
import { IconPlus } from '@/components/dashboard/DashboardShell';
import type { GoldType } from '@gpls/shared';

const RANGE_LABELS = ['1D', '1W', '1M'] as const;
type Range = '1D' | '1W' | '1M';

const KARAT_MOCK = [
  { karat: '24K', pct: 99.9, change: '+1.21%', dir: 'up' as const, spark: [12,14,13,15,17,16,19,21,22,24,23,26] },
  { karat: '22K', pct: 91.6, change: '+1.18%', dir: 'up' as const, spark: [10,11,13,12,14,15,14,17,18,17,19,21] },
  { karat: '18K', pct: 75.0, change: '+0.94%', dir: 'up' as const, spark: [8,9,8,10,9,11,12,11,13,12,14,15] },
];

const ALERT_MOCK = [
  { karat: '24K', cond: '≥', target: '$2,400.00', fired: false },
  { karat: '24K', cond: '≤', target: '$2,280.00', fired: false },
  { karat: '22K', cond: '≤', target: '71,500,000₫', fired: true },
];

function fmtVnd(n: number) { return (n / 1_000_000).toFixed(2) + 'M₫'; }
function fmtUsd(n: number) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export function OverviewPage({ currency, onNavigateAlerts }: { currency: string; onNavigateAlerts: () => void }) {
  const [range, setRange] = useState<Range>('1M');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { data: intl } = useInternationalPrice();
  const { data: domestic } = useDomesticPrices();
  const { data: history } = usePriceHistory('SJC', 'MIEN_SJC', range);
  const { data: comparison } = useComparison('MIEN_SJC' as GoldType);

  const chartData = (history ?? []).map(p => p.buyPrice);
  const displayData = chartData.length > 1 ? chartData : [2280, 2295, 2310, 2325, 2345];

  function onChartMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const i = Math.round((x / rect.width) * (displayData.length - 1));
    setHoverIdx(Math.min(Math.max(i, 0), displayData.length - 1));
  }

  const hoverVal = hoverIdx !== null ? displayData[hoverIdx] : displayData[displayData.length - 1];
  const priceHigh = Math.max(...displayData);
  const priceLow = Math.min(...displayData);

  // Comparison brands
  const compBrands = comparison?.[0]?.brands ?? [];
  // Fall back to domestic prices for brand spreads (unused but kept for future)
  void domestic;

  return (
    <div style={{ padding: '24px 28px 40px', display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
      {/* ── Left column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

        {/* Hero price card */}
        <div className="gt-card" style={{
          background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14,
          padding: '26px 28px 22px', overflow: 'hidden',
          clipPath: 'polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <span className="stamp">XAU/USD · london spot · 24K</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--mute)' }}>
              {intl ? 'live' : 'loading…'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 32 }}>
            <div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>spot · per troy oz</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ font: '800 76px/0.95 var(--font-display)', letterSpacing: '-0.035em', fontVariantNumeric: 'tabular-nums' }}>
                  ${intl ? Math.floor(intl.spotPriceUsd).toLocaleString() : '2,345'}
                </span>
                <span style={{ font: '800 44px/1 var(--font-display)', color: 'var(--gold)', fontVariantNumeric: 'tabular-nums' }}>
                  .{intl ? String(Math.round(intl.spotPriceUsd * 100) % 100).padStart(2, '0') : '67'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: '700 14px/1 var(--font-mono)', color: 'var(--up)', background: 'rgba(88,200,150,0.10)', padding: '7px 10px', borderRadius: 4 }}>
                  <svg width="11" height="11" viewBox="0 0 10 10"><path d="M5 1l4 6H1z" fill="var(--up)"/></svg>
                  +1.21%
                </span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--mute)' }}>24h</span>
              </div>
            </div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: 14, background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 10 }}>
                <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>per tael · vnd</div>
                <div style={{ font: '700 22px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
                  {intl ? (intl.spotPriceVnd / 1_000_000).toFixed(2) : '78.92'}<span style={{ color: 'var(--mute)', fontSize: 14, marginLeft: 4 }}>M₫</span>
                </div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--up)', marginTop: 6 }}>+0.15%</div>
              </div>
              <div style={{ padding: 14, background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 10 }}>
                <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>usd / vnd</div>
                <div style={{ font: '700 22px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
                  {intl ? intl.exchangeRate.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '24,815'}
                </div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--down)', marginTop: 6 }}>−0.04%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chart card */}
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ font: '700 18px/1 var(--font-display)', margin: 0, letterSpacing: '-0.01em' }}>price history</h3>
              <div className="mono" style={{ fontSize: 11, color: 'var(--mute)', marginTop: 6 }}>
                SJC Miếng · <span style={{ color: 'var(--chalk)' }}>{fmtVnd(hoverVal)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {RANGE_LABELS.map(r => (
                <button key={r} onClick={() => setRange(r)} style={{
                  display: 'inline-flex', alignItems: 'center', height: 30, padding: '0 10px',
                  border: `1px solid ${range === r ? 'var(--gold)' : 'var(--line)'}`,
                  borderRadius: 0, background: range === r ? 'var(--gold)' : 'transparent',
                  color: range === r ? '#0B0B0F' : 'var(--bone)',
                  font: '700 11px/1 var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase',
                  cursor: 'pointer',
                }}>{r}</button>
              ))}
            </div>
          </div>
          <div onMouseMove={onChartMove} onMouseLeave={() => setHoverIdx(null)} style={{ cursor: 'crosshair' }}>
            <LineChart data={displayData} w={720} h={260} hoverIdx={hoverIdx}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--hairline)' }}>
            {[
              { lbl: 'high', val: fmtVnd(priceHigh), tint: null },
              { lbl: 'low', val: fmtVnd(priceLow), tint: null },
              { lbl: 'signal', val: 'buy bias', tint: 'var(--up)' },
              { lbl: 'range', val: range, tint: 'var(--gold)' },
            ].map((s, i) => (
              <div key={s.lbl} style={{ paddingLeft: i === 0 ? 0 : 18, borderLeft: i === 0 ? 'none' : '1px solid var(--hairline)' }}>
                <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>{s.lbl}</div>
                <div style={{ font: '700 18px/1 var(--font-display)', color: s.tint || 'var(--chalk)', fontVariantNumeric: 'tabular-nums' }}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Brand spreads table */}
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--hairline)' }}>
            <h3 style={{ font: '700 18px/1 var(--font-display)', margin: 0, letterSpacing: '-0.01em' }}>domestic brand spreads</h3>
            <span className="mono" style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>vnd per tael · best highlighted</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '12px 24px', font: '700 10px/1 var(--font-mono)', color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', background: 'var(--ink-3)', borderBottom: '1px solid var(--hairline)' }}>
            <span>brand</span><span style={{ textAlign: 'right' }}>buy</span><span style={{ textAlign: 'right' }}>sell</span><span style={{ textAlign: 'right' }}>spread</span>
          </div>
          {(compBrands.length > 0 ? compBrands : [
            { brand: 'SJC', buyPrice: 76420000, sellPrice: 78920000, isBestBuy: false, isBestSell: false },
            { brand: 'DOJI', buyPrice: 76300000, sellPrice: 78700000, isBestBuy: true, isBestSell: true },
          ]).map((b, i) => (
            <div key={b.brand} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '16px 24px', alignItems: 'center', borderTop: i === 0 ? 'none' : '1px solid var(--hairline)', background: b.isBestBuy ? 'rgba(212,175,55,0.04)' : 'transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--ink-3)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 11px/1 var(--font-mono)', color: 'var(--gold)', letterSpacing: '0.06em' }}>{b.brand.slice(0, 2)}</div>
                <div style={{ font: '700 14px/1.1 var(--font-display)' }}>{b.brand}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ font: '700 15px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{fmtVnd(b.buyPrice)}</div>
                {b.isBestBuy && <div className="mono" style={{ fontSize: 9, color: 'var(--up)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>▲ best</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ font: '700 15px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums', color: b.isBestSell ? 'var(--gold)' : 'var(--chalk)' }}>{fmtVnd(b.sellPrice)}</div>
                {b.isBestSell && <div className="mono" style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>▼ lowest</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {((b.sellPrice - b.buyPrice) / 1_000_000).toFixed(2)}M
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

        {/* Karat strip */}
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <h3 style={{ font: '700 16px/1 var(--font-display)', margin: 0 }}>by karat</h3>
            <span className="mono" style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>per oz · usd</span>
          </div>
          {KARAT_MOCK.map((k, i) => {
            const multipliers: Record<string, number> = { '24K': 1, '22K': 0.916, '18K': 0.75 };
            const price = intl ? intl.spotPriceUsd * (multipliers[k.karat] ?? 1) : 0;
            return (
              <div key={k.karat} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 80px 60px', alignItems: 'center', gap: 12, padding: '14px 0', borderTop: i === 0 ? 'none' : '1px solid var(--hairline)' }}>
                <div style={{ font: '800 18px/1 var(--font-display)', color: 'var(--gold)', letterSpacing: '-0.02em' }}>{k.karat}</div>
                <div>
                  <div style={{ font: '700 20px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{price > 0 ? fmtUsd(price) : '…'}</div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--mute)', marginTop: 4 }}>{k.pct}% purity</div>
                </div>
                <Sparkline data={k.spark} w={80} h={28} dir={k.dir}/>
                <div className="mono" style={{ fontSize: 11, color: 'var(--up)', textAlign: 'right', fontWeight: 700 }}>{k.change}</div>
              </div>
            );
          })}
        </div>

        {/* Market heat */}
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <h3 style={{ font: '700 16px/1 var(--font-display)', margin: 0 }}>market heat</h3>
            <span className="mono" style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>hot</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <svg width="120" height="76" viewBox="0 0 120 76">
              <path d="M10 66 A50 50 0 0 1 110 66" stroke="#22232B" strokeWidth="8" fill="none" strokeLinecap="round"/>
              <path d="M10 66 A50 50 0 0 1 102 32" stroke="#D4AF37" strokeWidth="8" fill="none" strokeLinecap="round"/>
              <circle cx="102" cy="32" r="7" fill="#D4AF37" stroke="#0B0B0F" strokeWidth="2"/>
            </svg>
            <div>
              <div style={{ font: '800 44px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>72</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>/ 100 · accumulating</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--hairline)' }}>
            {[{ l: 'volume', v: '+18%' }, { l: 'spread', v: '2.4M' }, { l: 'sentiment', v: '64↑' }].map(s => (
              <div key={s.l}>
                <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>{s.l}</div>
                <div style={{ font: '700 16px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts widget */}
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <h3 style={{ font: '700 16px/1 var(--font-display)', margin: 0 }}>your alerts</h3>
            <button onClick={onNavigateAlerts} style={{ background: 'transparent', border: 0, cursor: 'pointer', font: '700 11px/1 var(--font-mono)', color: 'var(--gold)', letterSpacing: '0.08em' }}>view all →</button>
          </div>
          {ALERT_MOCK.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--hairline)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', padding: '3px 6px', border: '1px solid var(--gold)', borderRadius: 3 }}>{a.karat}</span>
                <span style={{ font: '500 13px/1 var(--font-mono)', color: 'var(--bone)' }}>{a.cond}</span>
                <span style={{ font: '700 14px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{a.target}</span>
              </div>
              <span style={{ font: '700 9px/1 var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: a.fired ? '#0B0B0F' : 'var(--mute)', background: a.fired ? 'var(--gold)' : 'transparent', border: `1px solid ${a.fired ? 'var(--gold)' : 'var(--line)'}`, padding: '4px 7px', borderRadius: 3 }}>
                {a.fired ? 'fired' : 'waiting'}
              </span>
            </div>
          ))}
          <button style={{ width: '100%', height: 44, marginTop: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--gold)', color: '#0B0B0F', border: '1px solid var(--gold)', borderRadius: 10, cursor: 'pointer', font: '700 14px/1 var(--font-mono)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            <IconPlus s={15}/> new alert
          </button>
        </div>
      </div>
    </div>
  );
}
