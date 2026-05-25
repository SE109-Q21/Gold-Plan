'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export type PricePoint = { buyPrice: number; recordedAt: string };

export interface AlertLine {
  id: string;
  condition: 'gte' | 'lte';
  thresholdPrice: number;
  status: 'active' | 'triggered' | 'inactive';
}

export interface CompareSeries {
  brand: string;
  history: PricePoint[];
  color: string;
}

const PC_W = 920, PC_H = 320;
const PC_PAD = { l: 52, r: 12, t: 16, b: 32 };
const PC_IW = PC_W - PC_PAD.l - PC_PAD.r;
const PC_IH = PC_H - PC_PAD.t - PC_PAD.b;

function fmtDT(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

export function PriceChart({
  history, range, onHoverPrice, chartId = 'pc',
  alerts, onAddAlertAtPrice, compareData,
}: {
  history: PricePoint[];
  range: string;
  onHoverPrice: (p: number | null) => void;
  chartId?: string;
  alerts?: AlertLine[];
  onAddAlertAtPrice?: (price: number) => void;
  compareData?: CompareSeries[];
}) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const [hoverIdx,    setHoverIdx]    = useState<number | null>(null);
  const [showMA,      setShowMA]      = useState(false);
  const [zoomWindow,  setZoomWindow]  = useState<[number, number] | null>(null);
  const [touchPinned, setTouchPinned] = useState(false);

  const zoomRef = useRef(zoomWindow); zoomRef.current = zoomWindow;
  const histRef = useRef(history);   histRef.current = history;

  useEffect(() => {
    setZoomWindow(null); setHoverIdx(null); setTouchPinned(false); onHoverPrice(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, history.length]);

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
    const onTS2 = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDist = Math.sqrt(dx*dx + dy*dy);
    };
    const onTM2 = (e: TouchEvent) => {
      if (e.touches.length !== 2 || pinchDist === null) return;
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY;
      const d = Math.sqrt(dx*dx + dy*dy);
      applyZoom((e.touches[0].clientX + e.touches[1].clientX) / 2, pinchDist / d);
      pinchDist = d;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTS2, { passive: true });
    el.addEventListener('touchmove', onTM2, { passive: false });
    return () => { el.removeEventListener('wheel', onWheel); el.removeEventListener('touchstart', onTS2); el.removeEventListener('touchmove', onTM2); };
  }, []);

  // ─── Data preparation ─────────────────────────────────────────────────────

  const [visStart, visEnd] = zoomWindow ?? [0, Math.max(0, history.length - 1)];
  const visible    = history.slice(visStart, visEnd + 1);
  const rawPrices  = visible.map(p => p.buyPrice);

  const isCompareMode = !!compareData?.length;

  const primaryValues = isCompareMode && rawPrices.length > 0
    ? rawPrices.map(p => ((p / rawPrices[0]) - 1) * 100)
    : rawPrices;

  const compareNorm = isCompareMode ? (compareData ?? []).map(s => {
    const vis = s.history.slice(visStart, Math.min(visEnd + 1, s.history.length));
    const p   = vis.map(pt => pt.buyPrice);
    if (!p.length) return { brand: s.brand, color: s.color, values: [] as number[] };
    const base = p[0];
    return { brand: s.brand, color: s.color, values: p.map(px => ((px / base) - 1) * 100) };
  }) : [];

  const allYValues = [
    ...primaryValues,
    ...(isCompareMode ? compareNorm.flatMap(s => s.values).filter(Number.isFinite) : []),
  ];

  if (allYValues.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-mute font-mono text-[12px] leading-none font-medium"
        style={{ height: PC_H }}
      >
        Loading price history…
      </div>
    );
  }

  const minP = Math.min(...allYValues), maxP = Math.max(...allYValues);
  const pad4 = (maxP - minP || 1) * 0.04;
  const minV = minP - pad4, maxV = maxP + pad4, vR = maxV - minV;

  const xS = (i: number, total = primaryValues.length) =>
    PC_PAD.l + (total <= 1 ? PC_IW / 2 : (i / (total - 1)) * PC_IW);
  const yS = (v: number) => PC_PAD.t + PC_IH * (1 - (v - minV) / vR);

  // ─── Paths ────────────────────────────────────────────────────────────────

  const linePath = primaryValues.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xS(i).toFixed(1)} ${yS(v).toFixed(1)}`).join(' ');
  const fillPath = `${linePath} L ${xS(primaryValues.length-1).toFixed(1)} ${(PC_PAD.t+PC_IH).toFixed(1)} L ${xS(0).toFixed(1)} ${(PC_PAD.t+PC_IH).toFixed(1)} Z`;

  const SMA_N = 7;
  const smaVals: (number | null)[] = !isCompareMode ? primaryValues.map((_, i) => {
    if (i < SMA_N - 1) return null;
    const sl = primaryValues.slice(i - SMA_N + 1, i + 1);
    return sl.reduce((a, b) => a + b, 0) / SMA_N;
  }) : [];
  const smaPath = smaVals.reduce((acc, v, i) => {
    if (v === null) return acc;
    return acc + `${(i === 0 || smaVals[i-1] === null) ? 'M' : 'L'} ${xS(i).toFixed(1)} ${yS(v).toFixed(1)} `;
  }, '');

  // ─── Axes ─────────────────────────────────────────────────────────────────

  const yGrid = [0.25, 0.5, 0.75].map(p => minV + vR * p);
  const fmtY  = isCompareMode
    ? (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
    : (v: number) => (v / 1_000_000).toFixed(2);

  const xLabelCount = Math.min(6, primaryValues.length);
  const xLabelIdxs  = xLabelCount <= 1 ? [0] : Array.from({ length: xLabelCount }, (_, k) =>
    Math.round((k / (xLabelCount - 1)) * (primaryValues.length - 1))
  );
  function fmtXLabel(iso: string) {
    const d = new Date(iso);
    if (range === '1D') return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    if (range === '1W') return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    if (range === '1Y') return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  }

  const today    = new Date();
  const todayIdx = range !== '1D' ? visible.findIndex(pt => {
    const d = new Date(pt.recordedAt);
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  }) : -1;

  // ─── Interaction ──────────────────────────────────────────────────────────

  function clientXToIdx(clientX: number) {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const svgX = (clientX - rect.left) * (PC_W / rect.width);
    return Math.min(Math.max(Math.round(((svgX - PC_PAD.l) / PC_IW) * (primaryValues.length - 1)), 0), primaryValues.length - 1);
  }
  function doHover(idx: number | null) {
    setHoverIdx(idx);
    onHoverPrice(idx !== null ? rawPrices[idx] : null);
  }
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

  function handleChartClick(e: React.MouseEvent) {
    if (!onAddAlertAtPrice || isCompareMode) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const scale = PC_W / rect.width;
    const svgX  = (e.clientX - rect.left) * scale;
    const svgY  = (e.clientY - rect.top)  * scale;
    if (svgX < PC_PAD.l || svgX > PC_W - PC_PAD.r) return;
    if (svgY < PC_PAD.t || svgY > PC_PAD.t + PC_IH) return;
    const rawPrice = minV + (1 - (svgY - PC_PAD.t) / PC_IH) * vR;
    const rounded = Math.round(Math.max(0, rawPrice) / 100_000) * 100_000;
    onAddAlertAtPrice(rounded);
  }

  // ─── Summary stats ────────────────────────────────────────────────────────

  const open  = primaryValues[0];
  const close = primaryValues[primaryValues.length - 1];
  const high  = Math.max(...primaryValues);
  const low   = Math.min(...primaryValues);
  const pDelta    = close - open;
  const pDeltaPct = open !== 0 ? (pDelta / Math.abs(open)) * 100 : 0;

  const fmtSummary = isCompareMode
    ? (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
    : (n: number) => (n / 1_000_000).toFixed(2) + 'M₫';
  const fmtChange = isCompareMode
    ? `${pDelta >= 0 ? '+' : ''}${pDelta.toFixed(2)}pp (${pDeltaPct >= 0 ? '+' : ''}${pDeltaPct.toFixed(2)}%)`
    : `${pDelta >= 0 ? '+' : ''}${(pDelta / 1_000_000).toFixed(2)}M₫ (${pDeltaPct >= 0 ? '+' : ''}${pDeltaPct.toFixed(2)}%)`;

  const summaryStats = [
    { l: 'Open',   v: fmtSummary(open),  colorClass: null as string | null },
    { l: 'Close',  v: fmtSummary(close), colorClass: null },
    { l: 'Change', v: fmtChange,         colorClass: pDelta >= 0 ? 'text-up' : 'text-down' },
    { l: 'High',   v: fmtSummary(high),  colorClass: null },
    { l: 'Low',    v: fmtSummary(low),   colorClass: null },
  ];

  // ─── Hover/tooltip state ──────────────────────────────────────────────────

  const safeIdx      = hoverIdx !== null ? Math.min(hoverIdx, primaryValues.length - 1) : null;
  const tp           = safeIdx !== null ? visible[safeIdx] : null;
  const tpValue      = safeIdx !== null ? primaryValues[safeIdx] : null;
  const tpRawPrice   = safeIdx !== null ? rawPrices[safeIdx] : null;
  const tpPrevValue  = safeIdx !== null && safeIdx > 0 ? primaryValues[safeIdx - 1] : null;
  const tpDelta      = tpPrevValue !== null && tpValue !== null ? tpValue - tpPrevValue : null;
  const tpDeltaPct   = tpPrevValue ? ((tpValue! - tpPrevValue) / Math.abs(tpPrevValue)) * 100 : null;
  const ttXPct       = safeIdx !== null ? (xS(safeIdx) / PC_W) * 100 : 0;

  const visibleAlerts = !isCompareMode && alerts
    ? alerts.filter(a => {
        const y = yS(Number(a.thresholdPrice));
        return y >= PC_PAD.t - 20 && y <= PC_PAD.t + PC_IH + 20;
      })
    : [];

  const fillId   = `${chartId}Fill`;
  const strokeId = `${chartId}Stroke`;
  const clipId   = `${chartId}Clip`;

  return (
    <div>
      {/* Period summary bar */}
      <div className="flex mb-4 bg-[rgba(255,255,255,0.02)] border border-hairline rounded-lg">
        {summaryStats.map((s, i) => (
          <div key={s.l} className={cn('flex-1 p-[10px_12px] min-w-0', i !== 0 && 'border-l border-hairline')}>
            <div className="font-mono text-[9px] leading-none text-mute tracking-[0.14em] uppercase mb-1">{s.l}</div>
            <div className={cn('font-display text-[12px] leading-none font-semibold tabular-nums truncate', s.colorClass ?? 'text-chalk')}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2 mb-[10px] flex-wrap">
        {!isCompareMode && (
          <button
            onClick={() => setShowMA(v => !v)}
            className={cn(
              'inline-flex items-center gap-[6px] h-[26px] px-[10px] border rounded font-mono text-[10px] leading-none font-bold tracking-[0.1em] uppercase cursor-pointer transition-all duration-[140ms]',
              showMA
                ? 'border-[rgba(147,197,253,0.5)] bg-[rgba(147,197,253,0.08)] text-[#93c5fd]'
                : 'border-line bg-transparent text-mute',
            )}
          >
            <span
              className={cn('inline-block w-4 h-[1.5px] rounded-[1px]', showMA ? 'bg-[#93c5fd]' : 'bg-mute')}
            />
            7D MA
          </button>
        )}

        {showMA && !isCompareMode && (
          <div className="flex items-center gap-[14px]">
            <span className="flex items-center gap-[5px] font-mono text-[10px] leading-none font-medium text-mute">
              <span className="inline-block w-[18px] h-[2px] rounded-[1px] bg-[linear-gradient(90deg,#8E7321,#D4AF37)]"/>
              Price
            </span>
            <span className="flex items-center gap-[5px] font-mono text-[10px] leading-none font-medium text-[rgba(147,197,253,0.8)]">
              <span className="inline-block w-[18px]" style={{ borderTop: '1.5px dashed rgba(147,197,253,0.65)' }}/>
              7D SMA
            </span>
          </div>
        )}

        {isCompareMode && (
          <div className="flex items-center gap-[14px]">
            <span className="flex items-center gap-[5px] font-mono text-[10px] leading-none font-semibold text-gold">
              <span className="inline-block w-[18px] h-[2px] rounded-[1px] bg-[linear-gradient(90deg,#8E7321,#D4AF37)]"/>
              SJC
            </span>
            {compareNorm.map(s => (
              <span key={s.brand} className="flex items-center gap-[5px] font-mono text-[10px] leading-none font-semibold" style={{ color: s.color }}>
                <span className="inline-block w-[18px] h-[2px] rounded-[1px]" style={{ background: s.color }}/>
                {s.brand}
              </span>
            ))}
            <span className="font-mono text-[10px] leading-none font-medium text-mute">% change from base</span>
          </div>
        )}

        {onAddAlertAtPrice && !isCompareMode && (
          <span className="inline-flex items-center gap-[5px] font-mono text-[10px] leading-none font-medium text-mute">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            Click chart to set alert
          </span>
        )}

        {zoomWindow && (
          <button
            onClick={() => { setZoomWindow(null); doHover(null); setTouchPinned(false); }}
            className="ml-auto inline-flex items-center gap-[5px] h-[26px] px-[10px] border border-[rgba(212,175,55,0.35)] rounded bg-transparent text-gold font-mono text-[10px] leading-none font-bold tracking-[0.1em] uppercase cursor-pointer"
          >
            ↺ Reset zoom
          </button>
        )}
      </div>

      {/* Chart SVG + overlays */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStartJSX}
        onTouchMove={handleTouchMoveJSX}
        onClick={handleChartClick}
        className="relative cursor-crosshair touch-none select-none"
      >
        <svg viewBox={`0 0 ${PC_W} ${PC_H}`} className="block w-full h-auto">
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#D4AF37" stopOpacity={isCompareMode ? "0.08" : "0.28"}/>
              <stop offset="100%" stopColor="#D4AF37" stopOpacity="0"/>
            </linearGradient>
            <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#8E7321"/>
              <stop offset="20%"  stopColor="#D4AF37"/>
              <stop offset="80%"  stopColor="#E8C76B"/>
              <stop offset="100%" stopColor="#D4AF37"/>
            </linearGradient>
            <clipPath id={clipId}>
              <rect x={PC_PAD.l} y={0} width={PC_IW} height={PC_H}/>
            </clipPath>
          </defs>

          {/* Y grid lines + labels */}
          {yGrid.map((v, i) => (
            <g key={i}>
              <line x1={PC_PAD.l} x2={PC_W - PC_PAD.r} y1={yS(v)} y2={yS(v)} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
              <text x={PC_PAD.l - 5} y={yS(v) + 3.5} textAnchor="end" fill="#3e3f4c" fontSize={9} fontFamily="var(--font-mono)">{fmtY(v)}</text>
            </g>
          ))}

          {/* X labels */}
          {xLabelIdxs.map((idx, k) => (
            <text key={k} x={xS(idx)} y={PC_H - 4} textAnchor="middle" fill="#3e3f4c" fontSize={9} fontFamily="var(--font-mono)">
              {fmtXLabel(visible[idx].recordedAt)}
            </text>
          ))}

          {/* Today marker */}
          {todayIdx >= 0 && (
            <line x1={xS(todayIdx)} x2={xS(todayIdx)} y1={PC_PAD.t} y2={PC_PAD.t + PC_IH} stroke="rgba(212,175,55,0.25)" strokeWidth="1" strokeDasharray="3 6"/>
          )}

          <g clipPath={`url(#${clipId})`}>
            {isCompareMode && compareNorm.map(s => {
              if (!s.values.length) return null;
              const path = s.values.map((v, i) =>
                `${i === 0 ? 'M' : 'L'} ${xS(i, s.values.length).toFixed(1)} ${yS(v).toFixed(1)}`
              ).join(' ');
              return <path key={s.brand} d={path} fill="none" stroke={s.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>;
            })}

            <path d={fillPath} fill={`url(#${fillId})`}/>
            <path d={linePath} fill="none" stroke={`url(#${strokeId})`} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>

            {showMA && !isCompareMode && smaPath && (
              <path d={smaPath} fill="none" stroke="#93c5fd" strokeWidth="1.25" strokeDasharray="5 3" opacity="0.65"/>
            )}
          </g>

          {/* Alert threshold lines */}
          {visibleAlerts.map(alert => {
            const price      = Number(alert.thresholdPrice);
            const ay         = yS(price);
            const clampedY   = Math.max(PC_PAD.t + 2, Math.min(PC_PAD.t + PC_IH - 2, ay));
            const isGte      = alert.condition === 'gte';
            const isInactive = alert.status === 'inactive';
            const lineColor  = isInactive ? 'rgba(90,91,101,0.45)' : isGte ? 'rgba(34,197,94,0.65)' : 'rgba(239,68,68,0.65)';
            const labelColor = isInactive ? 'rgba(140,141,150,0.9)' : isGte ? '#22c55e' : '#ef4444';
            const labelBg    = isInactive ? 'rgba(14,14,20,0.92)' : isGte ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
            const labelBdr   = isInactive ? 'rgba(90,91,101,0.35)' : isGte ? 'rgba(34,197,94,0.38)' : 'rgba(239,68,68,0.38)';
            return (
              <g key={alert.id}>
                <line x1={PC_PAD.l} x2={PC_W - PC_PAD.r} y1={clampedY} y2={clampedY}
                  stroke={lineColor} strokeWidth="1" strokeDasharray="5 4"/>
                <rect x={1} y={clampedY - 8} width={PC_PAD.l - 4} height={16} rx={3}
                  fill={labelBg} stroke={labelBdr} strokeWidth="0.75"/>
                <text x={PC_PAD.l - 6} y={clampedY + 3.5}
                  textAnchor="end" fill={labelColor} fontSize={8} fontFamily="var(--font-mono)" fontWeight="700">
                  {(price / 1_000_000).toFixed(2)}
                </text>
                <text x={PC_W - PC_PAD.r - 5} y={clampedY - 4}
                  textAnchor="end" fill={labelColor} fontSize={8} fontFamily="var(--font-mono)" fontWeight="600" opacity="0.85">
                  {isGte ? '≥' : '≤'} alert
                </text>
              </g>
            );
          })}

          {/* Vertical crosshair */}
          {safeIdx !== null && (
            <line x1={xS(safeIdx)} x2={xS(safeIdx)} y1={PC_PAD.t} y2={PC_PAD.t + PC_IH}
              stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
          )}

          {/* Horizontal crosshair */}
          {safeIdx !== null && tpValue !== null && (
            <line x1={PC_PAD.l} x2={PC_W - PC_PAD.r}
              y1={yS(tpValue)} y2={yS(tpValue)}
              stroke="rgba(255,255,255,0.10)" strokeWidth="1" strokeDasharray="3 5"/>
          )}

          {/* Y-axis hover price pill */}
          {safeIdx !== null && tpValue !== null && (
            <g>
              <rect x={1} y={yS(tpValue) - 9} width={PC_PAD.l - 4} height={18} rx={3}
                fill="rgba(11,11,15,0.96)" stroke="rgba(212,175,55,0.6)" strokeWidth="1"/>
              <text x={PC_PAD.l - 6} y={yS(tpValue) + 3.5}
                textAnchor="end" fill="#D4AF37" fontSize={9} fontFamily="var(--font-mono)" fontWeight="700">
                {isCompareMode
                  ? `${tpValue >= 0 ? '+' : ''}${tpValue.toFixed(2)}%`
                  : (tpValue / 1_000_000).toFixed(2)}
              </text>
            </g>
          )}

          {/* Hover dot */}
          {safeIdx !== null && tpValue !== null && (
            <circle cx={xS(safeIdx)} cy={yS(tpValue)} r="4.5" fill="#0a0a0d" stroke="#D4AF37" strokeWidth="2"/>
          )}
        </svg>

        {/* Tooltip overlay */}
        {safeIdx !== null && tp && tpValue !== null && (
          <div
            className="absolute top-2 bg-[rgba(10,10,15,0.96)] border border-[rgba(255,255,255,0.1)] rounded-lg p-[10px_14px] min-w-[160px] pointer-events-none z-20 shadow-[0_4px_20px_rgba(0,0,0,0.7)]"
            style={ttXPct < 58
              ? { left: `calc(${ttXPct.toFixed(1)}% + 14px)` }
              : { right: `calc(${(100 - ttXPct).toFixed(1)}% + 14px)` }
            }
          >
            <div className="font-display text-[18px] leading-none font-extrabold tabular-nums text-chalk mb-[5px]">
              {isCompareMode
                ? `${tpValue >= 0 ? '+' : ''}${tpValue.toFixed(3)}%`
                : (tpRawPrice! / 1_000_000).toFixed(2) + 'M₫'}
            </div>
            {isCompareMode && tpRawPrice && (
              <div className="font-mono text-[10px] leading-none text-mute mb-[3px]">
                {(tpRawPrice / 1_000_000).toFixed(2)}M₫ actual
              </div>
            )}
            <div className="font-mono text-[10px] leading-[1.4] text-mute mb-[5px]">{fmtDT(tp.recordedAt)}</div>
            {tpDelta !== null && (
              <div className={cn('font-mono text-[11px] leading-none font-bold', tpDelta >= 0 ? 'text-up' : 'text-down')}>
                {tpDelta >= 0 ? '+' : ''}
                {isCompareMode ? tpDelta.toFixed(3) + 'pp' : (tpDelta / 1_000_000).toFixed(3) + 'M₫'}
                {tpDeltaPct !== null && !isCompareMode && (
                  <span className="ml-[5px] opacity-75">({tpDeltaPct >= 0 ? '+' : ''}{tpDeltaPct.toFixed(3)}%)</span>
                )}
              </div>
            )}
            {onAddAlertAtPrice && !isCompareMode && (
              <div className="font-mono text-[9px] leading-none text-[rgba(212,175,55,0.6)] mt-2 pt-[7px] border-t border-[rgba(255,255,255,0.06)]">
                click to set alert here
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
