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

interface OhlcCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

const PC_W = 920, PC_H = 320;
const PC_PAD = { l: 52, r: 12, t: 16, b: 32 };
const PC_IW = PC_W - PC_PAD.l - PC_PAD.r;
const PC_IH = PC_H - PC_PAD.t - PC_PAD.b;

function fmtDT(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function buildCandles(points: PricePoint[], range: string): OhlcCandle[] {
  if (points.length < 2) return [];
  const getKey = (iso: string): string => {
    const d = new Date(iso);
    const Y = d.getFullYear(), M = d.getMonth(), D = d.getDate(), H = d.getHours();
    if (range === '1D') return `${Y}-${M}-${D}-${H}`;
    if (range === '1Y') return `${Y}-${M}`;
    if (range === '3M') return `${Y}-${M}-W${Math.floor((D - 1) / 7)}`;
    return `${Y}-${M}-${D}`;
  };
  const groups = new Map<string, { prices: number[]; time: string }>();
  for (const pt of points) {
    const key = getKey(pt.recordedAt);
    if (!groups.has(key)) groups.set(key, { prices: [], time: pt.recordedAt });
    groups.get(key)!.prices.push(pt.buyPrice);
  }
  return Array.from(groups.values()).map(({ prices, time }) => ({
    time,
    open:  prices[0],
    close: prices[prices.length - 1],
    high:  Math.max(...prices),
    low:   Math.min(...prices),
  }));
}

export function PriceChart({
  history, range, onHoverPrice, chartId = 'pc',
  alerts, onAddAlertAtPrice, compareData, isLoading = false,
  formatPrice,
}: {
  history: PricePoint[];
  range: string;
  onHoverPrice: (p: number | null) => void;
  chartId?: string;
  alerts?: AlertLine[];
  onAddAlertAtPrice?: (price: number) => void;
  compareData?: CompareSeries[];
  isLoading?: boolean;
  formatPrice?: (vnd: number) => string;
}) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const [hoverIdx,    setHoverIdx]    = useState<number | null>(null);
  const [showMA,      setShowMA]      = useState(false);
  const [showBB,      setShowBB]      = useState(false);
  const [showCandle,  setShowCandle]  = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [dragStart,   setDragStart]   = useState<number | null>(null);
  const [dragCurrent, setDragCurrent] = useState<number | null>(null);
  const [zoomWindow,  setZoomWindow]  = useState<[number, number] | null>(null);
  const [touchPinned, setTouchPinned] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  const zoomRef = useRef(zoomWindow);
  const histRef = useRef(history);

  useEffect(() => {
    zoomRef.current = zoomWindow;
    histRef.current = history;
  }, [history, zoomWindow]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setZoomWindow(null); setHoverIdx(null); setTouchPinned(false); onHoverPrice(null);
      setShowBB(false); setDragStart(null); setDragCurrent(null);
      setDataVersion(v => v + 1);
    }, 0);
    return () => window.clearTimeout(id);
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
  const visible   = history.slice(visStart, visEnd + 1);
  const rawPrices = visible.map(p => p.buyPrice);

  const isCompareMode = !!compareData?.length;

  const candleData    = showCandle && !isCompareMode ? buildCandles(visible, range) : [];
  const useCandleMode = showCandle && !isCompareMode && candleData.length >= 2;

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

  // ─── Bollinger Bands ──────────────────────────────────────────────────────
  const BB_N = 20;
  const bbBands: { upper: number | null; lower: number | null }[] = !isCompareMode && !useCandleMode ? primaryValues.map((_, i) => {
    if (i < BB_N - 1) return { upper: null, lower: null };
    const window = primaryValues.slice(i - BB_N + 1, i + 1);
    const mean = window.reduce((a, b) => a + b, 0) / BB_N;
    const variance = window.reduce((a, b) => a + (b - mean) ** 2, 0) / BB_N;
    const sigma = Math.sqrt(variance);
    return { upper: mean + 2 * sigma, lower: mean - 2 * sigma };
  }) : [];

  const allYValues = useCandleMode
    ? candleData.flatMap(c => [c.high, c.low])
    : [
        ...primaryValues,
        ...(isCompareMode ? compareNorm.flatMap(s => s.values).filter(Number.isFinite) : []),
        ...(showBB && !isCompareMode ? bbBands.flatMap(b => [b.upper, b.lower]).filter((v): v is number => v !== null) : []),
      ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center text-mute font-mono text-[12px] leading-none font-medium" style={{ height: PC_H }}>
        Đang tải biểu đồ…
      </div>
    );
  }

  if (allYValues.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 text-mute font-mono text-[12px] leading-none font-medium" style={{ height: PC_H }}>
        <span className="text-[20px]">📊</span>
        Chưa có dữ liệu cho khoảng thời gian này
      </div>
    );
  }

  const minP = Math.min(...allYValues), maxP = Math.max(...allYValues);
  const pad4 = (maxP - minP || 1) * 0.04;
  const minV = minP - pad4, maxV = maxP + pad4, vR = maxV - minV;

  const xS = (i: number, total?: number) => {
    const n = total ?? primaryValues.length;
    return PC_PAD.l + (n <= 1 ? PC_IW / 2 : (i / (n - 1)) * PC_IW);
  };
  const yS = (v: number) => PC_PAD.t + PC_IH * (1 - (v - minV) / vR);

  // ─── Line paths ───────────────────────────────────────────────────────────
  const linePath = !useCandleMode
    ? primaryValues.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xS(i).toFixed(1)} ${yS(v).toFixed(1)}`).join(' ')
    : '';
  const fillPath = !useCandleMode
    ? `${linePath} L ${xS(primaryValues.length-1).toFixed(1)} ${(PC_PAD.t+PC_IH).toFixed(1)} L ${xS(0).toFixed(1)} ${(PC_PAD.t+PC_IH).toFixed(1)} Z`
    : '';

  const SMA_N = 7;
  const smaVals: (number | null)[] = !isCompareMode && !useCandleMode ? primaryValues.map((_, i) => {
    if (i < SMA_N - 1) return null;
    const sl = primaryValues.slice(i - SMA_N + 1, i + 1);
    return sl.reduce((a, b) => a + b, 0) / SMA_N;
  }) : [];
  const smaPath = smaVals.reduce((acc, v, i) => {
    if (v === null) return acc;
    return acc + `${(i === 0 || smaVals[i-1] === null) ? 'M' : 'L'} ${xS(i).toFixed(1)} ${yS(v).toFixed(1)} `;
  }, '');

  const bbUpperPath = bbBands.reduce((acc, b, i) => {
    if (b.upper === null) return acc;
    const prev = i > 0 ? bbBands[i - 1] : null;
    return acc + `${(!prev || prev.upper === null) ? 'M' : 'L'} ${xS(i).toFixed(1)} ${yS(b.upper).toFixed(1)} `;
  }, '');
  const bbLowerPath = bbBands.reduce((acc, b, i) => {
    if (b.lower === null) return acc;
    const prev = i > 0 ? bbBands[i - 1] : null;
    return acc + `${(!prev || prev.lower === null) ? 'M' : 'L'} ${xS(i).toFixed(1)} ${yS(b.lower).toFixed(1)} `;
  }, '');
  const validBB = bbBands.map((b, i) => ({ ...b, i })).filter(b => b.upper !== null);
  const bbFillPath = validBB.length > 1
    ? validBB.map((b, j) => `${j === 0 ? 'M' : 'L'} ${xS(b.i).toFixed(1)} ${yS(b.upper!).toFixed(1)}`).join(' ')
      + ' ' + [...validBB].reverse().map((b) => `L ${xS(b.i).toFixed(1)} ${yS(b.lower!).toFixed(1)}`).join(' ') + ' Z'
    : '';

  // ─── Axes ─────────────────────────────────────────────────────────────────
  const yGrid = [0.25, 0.5, 0.75].map(p => minV + vR * p);
  const fmtY  = isCompareMode
    ? (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
    : (v: number) => (v / 1_000_000).toFixed(2);

  const displayLen   = useCandleMode ? candleData.length : primaryValues.length;
  const displayItems = useCandleMode
    ? candleData.map(c => ({ recordedAt: c.time }))
    : (visible as { recordedAt: string }[]);
  const xLabelCount  = Math.min(6, displayLen);
  const xLabelIdxs   = xLabelCount <= 1 ? [0] : Array.from({ length: xLabelCount }, (_, k) =>
    Math.round((k / (xLabelCount - 1)) * (displayLen - 1))
  );
  function fmtXLabel(iso: string) {
    const d = new Date(iso);
    if (range === '1D') return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    if (range === '1W') return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    if (range === '1Y') return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  }

  const today    = new Date();
  const todayIdx = range !== '1D' && !useCandleMode ? visible.findIndex(pt => {
    const d = new Date(pt.recordedAt);
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  }) : -1;

  // ─── Volume Profile ───────────────────────────────────────────────────────
  const PROFILE_N = 28, PROFILE_MAX_W = 56;
  const profileBars = showProfile && !isCompareMode && primaryValues.length > 1 ? (() => {
    const bucketH = PC_IH / PROFILE_N;
    const counts  = Array.from({ length: PROFILE_N }, () => 0);
    const vals    = useCandleMode
      ? candleData.flatMap(c => [c.open, c.close, c.high, c.low])
      : primaryValues;
    for (const v of vals) {
      const ratio  = (v - minV) / vR;
      const bucket = PROFILE_N - 1 - Math.min(PROFILE_N - 1, Math.floor(ratio * PROFILE_N));
      if (bucket >= 0 && bucket < PROFILE_N) counts[bucket]++;
    }
    const maxCount = Math.max(...counts, 1);
    const total    = counts.reduce((a, b) => a + b, 0);
    const sorted   = [...counts].sort((a, b) => b - a);
    let cumulative = 0, vaThreshold = sorted[0];
    for (const c of sorted) {
      cumulative += c; vaThreshold = c;
      if (cumulative >= total * 0.7) break;
    }
    return counts.map((count, i) => ({
      y: PC_PAD.t + i * bucketH,
      h: Math.max(0.5, bucketH - 0.5),
      w: (count / maxCount) * PROFILE_MAX_W,
      isValueArea: count >= vaThreshold && count > 0,
    }));
  })() : [];

  // ─── Interaction ──────────────────────────────────────────────────────────
  function clientXToIdx(clientX: number) {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const svgX = (clientX - rect.left) * (PC_W / rect.width);
    const n    = useCandleMode ? candleData.length : primaryValues.length;
    return Math.min(Math.max(Math.round(((svgX - PC_PAD.l) / PC_IW) * (n - 1)), 0), n - 1);
  }
  function doHover(idx: number | null) {
    setHoverIdx(idx);
    if (useCandleMode) {
      onHoverPrice(idx !== null && candleData[idx] ? candleData[idx].close : null);
    } else {
      onHoverPrice(idx !== null ? rawPrices[idx] : null);
    }
  }
  function handleMouseMove(e: React.MouseEvent) {
    if (!touchPinned) doHover(clientXToIdx(e.clientX));
    if (dragStart !== null) setDragCurrent(clientXToIdx(e.clientX));
  }
  function handleMouseLeave() {
    if (!touchPinned) doHover(null);
    setDragStart(null); setDragCurrent(null);
  }
  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    setDragStart(clientXToIdx(e.clientX));
    setDragCurrent(clientXToIdx(e.clientX));
  }
  function handleMouseUp() {
    if (dragStart !== null && dragCurrent !== null) {
      const lo = Math.min(dragStart, dragCurrent);
      const hi = Math.max(dragStart, dragCurrent);
      if (hi - lo > 2) {
        const absLo = visStart + lo;
        const absHi = Math.min(history.length - 1, visStart + hi);
        setZoomWindow([absLo, absHi]);
        setDragStart(null); setDragCurrent(null);
        return;
      }
    }
    setDragStart(null); setDragCurrent(null);
  }
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
    if (!onAddAlertAtPrice || isCompareMode || useCandleMode) return;
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
  const periodOpen  = useCandleMode && candleData.length ? candleData[0].open                       : primaryValues[0];
  const periodClose = useCandleMode && candleData.length ? candleData[candleData.length - 1].close  : primaryValues[primaryValues.length - 1];
  const periodHigh  = useCandleMode && candleData.length ? Math.max(...candleData.map(c => c.high)) : Math.max(...primaryValues);
  const periodLow   = useCandleMode && candleData.length ? Math.min(...candleData.map(c => c.low))  : Math.min(...primaryValues);

  const pDelta    = periodClose - periodOpen;
  const pDeltaPct = periodOpen !== 0 ? (pDelta / Math.abs(periodOpen)) * 100 : 0;

  const fmtPrice = formatPrice ?? ((v: number) => (v / 1_000_000).toFixed(2) + 'M₫');
  const fmtSummary = isCompareMode
    ? (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
    : fmtPrice;
  const fmtChange = isCompareMode
    ? `${pDelta >= 0 ? '+' : ''}${pDelta.toFixed(2)}pp (${pDeltaPct >= 0 ? '+' : ''}${pDeltaPct.toFixed(2)}%)`
    : `${pDelta >= 0 ? '+' : ''}${fmtPrice(pDelta)} (${pDeltaPct >= 0 ? '+' : ''}${pDeltaPct.toFixed(2)}%)`;

  const summaryStats = [
    { l: 'Open',   v: fmtSummary(periodOpen),  colorClass: null as string | null },
    { l: 'Close',  v: fmtSummary(periodClose), colorClass: null },
    { l: 'Change', v: fmtChange,               colorClass: pDelta >= 0 ? 'text-up' : 'text-down' },
    { l: 'High',   v: fmtSummary(periodHigh),  colorClass: null },
    { l: 'Low',    v: fmtSummary(periodLow),   colorClass: null },
  ];

  // ─── Hover/tooltip state ──────────────────────────────────────────────────
  const maxIdx       = useCandleMode ? candleData.length - 1 : primaryValues.length - 1;
  const safeIdx      = hoverIdx !== null ? Math.min(hoverIdx, maxIdx) : null;
  const hoveredCandle = useCandleMode && safeIdx !== null ? candleData[safeIdx] : null;
  const tp           = useCandleMode
    ? (hoveredCandle ? { recordedAt: hoveredCandle.time } as PricePoint : null)
    : (safeIdx !== null ? visible[safeIdx] : null);
  const tpValue      = useCandleMode
    ? (hoveredCandle?.close ?? null)
    : (safeIdx !== null ? primaryValues[safeIdx] : null);
  const tpRawPrice   = useCandleMode
    ? (hoveredCandle?.close ?? null)
    : (safeIdx !== null ? rawPrices[safeIdx] : null);
  const tpPrevValue  = !useCandleMode && safeIdx !== null && safeIdx > 0 ? primaryValues[safeIdx - 1] : null;
  const tpDelta      = tpPrevValue !== null && tpValue !== null ? tpValue - tpPrevValue : null;
  const tpDeltaPct   = tpPrevValue ? ((tpValue! - tpPrevValue) / Math.abs(tpPrevValue)) * 100 : null;

  const crosshairX = safeIdx !== null ? xS(safeIdx, useCandleMode ? candleData.length : undefined) : null;
  const ttXPct     = crosshairX !== null ? (crosshairX / PC_W) * 100 : 0;

  const visibleAlerts = !isCompareMode && alerts
    ? alerts.filter(a => {
        const y = yS(Number(a.thresholdPrice));
        return y >= PC_PAD.t - 20 && y <= PC_PAD.t + PC_IH + 20;
      })
    : [];

  const fillId     = `${chartId}Fill`;
  const strokeId   = `${chartId}Stroke`;
  const clipId     = `${chartId}Clip`;
  const drawClipId = `${chartId}Draw`;

  // Candle body width (responsive to number of candles)
  const candleBarW = useCandleMode ? Math.max(2, Math.min(14, (PC_IW / candleData.length) * 0.65)) : 0;

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
        {/* Candlestick toggle */}
        {!isCompareMode && (
          <button
            onClick={() => { setShowCandle(v => !v); setShowMA(false); setShowBB(false); }}
            className={cn(
              'inline-flex items-center gap-[6px] h-[26px] px-[10px] border rounded font-mono text-[10px] leading-none font-bold tracking-[0.1em] uppercase cursor-pointer transition-all duration-[140ms]',
              showCandle
                ? 'border-[rgba(34,197,94,0.5)] bg-[rgba(34,197,94,0.08)] text-[#22c55e]'
                : 'border-line bg-transparent text-mute',
            )}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <rect x="3" y="1" width="2" height="10" rx="0.5" fill={showCandle ? '#22c55e' : 'currentColor'} opacity="0.4"/>
              <rect x="3" y="3" width="2" height="5" rx="0.5" fill={showCandle ? '#22c55e' : 'currentColor'}/>
              <rect x="7" y="1" width="2" height="10" rx="0.5" fill={showCandle ? '#ef4444' : 'currentColor'} opacity="0.4"/>
              <rect x="7" y="4" width="2" height="5" rx="0.5" fill={showCandle ? '#ef4444' : 'currentColor'}/>
            </svg>
            Nến
          </button>
        )}

        {/* Profile toggle */}
        {!isCompareMode && (
          <button
            onClick={() => setShowProfile(v => !v)}
            className={cn(
              'inline-flex items-center gap-[6px] h-[26px] px-[10px] border rounded font-mono text-[10px] leading-none font-bold tracking-[0.1em] uppercase cursor-pointer transition-all duration-[140ms]',
              showProfile
                ? 'border-[rgba(212,175,55,0.5)] bg-[rgba(212,175,55,0.08)] text-gold'
                : 'border-line bg-transparent text-mute',
            )}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              {[0,1,2,3].map(i => (
                <rect key={i} x="1" y={1+i*2.5} width={5 + i * 1.5} height="1.8" rx="0.5"
                  fill={showProfile ? '#D4AF37' : 'currentColor'} opacity={0.4 + i * 0.2}/>
              ))}
            </svg>
            Phân phối
          </button>
        )}

        {!isCompareMode && !showCandle && (
          <button
            onClick={() => setShowMA(v => !v)}
            className={cn(
              'inline-flex items-center gap-[6px] h-[26px] px-[10px] border rounded font-mono text-[10px] leading-none font-bold tracking-[0.1em] uppercase cursor-pointer transition-all duration-[140ms]',
              showMA
                ? 'border-[rgba(147,197,253,0.5)] bg-[rgba(147,197,253,0.08)] text-[#93c5fd]'
                : 'border-line bg-transparent text-mute',
            )}
          >
            <span className={cn('inline-block w-4 h-[1.5px] rounded-[1px]', showMA ? 'bg-[#93c5fd]' : 'bg-mute')} />
            7D MA
          </button>
        )}

        {!isCompareMode && !showCandle && (
          <button
            onClick={() => setShowBB(v => !v)}
            className={cn(
              'inline-flex items-center gap-[6px] h-[26px] px-[10px] border rounded font-mono text-[10px] leading-none font-bold tracking-[0.1em] uppercase cursor-pointer transition-all duration-[140ms]',
              showBB
                ? 'border-[rgba(167,139,250,0.5)] bg-[rgba(167,139,250,0.08)] text-[#a78bfa]'
                : 'border-line bg-transparent text-mute',
            )}
          >
            BB(20)
          </button>
        )}

        {(showMA || showBB) && !isCompareMode && !showCandle && (
          <div className="flex items-center gap-[14px]">
            <span className="flex items-center gap-[5px] font-mono text-[10px] leading-none font-medium text-mute">
              <span className="inline-block w-[18px] h-[2px] rounded-[1px] bg-[linear-gradient(90deg,#8E7321,#D4AF37)]"/>
              Price
            </span>
            {showMA && (
              <span className="flex items-center gap-[5px] font-mono text-[10px] leading-none font-medium text-[rgba(147,197,253,0.8)]">
                <span className="inline-block w-[18px]" style={{ borderTop: '1.5px dashed rgba(147,197,253,0.65)' }}/>
                7D SMA
              </span>
            )}
            {showBB && (
              <span className="flex items-center gap-[5px] font-mono text-[10px] leading-none font-medium text-[rgba(167,139,250,0.8)]">
                <span className="inline-block w-[18px]" style={{ borderTop: '1.5px dashed rgba(167,139,250,0.65)' }}/>
                BB(20)
              </span>
            )}
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

        {onAddAlertAtPrice && !isCompareMode && !useCandleMode && (
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
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
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
            {/* Draw-in animation clip — key forces remount on data change */}
            <clipPath id={drawClipId} key={`${drawClipId}-${dataVersion}`}>
              <rect x={PC_PAD.l} y={PC_PAD.t - 10} height={PC_IH + 20}>
                <animate
                  attributeName="width"
                  from="0"
                  to={String(PC_IW + PC_PAD.r)}
                  dur="0.85s"
                  begin="0s"
                  fill="freeze"
                  calcMode="spline"
                  keySplines="0.4 0 0.2 1"
                  keyTimes="0;1"
                />
              </rect>
            </clipPath>
          </defs>

          {/* Y grid lines + labels */}
          {yGrid.map((v, i) => (
            <g key={i}>
              <line x1={PC_PAD.l} x2={PC_W - PC_PAD.r} y1={yS(v)} y2={yS(v)} stroke="rgba(128,128,128,0.15)" strokeWidth="1"/>
              <text x={PC_PAD.l - 5} y={yS(v) + 3.5} textAnchor="end" fill="var(--mute)" fontSize={9} fontFamily="var(--font-mono)">{fmtY(v)}</text>
            </g>
          ))}

          {/* X labels */}
          {xLabelIdxs.map((idx, k) => (
            <text key={k} x={xS(idx, displayLen)} y={PC_H - 4} textAnchor="middle" fill="var(--mute)" fontSize={9} fontFamily="var(--font-mono)">
              {fmtXLabel(displayItems[idx].recordedAt)}
            </text>
          ))}

          {/* Today marker */}
          {todayIdx >= 0 && (
            <line x1={xS(todayIdx)} x2={xS(todayIdx)} y1={PC_PAD.t} y2={PC_PAD.t + PC_IH}
              stroke="rgba(212,175,55,0.25)" strokeWidth="1" strokeDasharray="3 6"/>
          )}

          <g clipPath={`url(#${clipId})`}>
            {/* Compare series */}
            {isCompareMode && compareNorm.map(s => {
              if (!s.values.length) return null;
              const path = s.values.map((v, i) =>
                `${i === 0 ? 'M' : 'L'} ${xS(i, s.values.length).toFixed(1)} ${yS(v).toFixed(1)}`
              ).join(' ');
              return <path key={s.brand} d={path} fill="none" stroke={s.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>;
            })}

            {/* Line mode: fill + animated line */}
            {!useCandleMode && (
              <>
                <path d={fillPath} fill={`url(#${fillId})`}/>
                <path
                  d={linePath}
                  fill="none"
                  stroke={`url(#${strokeId})`}
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  clipPath={`url(#${drawClipId})`}
                />
              </>
            )}

            {/* Candlestick mode */}
            {useCandleMode && candleData.map((c, i) => {
              const cx      = xS(i, candleData.length);
              const isUp    = c.close >= c.open;
              const color   = isUp ? '#22c55e' : '#ef4444';
              const bodyTop = yS(Math.max(c.open, c.close));
              const bodyBot = yS(Math.min(c.open, c.close));
              const bodyH   = Math.max(1.5, bodyBot - bodyTop);
              return (
                <g key={i}>
                  {/* High-low wick */}
                  <line
                    x1={cx.toFixed(1)} x2={cx.toFixed(1)}
                    y1={yS(c.high).toFixed(1)} y2={yS(c.low).toFixed(1)}
                    stroke={color} strokeWidth="1.2" opacity="0.75"
                  />
                  {/* Open-close body */}
                  <rect
                    x={(cx - candleBarW / 2).toFixed(1)}
                    y={bodyTop.toFixed(1)}
                    width={candleBarW.toFixed(1)}
                    height={bodyH.toFixed(1)}
                    fill={color}
                    opacity={safeIdx === i ? '1' : '0.82'}
                    rx="1"
                  />
                  {/* Highlight on hover */}
                  {safeIdx === i && (
                    <rect
                      x={(cx - candleBarW / 2 - 1).toFixed(1)}
                      y={bodyTop.toFixed(1)}
                      width={(candleBarW + 2).toFixed(1)}
                      height={bodyH.toFixed(1)}
                      fill="none"
                      stroke={color}
                      strokeWidth="1"
                      opacity="0.6"
                      rx="1"
                    />
                  )}
                </g>
              );
            })}

            {/* MA */}
            {showMA && !isCompareMode && !useCandleMode && smaPath && (
              <path d={smaPath} fill="none" stroke="#93c5fd" strokeWidth="1.25" strokeDasharray="5 3" opacity="0.65"/>
            )}
            {/* BB */}
            {showBB && !isCompareMode && !useCandleMode && bbFillPath && (
              <path d={bbFillPath} fill="rgba(167,139,250,0.06)" stroke="none"/>
            )}
            {showBB && !isCompareMode && !useCandleMode && bbUpperPath && (
              <path d={bbUpperPath} fill="none" stroke="#a78bfa" strokeWidth="1" strokeDasharray="4 3" opacity="0.6"/>
            )}
            {showBB && !isCompareMode && !useCandleMode && bbLowerPath && (
              <path d={bbLowerPath} fill="none" stroke="#a78bfa" strokeWidth="1" strokeDasharray="4 3" opacity="0.6"/>
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

          {/* Volume Profile bars */}
          {showProfile && profileBars.map((bar, i) => (
            <rect
              key={i}
              x={(PC_W - PC_PAD.r - bar.w).toFixed(1)}
              y={bar.y.toFixed(1)}
              width={bar.w.toFixed(1)}
              height={bar.h.toFixed(1)}
              fill={bar.isValueArea ? 'rgba(212,175,55,0.22)' : 'rgba(212,175,55,0.07)'}
              rx="1"
            />
          ))}
          {showProfile && (
            <text
              x={PC_W - PC_PAD.r - 2}
              y={PC_PAD.t + 8}
              textAnchor="end"
              fill="rgba(212,175,55,0.5)"
              fontSize={7}
              fontFamily="var(--font-mono)"
              fontWeight="700"
              letterSpacing="0.08em"
            >
              VOL PROFILE
            </text>
          )}

          {/* Vertical crosshair */}
          {crosshairX !== null && (
            <line x1={crosshairX} x2={crosshairX} y1={PC_PAD.t} y2={PC_PAD.t + PC_IH}
              stroke="rgba(128,128,148,0.4)" strokeWidth="1"/>
          )}

          {/* Horizontal crosshair */}
          {crosshairX !== null && tpValue !== null && (
            <line x1={PC_PAD.l} x2={PC_W - PC_PAD.r}
              y1={yS(tpValue)} y2={yS(tpValue)}
              stroke="rgba(128,128,148,0.3)" strokeWidth="1" strokeDasharray="3 5"/>
          )}

          {/* Y-axis hover price pill */}
          {crosshairX !== null && tpValue !== null && (
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

          {/* Hover dot (line mode only) */}
          {!useCandleMode && crosshairX !== null && tpValue !== null && (
            <circle cx={crosshairX} cy={yS(tpValue)} r="4.5" fill="#0a0a0d" stroke="#D4AF37" strokeWidth="2"/>
          )}

          {/* Live pulse at latest data point (line mode, not hovering) */}
          {!isCompareMode && !useCandleMode && safeIdx === null && primaryValues.length > 0 && (() => {
            const lx = xS(primaryValues.length - 1);
            const ly = yS(primaryValues[primaryValues.length - 1]);
            return (
              <g>
                <circle cx={lx.toFixed(1)} cy={ly.toFixed(1)} r="4" fill="none" stroke="#D4AF37" strokeWidth="1.5">
                  <animate attributeName="r"       values="4;16"  dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.7;0" dur="2s" repeatCount="indefinite"/>
                </circle>
                <circle cx={lx.toFixed(1)} cy={ly.toFixed(1)} r="3.5" fill="#D4AF37" opacity="0.95"/>
                <circle cx={lx.toFixed(1)} cy={ly.toFixed(1)} r="1.5" fill="#0a0a0d"/>
              </g>
            );
          })()}

          {/* Drag-to-zoom selection rectangle */}
          {dragStart !== null && dragCurrent !== null && Math.abs(dragStart - dragCurrent) > 0 && (
            <rect
              x={Math.min(xS(dragStart, useCandleMode ? candleData.length : undefined), xS(dragCurrent, useCandleMode ? candleData.length : undefined)).toFixed(1)}
              y={PC_PAD.t}
              width={Math.abs(xS(dragStart, useCandleMode ? candleData.length : undefined) - xS(dragCurrent, useCandleMode ? candleData.length : undefined)).toFixed(1)}
              height={PC_IH}
              fill="rgba(212,175,55,0.12)"
              stroke="rgba(212,175,55,0.5)"
              strokeWidth="1"
            />
          )}
        </svg>

        {/* Tooltip overlay */}
        {crosshairX !== null && tp && tpValue !== null && (
          <div
            className="absolute top-2 bg-[rgba(10,10,15,0.96)] border border-[rgba(255,255,255,0.1)] rounded-lg p-[10px_14px] min-w-[160px] pointer-events-none z-20 shadow-[0_4px_20px_rgba(0,0,0,0.7)]"
            style={ttXPct < 58
              ? { left: `calc(${ttXPct.toFixed(1)}% + 14px)` }
              : { right: `calc(${(100 - ttXPct).toFixed(1)}% + 14px)` }
            }
          >
            {/* Candle OHLC tooltip */}
            {useCandleMode && hoveredCandle ? (
              <>
                <div className="font-display text-[18px] leading-none font-extrabold tabular-nums text-[#F0EAE0] mb-[5px]">
                  {fmtPrice(hoveredCandle.close)}
                </div>
                <div className="font-mono text-[10px] leading-[1.4] text-[rgba(160,155,148,0.9)] mb-[6px]">{fmtDT(hoveredCandle.time)}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-[3px]">
                  {[
                    { l: 'O', v: fmtPrice(hoveredCandle.open)  },
                    { l: 'H', v: fmtPrice(hoveredCandle.high)  },
                    { l: 'C', v: fmtPrice(hoveredCandle.close) },
                    { l: 'L', v: fmtPrice(hoveredCandle.low)   },
                  ].map(s => (
                    <div key={s.l} className="flex items-center gap-[5px]">
                      <span className="font-mono text-[9px] text-mute">{s.l}</span>
                      <span className="font-mono text-[11px] font-bold tabular-nums text-chalk">{s.v}</span>
                    </div>
                  ))}
                </div>
                <div className={cn(
                  'font-mono text-[11px] leading-none font-bold mt-[6px] pt-[6px] border-t border-[rgba(255,255,255,0.06)]',
                  hoveredCandle.close >= hoveredCandle.open ? 'text-up' : 'text-down',
                )}>
                  {hoveredCandle.close >= hoveredCandle.open ? '▲' : '▼'}{' '}
                  {fmtPrice(Math.abs(hoveredCandle.close - hoveredCandle.open))}
                </div>
              </>
            ) : (
              /* Standard line tooltip */
              <>
                <div className="font-display text-[18px] leading-none font-extrabold tabular-nums text-[#F0EAE0] mb-[5px]">
                  {isCompareMode
                    ? `${tpValue >= 0 ? '+' : ''}${tpValue.toFixed(3)}%`
                    : fmtPrice(tpRawPrice!)}
                </div>
                {isCompareMode && tpRawPrice && (
                  <div className="font-mono text-[10px] leading-none text-[rgba(160,155,148,0.9)] mb-[3px]">
                    {fmtPrice(tpRawPrice)} actual
                  </div>
                )}
                <div className="font-mono text-[10px] leading-[1.4] text-[rgba(160,155,148,0.9)] mb-[5px]">{fmtDT(tp.recordedAt)}</div>
                {tpDelta !== null && (
                  <div className={cn('font-mono text-[11px] leading-none font-bold', tpDelta >= 0 ? 'text-up' : 'text-down')}>
                    {tpDelta >= 0 ? '+' : ''}
                    {isCompareMode ? tpDelta.toFixed(3) + 'pp' : fmtPrice(tpDelta)}
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
              </>
            )}
          </div>
        )}
      </div>

      {/* Volume / volatility mini bars (line mode only) */}
      {!isCompareMode && !useCandleMode && primaryValues.length > 1 && (
        <div style={{ marginTop: 2 }}>
          <svg viewBox={`0 0 ${PC_W} 36`} className="block w-full h-auto">
            {(() => {
              const deltas = primaryValues.map((v, i) => i === 0 ? 0 : Math.abs(v - primaryValues[i - 1]));
              const maxDelta = Math.max(...deltas, 1);
              const BAR_H = 28;
              return deltas.map((d, i) => {
                const h = (d / maxDelta) * BAR_H;
                const x = xS(i);
                const barW = Math.max(1, (PC_IW / primaryValues.length) * 0.6);
                return (
                  <rect
                    key={i}
                    x={(x - barW / 2).toFixed(1)}
                    y={(BAR_H - h).toFixed(1)}
                    width={barW.toFixed(1)}
                    height={h.toFixed(1)}
                    fill={safeIdx === i ? '#D4AF37' : 'rgba(212,175,55,0.3)'}
                    rx="1"
                  />
                );
              });
            })()}
            <text x={PC_PAD.l - 5} y={14} textAnchor="end" fill="var(--mute)" fontSize={8} fontFamily="var(--font-mono)">vol</text>
          </svg>
        </div>
      )}
    </div>
  );
}
