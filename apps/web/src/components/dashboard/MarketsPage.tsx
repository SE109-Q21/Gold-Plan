'use client';

import { useState } from 'react';
import { usePriceHistory, type HistoryRange } from '@/lib/price.api';
import { useSpreadRanking } from '@/lib/spread.api';
import { LineChart } from '@/components/ui/ChartPrimitives';
import type { GoldBrand, GoldType } from '@gpls/shared';
import { useAuth } from '@/contexts/auth-context';

const ASSETS = ['XAU/USD', 'XAU/VND', 'SJC', 'DOJI', 'PNJ'] as const;
type Range = HistoryRange;
const RANGES: Range[] = ['1D', '1W', '1M', '3M', '1Y'];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const GOLD_TYPES: GoldType[] = ['MIEN_SJC', 'NHAN_9999', 'VANG_24K', 'VANG_18K'];

const TICKS_MOCK = [
  { t: '14:32:08', p: 2345.67, d: '+0.42', down: false },
  { t: '14:31:55', p: 2345.25, d: '+0.18', down: false },
  { t: '14:31:42', p: 2345.07, d: '−0.21', down: true  },
  { t: '14:31:29', p: 2345.28, d: '+0.34', down: false },
  { t: '14:31:16', p: 2344.94, d: '+0.12', down: false },
  { t: '14:31:03', p: 2344.82, d: '−0.08', down: true  },
];

