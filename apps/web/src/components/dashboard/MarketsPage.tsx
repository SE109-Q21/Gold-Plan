'use client';

import { useState } from 'react';
import { usePriceHistory } from '@/lib/price.api';
import { LineChart } from '@/components/ui/ChartPrimitives';
import type { GoldBrand, GoldType } from '@gpls/shared';

const ASSETS = ['XAU/USD', 'XAU/VND', 'SJC', 'DOJI', 'PNJ'] as const;
type Range = '1D' | '1W' | '1M';
const RANGES: Range[] = ['1D', '1W', '1M'];

const BRANDS_MOCK = [
  { code: 'SJC',  name: 'SJC',           buy: 76420000, sell: 78920000 },
  { code: 'DOJI', name: 'DOJI',          buy: 76300000, sell: 78700000 },
  { code: 'PNJ',  name: 'PNJ',           buy: 76250000, sell: 78650000 },
  { code: 'BTMC', name: 'Bảo Tín',       buy: 76180000, sell: 78510000 },
];

const TICKS_MOCK = [
  { t: '14:32:08', p: 2345.67, d: '+0.42', down: false },
  { t: '14:31:55', p: 2345.25, d: '+0.18', down: false },
  { t: '14:31:42', p: 2345.07, d: '−0.21', down: true  },
  { t: '14:31:29', p: 2345.28, d: '+0.34', down: false },
  { t: '14:31:16', p: 2344.94, d: '+0.12', down: false },
  { t: '14:31:03', p: 2344.82, d: '−0.08', down: true  },
];

export function MarketsPage() {
  const [range, setRange] = useState<Range>('1M');
  const [asset, setAsset] = useState('SJC');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

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
          <div style={{ display: 'flex', gap: 4 }}>
            {RANGES.map(r => (
              <button key={r} onClick={() => setRange(r)} style={{ display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 10px', border: `1px solid ${range === r ? 'var(--gold)' : 'var(--line)'}`, borderRadius: 0, background: range === r ? 'var(--gold)' : 'transparent', color: range === r ? '#0B0B0F' : 'var(--bone)', font: '700 11px/1 var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>{r}</button>
            ))}
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
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 22 }}>
          <h3 style={{ font: '700 16px/1 var(--font-display)', margin: '0 0 14px' }}>spread ranking</h3>
          {BRANDS_MOCK.slice().sort((a, b) => (a.sell - a.buy) - (b.sell - b.buy)).map((b, i) => {
            const spread = b.sell - b.buy;
            const pct = (spread / 3000000) * 100;
            return (
              <div key={b.code} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? 'var(--gold)' : 'var(--chalk)' }}>{i + 1}. {b.name}</span>
                  <span style={{ font: '700 13px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{(spread / 1_000_000).toFixed(2)}M₫</span>
                </div>
                <div style={{ height: 6, background: 'var(--ink-3)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: i === 0 ? 'var(--gold)' : 'var(--ink-4)' }}/>
                </div>
              </div>
            );
          })}
        </div>

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
