'use client';

import { useState, useRef, useEffect } from 'react';
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
        <h3 style={{ font: '700 16px/1 var(--font-display)', margin: '0 0 4px' }}>xu hướng chênh lệch 7 ngày</h3>
        <div style={{ font: '500 10px/1 var(--font-mono)', color: 'var(--mute)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          7-day spread trend
        </div>
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
          Chưa có dữ liệu
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
              label={{ value: 'Chênh lệch (₫)', angle: -90, position: 'insideLeft', offset: 12, style: { fill: '#5a5b65', fontSize: 9, fontFamily: 'var(--font-mono)' } }}
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

// ── Enhanced price chart ────────────────────────────────────────────────────
type PricePoint = { buyPrice: number; recordedAt: string };

const PC_W = 920, PC_H = 320;
const PC_PAD = { l: 52, r: 12, t: 16, b: 32 };
const PC_IW = PC_W - PC_PAD.l - PC_PAD.r;
const PC_IH = PC_H - PC_PAD.t - PC_PAD.b;

function PriceChart({ history, range, onHoverPrice }: {
  history: PricePoint[];
  range: string;
  onHoverPrice: (p: number | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIdx,   setHoverIdx]   = useState<number | null>(null);
  const [showMA,     setShowMA]     = useState(false);
  const [zoomWindow, setZoomWindow] = useState<[number, number] | null>(null);
  const [touchPinned, setTouchPinned] = useState(false);

  // Stable refs for the non-React wheel/pinch handlers (avoids stale closures)
  const zoomRef = useRef(zoomWindow); zoomRef.current = zoomWindow;
  const histRef = useRef(history);   histRef.current = history;

  // Reset zoom + hover when range or data length changes
  useEffect(() => {
    setZoomWindow(null);
    setHoverIdx(null);
    setTouchPinned(false);
    onHoverPrice(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, history.length]);

  // Non-passive wheel + pinch-zoom listeners (can't use JSX for non-passive)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function applyZoom(clientX: number, factor: number) {
      const hist = histRef.current;
      const [s, en] = zoomRef.current ?? [0, hist.length - 1];
      const rect = el!.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, ((clientX - rect.left) * (PC_W / rect.width) - PC_PAD.l) / PC_IW));
      const ctr  = Math.round(s + frac * (en - s));
      const newLen = Math.round((en - s + 1) * factor);
      const clamped = Math.min(hist.length, Math.max(Math.min(10, hist.length), newLen));
      let ns = Math.max(0, ctr - Math.floor(clamped / 2));
      let ne = ns + clamped - 1;
      if (ne >= hist.length) { ne = hist.length - 1; ns = Math.max(0, ne - clamped + 1); }
      setZoomWindow(ne - ns + 1 >= hist.length ? null : [ns, ne]);
    }

    let pinchDist: number | null = null;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); applyZoom(e.clientX, e.deltaY > 0 ? 1.18 : 0.85); };
    const onTouchStart2 = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDist = Math.sqrt(dx * dx + dy * dy);
    };
    const onTouchMove2 = (e: TouchEvent) => {
      if (e.touches.length !== 2 || pinchDist === null) return;
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const d = Math.sqrt(dx * dx + dy * dy);
      applyZoom((e.touches[0].clientX + e.touches[1].clientX) / 2, pinchDist / d);
      pinchDist = d;
    };
    el.addEventListener('wheel',      onWheel,       { passive: false });
    el.addEventListener('touchstart', onTouchStart2, { passive: true  });
    el.addEventListener('touchmove',  onTouchMove2,  { passive: false });
    return () => {
      el.removeEventListener('wheel',      onWheel);
      el.removeEventListener('touchstart', onTouchStart2);
      el.removeEventListener('touchmove',  onTouchMove2);
    };
  }, []);

  // Visible slice (may be zoomed)
  const [visStart, visEnd] = zoomWindow ?? [0, Math.max(0, history.length - 1)];
  const visible = history.slice(visStart, visEnd + 1);
  const prices  = visible.map(p => p.buyPrice);

  if (prices.length < 2) {
    return (
      <div style={{ height: PC_H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mute)', font: '500 12px/1 var(--font-mono)' }}>
        Loading price history…
      </div>
    );
  }

  // Scale helpers
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const pad4 = (maxP - minP || 1) * 0.04;
  const minV = minP - pad4, maxV = maxP + pad4, vR = maxV - minV;
  const xS = (i: number) => PC_PAD.l + (prices.length <= 1 ? PC_IW / 2 : (i / (prices.length - 1)) * PC_IW);
  const yS = (v: number) => PC_PAD.t + PC_IH * (1 - (v - minV) / vR);

  // Paths
  const linePath = prices.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xS(i).toFixed(1)} ${yS(v).toFixed(1)}`).join(' ');
  const fillPath = `${linePath} L ${xS(prices.length - 1).toFixed(1)} ${(PC_PAD.t + PC_IH).toFixed(1)} L ${xS(0).toFixed(1)} ${(PC_PAD.t + PC_IH).toFixed(1)} Z`;

  // 7-period SMA
  const SMA_N = 7;
  const smaVals: (number | null)[] = prices.map((_, i) => {
    if (i < SMA_N - 1) return null;
    const sl = prices.slice(i - SMA_N + 1, i + 1);
    return sl.reduce((a, b) => a + b, 0) / SMA_N;
  });
  const smaPath = smaVals.reduce((acc, v, i) => {
    if (v === null) return acc;
    return acc + `${(i === 0 || smaVals[i - 1] === null) ? 'M' : 'L'} ${xS(i).toFixed(1)} ${yS(v).toFixed(1)} `;
  }, '');

  // Y grid (3 lines)
  const yGrid = [0.25, 0.5, 0.75].map(p => minV + vR * p);

  // X-axis labels: up to 6 evenly spaced
  const xLabelCount = Math.min(6, prices.length);
  const xLabelIdxs  = xLabelCount <= 1 ? [0] : Array.from({ length: xLabelCount }, (_, k) =>
    Math.round((k / (xLabelCount - 1)) * (prices.length - 1))
  );
  function fmtXLabel(iso: string): string {
    const d = new Date(iso);
    if (range === '1D') return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    if (range === '1W') return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    if (range === '1Y') return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  }

  // Today vertical marker (skip 1D — the whole chart is today)
  const today = new Date();
  const todayIdx = range !== '1D' ? visible.findIndex(pt => {
    const d = new Date(pt.recordedAt);
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  }) : -1;

  // Mouse / touch → data index
  function clientXToIdx(clientX: number): number {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const svgX = (clientX - rect.left) * (PC_W / rect.width);
    return Math.min(Math.max(Math.round(((svgX - PC_PAD.l) / PC_IW) * (prices.length - 1)), 0), prices.length - 1);
  }
  function doHover(idx: number | null) { setHoverIdx(idx); onHoverPrice(idx !== null ? prices[idx] : null); }
  function handleMouseMove(e: React.MouseEvent) { if (!touchPinned) doHover(clientXToIdx(e.clientX)); }
  function handleMouseLeave() { if (!touchPinned) doHover(null); }
  function handleTouchStartJSX(e: React.TouchEvent) {
    if (e.touches.length !== 1) return;
    const idx = clientXToIdx(e.touches[0].clientX);
    if (touchPinned && hoverIdx === idx) { setTouchPinned(false); doHover(null); }
    else { setTouchPinned(true); doHover(idx); }
  }
  function handleTouchMoveJSX(e: React.TouchEvent) {
    if (e.touches.length === 1 && !touchPinned) doHover(clientXToIdx(e.touches[0].clientX));
  }

  // Period summary values
  const open   = visible[0].buyPrice;
  const close  = visible[visible.length - 1].buyPrice;
  const high   = Math.max(...prices);
  const low    = Math.min(...prices);
  const pDelta = close - open;
  const pDeltaPct = open !== 0 ? (pDelta / open) * 100 : 0;
  const fmt = (n: number) => (n / 1_000_000).toFixed(2) + 'M₫';

  // Tooltip values
  // Clamp hover index to current visible length — prevents stale index after zoom
  const safeIdx    = hoverIdx !== null ? Math.min(hoverIdx, prices.length - 1) : null;
  const tp         = safeIdx !== null ? visible[safeIdx] : null;
  const tpPrice    = tp?.buyPrice ?? 0;
  const tpPrevPt   = safeIdx !== null && safeIdx > 0 ? visible[safeIdx - 1] : null;
  const tpPrev     = tpPrevPt?.buyPrice ?? null;
  const tpDelta    = tpPrev !== null ? tpPrice - tpPrev : null;
  const tpDeltaPct = tpPrev ? ((tpPrice - tpPrev) / tpPrev) * 100 : null;
  function fmtDT(iso: string) {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }
  const ttXPct = safeIdx !== null ? (xS(safeIdx) / PC_W) * 100 : 0;

  return (
    <div>
      {/* ── Period summary bar ─────────────────────────────────── */}
      <div style={{ display: 'flex', marginBottom: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--hairline)', borderRadius: 8 }}>
        {[
          { l: 'Open',   v: fmt(open),  c: null },
          { l: 'Close',  v: fmt(close), c: null },
          { l: 'Change',
            v: `${pDelta >= 0 ? '+' : ''}${(pDelta / 1_000_000).toFixed(2)}M₫ (${pDeltaPct >= 0 ? '+' : ''}${pDeltaPct.toFixed(2)}%)`,
            c: pDelta >= 0 ? 'var(--up)' : 'var(--down)' },
          { l: 'High',   v: fmt(high),  c: null },
          { l: 'Low',    v: fmt(low),   c: null },
        ].map((s, i) => (
          <div key={s.l} style={{ flex: 1, padding: '10px 12px', borderLeft: i === 0 ? 'none' : '1px solid var(--hairline)', minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>{s.l}</div>
            <div style={{ font: '600 12px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums', color: s.c ?? 'var(--chalk)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* ── Controls row ───────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <button
          onClick={() => setShowMA(v => !v)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 10px', border: `1px solid ${showMA ? 'rgba(147,197,253,0.5)' : 'var(--line)'}`, borderRadius: 4, background: showMA ? 'rgba(147,197,253,0.08)' : 'transparent', color: showMA ? '#93c5fd' : 'var(--mute)', font: '700 10px/1 var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 140ms' }}
        >
          <span style={{ display: 'inline-block', width: 16, height: 1.5, background: showMA ? '#93c5fd' : 'var(--mute)', borderRadius: 1 }}/>
          7D MA
        </button>
        {showMA && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, font: '500 10px/1 var(--font-mono)', color: 'var(--mute)' }}>
              <span style={{ display: 'inline-block', width: 18, height: 2, background: 'linear-gradient(90deg,#8E7321,#D4AF37)', borderRadius: 1 }}/>
              Price
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, font: '500 10px/1 var(--font-mono)', color: 'rgba(147,197,253,0.8)' }}>
              <span style={{ display: 'inline-block', width: 18, borderTop: '1.5px dashed rgba(147,197,253,0.65)' }}/>
              7D SMA
            </span>
          </div>
        )}
        {zoomWindow && (
          <button
            onClick={() => { setZoomWindow(null); doHover(null); setTouchPinned(false); }}
            style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, height: 26, padding: '0 10px', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 4, background: 'transparent', color: 'var(--gold)', font: '700 10px/1 var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            ↺ Reset zoom
          </button>
        )}
      </div>

      {/* ── SVG chart + tooltip overlay ────────────────────────── */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStartJSX}
        onTouchMove={handleTouchMoveJSX}
        style={{ position: 'relative', cursor: 'crosshair', touchAction: 'none', userSelect: 'none' } as React.CSSProperties}
      >
        <svg viewBox={`0 0 ${PC_W} ${PC_H}`} style={{ display: 'block', width: '100%', height: 'auto' }}>
          <defs>
            <linearGradient id="pcFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#D4AF37" stopOpacity="0.28"/>
              <stop offset="100%" stopColor="#D4AF37" stopOpacity="0"/>
            </linearGradient>
            <linearGradient id="pcStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#8E7321"/>
              <stop offset="20%"  stopColor="#D4AF37"/>
              <stop offset="80%"  stopColor="#E8C76B"/>
              <stop offset="100%" stopColor="#D4AF37"/>
            </linearGradient>
            <clipPath id="pcClip">
              <rect x={PC_PAD.l} y={0} width={PC_IW} height={PC_H}/>
            </clipPath>
          </defs>

          {/* Y grid + labels */}
          {yGrid.map((v, i) => (
            <g key={i}>
              <line x1={PC_PAD.l} x2={PC_W - PC_PAD.r} y1={yS(v)} y2={yS(v)} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
              <text x={PC_PAD.l - 5} y={yS(v) + 3.5} textAnchor="end" fill="#3e3f4c" fontSize={9} fontFamily="var(--font-mono)">{(v / 1_000_000).toFixed(2)}</text>
            </g>
          ))}

          {/* X axis labels */}
          {xLabelIdxs.map((idx, k) => (
            <text key={k} x={xS(idx)} y={PC_H - 4} textAnchor="middle" fill="#3e3f4c" fontSize={9} fontFamily="var(--font-mono)">
              {fmtXLabel(visible[idx].recordedAt)}
            </text>
          ))}

          {/* Today dotted vertical line */}
          {todayIdx >= 0 && (
            <line x1={xS(todayIdx)} x2={xS(todayIdx)} y1={PC_PAD.t} y2={PC_PAD.t + PC_IH} stroke="rgba(212,175,55,0.25)" strokeWidth="1" strokeDasharray="3 6"/>
          )}

          {/* Chart (clipped) */}
          <g clipPath="url(#pcClip)">
            <path d={fillPath} fill="url(#pcFill)"/>
            <path d={linePath} fill="none" stroke="url(#pcStroke)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            {showMA && smaPath && (
              <path d={smaPath} fill="none" stroke="#93c5fd" strokeWidth="1.25" strokeDasharray="5 3" opacity="0.65"/>
            )}
          </g>

          {/* Crosshair + dot */}
          {safeIdx !== null && (
            <g>
              <line x1={xS(safeIdx)} x2={xS(safeIdx)} y1={PC_PAD.t} y2={PC_PAD.t + PC_IH} stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
              <circle cx={xS(safeIdx)} cy={yS(prices[safeIdx])} r="4.5" fill="#0a0a0d" stroke="#D4AF37" strokeWidth="2"/>
            </g>
          )}
        </svg>

        {/* Floating tooltip */}
        {safeIdx !== null && tp && (
          <div style={{
            position: 'absolute', top: 8,
            ...(ttXPct < 58
              ? { left:  `calc(${ttXPct.toFixed(1)}% + 14px)` }
              : { right: `calc(${(100 - ttXPct).toFixed(1)}% + 14px)` }),
            background: 'rgba(10,10,15,0.96)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '10px 14px', minWidth: 155,
            pointerEvents: 'none', zIndex: 20,
            boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
          }}>
            <div style={{ font: '800 18px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums', color: 'var(--chalk)', marginBottom: 5 }}>{fmt(tpPrice)}</div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--mute)', marginBottom: 5, lineHeight: 1.4 }}>{fmtDT(tp.recordedAt)}</div>
            {tpDelta !== null && (
              <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: tpDelta >= 0 ? 'var(--up)' : 'var(--down)' }}>
                {tpDelta >= 0 ? '+' : ''}{(tpDelta / 1_000_000).toFixed(3)}M₫
                {tpDeltaPct !== null && (
                  <span style={{ marginLeft: 5, opacity: 0.75 }}>({tpDeltaPct >= 0 ? '+' : ''}{tpDeltaPct.toFixed(3)}%)</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
// ────────────────────────────────────────────────────────────────────────────

export function MarketsPage() {
  const [range, setRange] = useState<Range>('1M');
  const [asset, setAsset] = useState('SJC');
  const [hoverPrice, setHoverPrice] = useState<number | null>(null);
  const { user } = useAuth();

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
        p: pt.buyPrice / 1_000_000,
        d: (diff >= 0 ? '+' : '') + (diff / 1_000_000).toFixed(3),
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
              <span style={{ font: '500 13px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{r.p.toFixed(3)}M₫</span>
              <span style={{ textAlign: 'right', color: r.down ? 'var(--down)' : 'var(--up)', fontWeight: 700 }}>{r.down ? '▼' : '▲'} {r.d}</span>
            </div>
          ))}
        </div>
      </div>

      <SpreadHistoryChart />
    </div>
  );
}