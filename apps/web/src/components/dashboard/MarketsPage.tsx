'use client';

import { useState, useCallback } from 'react';
import { PriceChart } from '@/components/ui/PriceChart';
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { usePriceHistory, type HistoryRange } from '@/lib/price.api';
import { useSpreadRanking, useSpreadHistory } from '@/lib/spread.api';
import { useExchangeRates } from '@/lib/exchange-rate.api';
import type { GoldBrand, GoldType } from '@gpls/shared';
import { useAuth } from '@/contexts/auth-context';

const ASSETS = ['XAU/USD', 'XAU/VND', 'SJC', 'DOJI', 'PNJ'] as const;
type Range = HistoryRange;
const RANGES: Range[] = ['1D', '1W', '1M', '3M', '1Y'];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const GOLD_TYPES: GoldType[] = ['MIEN_SJC', 'NHAN_9999', 'VANG_24K', 'VANG_18K'];
const BRANDS: GoldBrand[] = ['SJC', 'DOJI', 'PNJ', 'BAO_TIN'];


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

      {!isLoading && (!data || data.length === 0) && (
        <div style={{ padding: '24px 0', textAlign: 'center', font: '500 13px/1 var(--font-mono)', color: 'var(--mute)' }}>
          No data available
        </div>
      )}

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