function SpreadRankingSection() {
  const [goldType, setGoldType] = useState<GoldType>('MIEN_SJC');
  const [showTip, setShowTip] = useState(false);
  const { data, isLoading } = useSpreadRanking(goldType);

  const fmtSpread = (n: number) => (n / 1_000_000).toFixed(2) + 'M₫';
  const maxSpread = data && data.length > 0 ? Math.max(...data.map(d => d.spreadVnd)) : 1;

  const barColor = (index: number, isMostEfficient: boolean): string => {
    if (isMostEfficient) return 'var(--up)';
    if (index === 1) return 'var(--gold)';
    return 'var(--down)';
  };

  return (
    <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 22 }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ font: '700 16px/1 var(--font-display)', margin: 0 }}>spread ranking</h3>
        <span
          onMouseEnter={() => setShowTip(true)}
          onMouseLeave={() => setShowTip(false)}
          style={{ position: 'relative', cursor: 'help', font: '700 11px/1 var(--font-mono)', color: 'var(--mute)', background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          ?
          {showTip && (
            <span style={{ position: 'absolute', bottom: 'calc(100% + 6px)', right: 0, width: 220, background: 'var(--ink-4)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', font: '500 11px/1.5 var(--font-mono)', color: 'var(--chalk)', zIndex: 10, pointerEvents: 'none', whiteSpace: 'normal' }}>
              Spread is how much you lose if you buy and sell immediately. Smaller spread = less cost.
            </span>
          )}
        </span>
      </div>

      {/* Gold type selector */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, flexWrap: 'wrap' }}>
        {GOLD_TYPES.map(gt => (
          <button
            key={gt}
            onClick={() => setGoldType(gt)}
            style={{ display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 10px', border: `1px solid ${goldType === gt ? 'var(--gold)' : 'var(--line)'}`, borderRadius: 0, background: goldType === gt ? 'var(--gold)' : 'transparent', color: goldType === gt ? '#0B0B0F' : 'var(--bone)', font: '700 11px/1 var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            {gt}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ height: 12, width: 48, background: 'var(--ink-3)', borderRadius: 2, opacity: 0.6 }} />
                <div style={{ height: 12, width: 56, background: 'var(--ink-3)', borderRadius: 2, opacity: 0.6 }} />
              </div>
              <div style={{ height: 6, background: 'var(--ink-3)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${70 - i * 20}%`, background: 'var(--ink-4)', borderRadius: 2, opacity: 0.5 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!data || data.length === 0) && (
        <div style={{ padding: '24px 0', textAlign: 'center', font: '500 13px/1 var(--font-mono)', color: 'var(--mute)' }}>
          No data available
        </div>
      )}

      {/* Bar chart */}
      {!isLoading && data && data.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {data.map((item, i) => (
            <div key={item.brand}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ font: '700 12px/1 var(--font-mono)', color: item.isMostEfficient ? 'var(--up)' : 'var(--chalk)' }}>
                    {item.brand}
                  </span>
                  {item.isMostEfficient && (
                    <span style={{ font: '700 9px/1 var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(88,200,150,0.15)', color: 'var(--up)', border: '1px solid rgba(88,200,150,0.3)', borderRadius: 4, padding: '2px 6px' }}>
                      most efficient
                    </span>
                  )}
                </div>
                <span style={{ font: '700 12px/1 var(--font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--chalk)' }}>
                  {fmtSpread(item.spreadVnd)}
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--ink-3)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(item.spreadVnd / maxSpread) * 100}%`, background: barColor(i, item.isMostEfficient), borderRadius: 2, transition: 'width 0.3s ease' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MarketsPage() {
  const [range, setRange] = useState<Range>('1M');
  const [asset, setAsset] = useState('SJC');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const { user } = useAuth();

  const { data: history } = usePriceHistory('SJC' as GoldBrand, 'MIEN_SJC' as GoldType, range);
  const chartData = (history ?? []).map(p => p.buyPrice);
  const data = chartData.length > 1 ? chartData : [1970, 2050, 2120, 2200, 2250, 2310, 2345];
  const hoverVal = data[hoverIdx ?? data.length - 1];
  const change = data[data.length - 1] - data[0];
  const changePct = (change / data[0]) * 100;

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * (data.length - 1));
    setHoverIdx(Math.min(Math.max(i, 0), data.length - 1));
  }

  const fmt = (n: number) => (n / 1_000_000).toFixed(2) + 'M₫';

  return (
    <div style={{ padding: '24px 28px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ font: '800 36px/1 var(--font-display)', margin: 0, letterSpacing: '-0.025em' }}>markets</h1>
          <div className="mono" style={{ fontSize: 11, color: 'var(--mute)', marginTop: 8 }}>interactive chart · hover to inspect · auto-refresh 5 min during trading hours</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {ASSETS.map(a => (
          <button key={a} onClick={() => setAsset(a)} style={{ display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 14px', border: `1px solid ${asset === a ? 'var(--gold)' : 'var(--line)'}`, borderRadius: 0, background: asset === a ? 'var(--gold)' : 'transparent', color: asset === a ? '#0B0B0F' : 'var(--bone)', font: '700 11px/1 var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>{a}</button>
        ))}
      </div>

      <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>{asset} · 24K · spot</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <span style={{ font: '800 56px/0.95 var(--font-display)', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{fmt(hoverVal)}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: '700 14px/1 var(--font-mono)', color: change >= 0 ? 'var(--up)' : 'var(--down)', background: change >= 0 ? 'rgba(88,200,150,0.10)' : 'rgba(229,72,77,0.10)', padding: '7px 10px', borderRadius: 4 }}>
                {change >= 0 ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}% · {range}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {RANGES.map(r => (
              <button key={r} onClick={() => setRange(r)} style={{ display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 10px', border: `1px solid ${range === r ? 'var(--gold)' : 'var(--line)'}`, borderRadius: 0, background: range === r ? 'var(--gold)' : 'transparent', color: range === r ? '#0B0B0F' : 'var(--bone)', font: '700 11px/1 var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>{r}</button>
            ))}
            {user && (
              <button
                onClick={() => window.open(`${API_BASE}/prices/history/export?brand=SJC&goldType=MIEN_SJC&range=${range}`)}
                style={{ display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 10px', border: '1px solid var(--line)', borderRadius: 0, background: 'transparent', color: 'var(--mute)', font: '700 11px/1 var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', marginLeft: 8 }}
              >
                export csv
              </button>
            )}
          </div>
        </div>

        <div onMouseMove={onMove} onMouseLeave={() => setHoverIdx(null)} style={{ cursor: 'crosshair' }}>
          <LineChart data={data} w={920} h={340} hoverIdx={hoverIdx}/>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--hairline)' }}>
          {[
            { l: 'high', v: fmt(Math.max(...data)), tint: null },
            { l: 'low',  v: fmt(Math.min(...data)), tint: null },
            { l: 'σ vol', v: '1.84%', tint: 'var(--gold)' },
            { l: 'signal', v: 'buy bias', tint: 'var(--up)' },
          ].map((s, i) => (
            <div key={s.l} style={{ paddingLeft: i === 0 ? 0 : 20, borderLeft: i === 0 ? 'none' : '1px solid var(--hairline)' }}>
              <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>{s.l}</div>
              <div style={{ font: '700 18px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums', color: s.tint ?? 'var(--chalk)' }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <SpreadRankingSection />

        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 22 }}>
          <h3 style={{ font: '700 16px/1 var(--font-display)', margin: '0 0 14px' }}>recent ticks</h3>
          {TICKS_MOCK.map((r, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 90px', padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid var(--hairline)', font: '500 12px/1 var(--font-mono)' }}>
              <span style={{ color: 'var(--mute)' }}>{r.t}</span>
              <span style={{ font: '500 13px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>${r.p.toFixed(2)}</span>
              <span style={{ textAlign: 'right', color: r.down ? 'var(--down)' : 'var(--up)', fontWeight: 700 }}>{r.down ? '▼' : '▲'} {r.d}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