function SpreadHistoryChart() {
  const [brand, setBrand] = useState<GoldBrand>('SJC');
  const [goldType, setGoldType] = useState<GoldType>('MIEN_SJC');
  const { data, isLoading } = useSpreadHistory(brand, goldType, 7);

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}`;
  };

  const chartData = (data ?? []).map((pt) => ({
    date: fmtDate(pt.recordedAt),
    spreadVnd: pt.spreadVnd,
    spreadPct: pt.spreadPct,
  }));

  const fmtVnd = (v: number) => (v / 1_000_000).toFixed(2) + 'M';

  return (
    <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 22 }}>
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ font: '700 16px/1 var(--font-display)', margin: '0 0 4px' }}>7-day spread trend</h3>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        {BRANDS.map(b => (
          <button
            key={b}
            onClick={() => setBrand(b)}
            style={{ display: 'inline-flex', alignItems: 'center', height: 28, padding: '0 8px', border: `1px solid ${brand === b ? 'var(--gold)' : 'var(--line)'}`, borderRadius: 0, background: brand === b ? 'var(--gold)' : 'transparent', color: brand === b ? '#0B0B0F' : 'var(--bone)', font: '700 10px/1 var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            {b}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 18, flexWrap: 'wrap' }}>
        {GOLD_TYPES.map(gt => (
          <button
            key={gt}
            onClick={() => setGoldType(gt)}
            style={{ display: 'inline-flex', alignItems: 'center', height: 28, padding: '0 8px', border: `1px solid ${goldType === gt ? 'var(--gold)' : 'var(--line)'}`, borderRadius: 0, background: goldType === gt ? 'var(--gold)' : 'transparent', color: goldType === gt ? '#0B0B0F' : 'var(--bone)', font: '700 10px/1 var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            {gt}
          </button>
        ))}
      </div>

      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
          {[80, 55, 70].map((w, i) => (
            <div
              key={i}
              style={{ height: 14, width: `${w}%`, background: 'var(--ink-3)', borderRadius: 3, opacity: 0.55 }}
            />
          ))}
        </div>
      )}

      {!isLoading && (!chartData || chartData.length === 0) && (
        <div style={{ padding: '32px 0', textAlign: 'center', font: '500 13px/1 var(--font-mono)', color: 'var(--mute)' }}>
          No data available
        </div>
      )}

      {!isLoading && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={200}>
          <ReLineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#5a5b65', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={fmtVnd}
              tick={{ fill: '#5a5b65', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              width={52}
              label={{ value: 'Spread (₫)', angle: -90, position: 'insideLeft', offset: 12, style: { fill: '#5a5b65', fontSize: 9, fontFamily: 'var(--font-mono)' } }}
            />
            <Tooltip
              contentStyle={{ background: '#14141A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, font: '500 11px/1.5 var(--font-mono)', color: '#e8e6df' }}
              formatter={(value) => [typeof value === 'number' ? (value / 1_000_000).toFixed(3) + 'M₫' : '-', 'spread']}
              labelStyle={{ color: '#5a5b65', marginBottom: 4 }}
            />
            <Line
              type="monotone"
              dataKey="spreadVnd"
              stroke="#D4AF37"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#D4AF37', stroke: '#0B0B0F', strokeWidth: 2 }}
            />
          </ReLineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function MarketsPage({ currency = 'VND' }: { currency?: string }) {
  const [range, setRange] = useState<Range>('1M');
  const [asset, setAsset] = useState('SJC');
  const [hoverPrice, setHoverPrice] = useState<number | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const { user, getAccessToken } = useAuth();
  const { data: rates } = useExchangeRates();

  const handleExportCsv = useCallback(async () => {
    setCsvLoading(true);
    try {
      const token = getAccessToken();
      const url = `${API_BASE}/api/prices/history/export?brand=SJC&goldType=MIEN_SJC&range=${range}`;
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `gold-history-SJC-${range}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // silently ignore
    } finally {
      setCsvLoading(false);
    }
  }, [range, getAccessToken]);

  const { data: history } = usePriceHistory('SJC' as GoldBrand, 'MIEN_SJC' as GoldType, range);
  const { data: history1D } = usePriceHistory('SJC' as GoldBrand, 'MIEN_SJC' as GoldType, '1D');
  const chartData = (history ?? []).map(p => p.buyPrice);
  const data = chartData.length > 1 ? chartData : [1970, 2050, 2120, 2200, 2250, 2310, 2345];
  const hoverVal = hoverPrice ?? data[data.length - 1];
  const change = data[data.length - 1] - data[0];
  const changePct = (change / data[0]) * 100;

  const ticks = (() => {
    if (!history1D || history1D.length < 2) return [];
    const slice = history1D.slice(-6);
    return slice.map((pt, i) => {
      const prev = slice[Math.max(0, i - 1)];
      const diff = pt.buyPrice - prev.buyPrice;
      const d = new Date(pt.recordedAt);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return {
        t: `${hh}:${mm}:${ss}`,
        p: pt.buyPrice,
        diff,
        down: diff < 0,
      };
    });
  })();

  const vol = (() => {
    if (chartData.length < 3) return null;
    const returns = chartData.slice(1).map((p, i) => (p - chartData[i]) / chartData[i]);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length;
    return (Math.sqrt(variance) * 100).toFixed(2) + '%';
  })();

  const fmt = (vnd: number): string => {
    if (currency === 'USD' && rates) return '$' + (vnd / rates.usdVnd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (currency === 'EUR' && rates) return '€' + (vnd / rates.eurVnd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (vnd / 1_000_000).toFixed(2) + 'M₫';
  };

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
                onClick={handleExportCsv}
                disabled={csvLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 10px', border: '1px solid var(--line)', borderRadius: 0, background: 'transparent', color: csvLoading ? 'var(--mute)' : 'var(--bone)', font: '700 11px/1 var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: csvLoading ? 'not-allowed' : 'pointer', marginLeft: 8, opacity: csvLoading ? 0.6 : 1 }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {csvLoading ? '…' : 'csv'}
              </button>
            )}
          </div>
        </div>

        <PriceChart history={history ?? []} range={range} onHoverPrice={setHoverPrice}/>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--hairline)' }}>
          {[
            { l: 'σ Vol',  v: vol ?? '—',   tint: 'var(--gold)' },
            { l: 'Signal', v: 'Buy bias', tint: 'var(--up)'   },
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
          <h3 style={{ font: '700 16px/1 var(--font-display)', margin: '0 0 14px' }}>recent prices</h3>
          {ticks.length === 0 && (
            <div style={{ padding: '24px 0', textAlign: 'center', font: '500 12px/1 var(--font-mono)', color: 'var(--mute)' }}>loading…</div>
          )}
          {ticks.map((r, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 90px', padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid var(--hairline)', font: '500 12px/1 var(--font-mono)' }}>
              <span style={{ color: 'var(--mute)' }}>{r.t}</span>
              <span style={{ font: '500 13px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.p)}</span>
              <span style={{ textAlign: 'right', color: r.down ? 'var(--down)' : 'var(--up)', fontWeight: 700 }}>{r.down ? '▼' : '▲'} {(r.diff >= 0 ? '+' : '') + fmt(Math.abs(r.diff))}</span>
            </div>
          ))}
        </div>
      </div>

      <SpreadHistoryChart />
    </div>
  );
}
