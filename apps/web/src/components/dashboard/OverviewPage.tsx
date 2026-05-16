'use client';

import { useState, useCallback } from 'react';
import { useInternationalPrice, useDomesticPrices, usePriceHistory, useComparison } from '@/lib/price.api';
import { useExchangeRates } from '@/lib/exchange-rate.api';
import { useHeatIndex } from '@/lib/heat-index.api';
import { LineChart, Sparkline } from '@/components/ui/ChartPrimitives';
import { IconPlus } from '@/components/dashboard/DashboardShell';
import type { GoldType, ComparisonBrandDto } from '@gpls/shared';
import { useAuth } from '@/contexts/auth-context';
import { usePersonalisationOrder, useRecordView, useAddPin, useRemovePin, useReorderPins } from '@/lib/personalisation.api';
import { useBrowsingContext, useRecordBrowse } from '@/lib/browsing-history.api';
import { DigestCard } from '@/components/DigestCard';
import { ForecastVoteWidget } from '@/components/ForecastVoteWidget';
import { HeatIndexHistoryChart } from '@/components/HeatIndexHistoryChart';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

function minsAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diff < 1) return 'just now';
  return `${diff}m ago`;
}

function HeatIndexGauge() {
  const { data, isLoading } = useHeatIndex();
  const [showTooltip, setShowTooltip] = useState(false);

  const score = data?.value ?? 0;
  const label = data?.category ?? '—';
  const zoneColor = score <= 33 ? '#60A5FA' : score <= 66 ? '#FBBF24' : '#EF4444';
  const arcLen = Math.PI * 50; // ≈ 157
  const visibleArc = (score / 100) * arcLen;

  const needleAngle = (score / 100) * Math.PI;
  const needleX = 60 - Math.cos(needleAngle) * 50;
  const needleY = 66 - Math.sin(needleAngle) * 50;

  const tooltipContent = data
    ? `Velocity: ${data.priceVelocity.toFixed(1)}% · Spread: ${(data.spreadSize / 1_000_000).toFixed(2)}M₫ · Crossings: ${data.thresholdCrossings}`
    : '';

  if (isLoading) return (
    <div style={{ height: 76, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mute)', font: '500 12px/1 var(--font-mono)' }}>
      loading…
    </div>
  );

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 22 }}>
      <svg width="120" height="76" viewBox="0 0 120 76">
        {/* Background arc */}
        <path d="M10 66 A50 50 0 0 1 110 66" stroke="#22232B" strokeWidth="8" fill="none" strokeLinecap="round"/>
        {/* Colored arc up to score */}
        <path d="M10 66 A50 50 0 0 1 110 66"
          stroke={zoneColor} strokeWidth="8" fill="none" strokeLinecap="round"
          strokeDasharray={`${visibleArc} ${arcLen}`}
          strokeDashoffset="0"
        />
        {/* Needle dot */}
        <circle cx={needleX} cy={needleY} r="7" fill={zoneColor} stroke="#0B0B0F" strokeWidth="2"/>
      </svg>
      <div>
        <div style={{ font: '800 44px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
          {score}
        </div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>
          / 100 · {label.toLowerCase()}
        </div>
      </div>
      {/* "?" info icon with tooltip */}
      <span
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{ position: 'absolute', top: 0, right: 0, cursor: 'help', font: '700 11px/1 var(--font-mono)', color: 'var(--mute)', padding: '2px 6px', border: '1px solid var(--line)', borderRadius: 4 }}
      >
        ?
        {showTooltip && tooltipContent && (
          <span style={{ position: 'absolute', bottom: '120%', right: 0, background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', font: '500 11px/1.5 var(--font-mono)', color: 'var(--chalk)', whiteSpace: 'nowrap', zIndex: 100 }}>
            {tooltipContent}
          </span>
        )}
      </span>
    </div>
  );
}

function HeatIndexStats() {
  const { data } = useHeatIndex();
  const stats = [
    { l: 'velocity', v: data ? `${data.priceVelocity.toFixed(1)}%` : '—' },
    { l: 'spread', v: data ? `${(data.spreadSize / 1_000_000).toFixed(2)}M` : '—' },
    { l: 'crossings', v: data ? `${data.thresholdCrossings}` : '—' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--hairline)' }}>
      {stats.map(s => (
        <div key={s.l}>
          <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>{s.l}</div>
          <div style={{ font: '700 16px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
        </div>
      ))}
    </div>
  );
}

function ExchangeRateCard() {
  const { data: fx } = useExchangeRates();

  const sourceBadgeColor =
    fx?.source === 'live' ? 'var(--live)' :
    fx?.source === 'stale' ? 'var(--gold)' :
    'var(--mute)';

  return (
    <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 24px' }}>
      {/* Card header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ font: '700 9px/1 var(--font-mono)', color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          exchange rates
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {fx && (
            <>
              <span style={{ font: '700 9px/1 var(--font-mono)', color: sourceBadgeColor, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                {fx.source}
              </span>
              <span style={{ font: '700 9px/1 var(--font-mono)', color: 'var(--mute)', letterSpacing: '0.08em' }}>
                {minsAgo(fx.updatedAt)}
              </span>
            </>
          )}
          {!fx && (
            <span style={{ font: '700 9px/1 var(--font-mono)', color: 'var(--mute)', letterSpacing: '0.08em' }}>loading…</span>
          )}
        </div>
      </div>

      {/* Two-column rate display */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* USD/VND */}
        <div style={{ padding: 14, background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 10 }}>
          <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>
            usd / vnd
          </div>
          <div style={{ font: '700 22px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
            {fx ? fx.usdVnd.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}
          </div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--mute)', marginTop: 6 }}>per 1 usd</div>
        </div>

        {/* EUR/VND */}
        <div style={{ padding: 14, background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 10 }}>
          <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>
            eur / vnd
          </div>
          <div style={{ font: '700 22px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
            {fx ? fx.eurVnd.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}
          </div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--mute)', marginTop: 6 }}>per 1 eur</div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d === 0) return 'today';
  if (d === 1) return '1d ago';
  return `${d}d ago`;
}

function PinIcon({ pinned, onClick }: { pinned: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      title={pinned ? 'Unpin' : 'Pin'}
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '2px 4px',
        display: 'flex',
        alignItems: 'center',
        color: pinned ? 'var(--gold)' : 'var(--mute)',
        fontSize: 14,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      📌
    </button>
  );
}

interface PriceRowProps {
  brand: string;
  goldType: string;
  buyPrice: number;
  sellPrice: number;
  isBestBuy: boolean;
  isBestSell: boolean;
  isLoggedIn: boolean;
  isPinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
  onClick: () => void;
  rowIndex: number;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

function DragHandle({ dragHandleProps }: { dragHandleProps?: React.HTMLAttributes<HTMLDivElement> }) {
  return (
    <div
      {...dragHandleProps}
      title="Drag to reorder"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 20,
        height: 20,
        cursor: 'grab',
        color: 'var(--mute)',
        fontSize: 13,
        flexShrink: 0,
        opacity: 0.5,
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      ⠿
    </div>
  );
}

function BrowsingBadge({ brand, goldType }: { brand: string; goldType: string }) {
  const { data: ctx } = useBrowsingContext(brand, goldType, true);
  if (!ctx) return null;
  const formattedPrice = ctx.buyPrice != null
    ? new Intl.NumberFormat('vi-VN').format(ctx.buyPrice) + '₫'
    : null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 6 }}>
      <span className="mono" style={{ fontSize: 9, color: 'var(--mute)' }}>
        Đã xem {daysAgo(ctx.lastViewedAt)}
        {formattedPrice && <> · {formattedPrice}</>}
      </span>
      {ctx.deltaPct !== null && (
        <span
          className="mono"
          style={{
            fontSize: 9,
            color: ctx.deltaPct >= 0 ? 'var(--up)' : 'var(--down)',
            fontWeight: 700,
          }}
        >
          ({ctx.deltaPct >= 0 ? '+' : ''}{ctx.deltaPct.toFixed(2)}%)
        </span>
      )}
    </span>
  );
}

function PriceRow({
  brand, goldType, buyPrice, sellPrice, isBestBuy, isBestSell,
  isLoggedIn, isPinned, onPin, onUnpin, onClick, rowIndex, dragHandleProps,
}: PriceRowProps) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: (isPinned && isLoggedIn ? '20px ' : '') + '2fr 1fr 1fr 1fr' + (isLoggedIn ? ' 32px' : ''),
        padding: '16px 24px',
        alignItems: 'center',
        borderTop: rowIndex === 0 ? 'none' : '1px solid var(--hairline)',
        background: isBestBuy ? 'rgba(212,175,55,0.04)' : 'transparent',
        cursor: isLoggedIn ? 'pointer' : 'default',
      }}
    >
      {isPinned && isLoggedIn && (
        <DragHandle dragHandleProps={dragHandleProps} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 6,
          background: 'var(--ink-3)', border: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          font: '800 11px/1 var(--font-mono)', color: 'var(--gold)', letterSpacing: '0.06em',
        }}>
          {brand.slice(0, 2)}
        </div>
        <div style={{ font: '700 14px/1.1 var(--font-display)' }}>{brand}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div style={{ font: '700 15px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
            {fmtVnd(buyPrice)}
          </div>
          {isLoggedIn && <BrowsingBadge brand={brand} goldType={goldType} />}
        </div>
        {isBestBuy && (
          <div className="mono" style={{ fontSize: 9, color: 'var(--up)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>
            ▲ best
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{
          font: '700 15px/1 var(--font-display)',
          fontVariantNumeric: 'tabular-nums',
          color: isBestSell ? 'var(--gold)' : 'var(--chalk)',
        }}>
          {fmtVnd(sellPrice)}
        </div>
        {isBestSell && (
          <div className="mono" style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>
            ▼ lowest
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="mono" style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {((sellPrice - buyPrice) / 1_000_000).toFixed(2)}M
        </div>
      </div>
      {isLoggedIn && (
        <PinIcon
          pinned={isPinned}
          onClick={(e) => {
            e.stopPropagation();
            if (isPinned) onUnpin();
            else onPin();
          }}
        />
      )}
    </div>
  );
}

// ─── SortablePriceRow ─────────────────────────────────────────────────────────

type SortablePriceRowProps = Omit<PriceRowProps, 'dragHandleProps'> & { id: string };

function SortablePriceRow(props: SortablePriceRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 1 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <PriceRow
        {...props}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function OverviewPage({ currency, onNavigateAlerts }: { currency: string; onNavigateAlerts: () => void }) {
  const [range, setRange] = useState<Range>('1M');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { user } = useAuth();
  const isLoggedIn = user !== null;

  const { data: intl } = useInternationalPrice();
  const { data: domestic } = useDomesticPrices();
  const { data: history } = usePriceHistory('SJC', 'MIEN_SJC', range);
  const { data: comparison } = useComparison('MIEN_SJC' as GoldType);

  const { data: personalisationOrder } = usePersonalisationOrder();
  const recordView = useRecordView();
  const recordBrowse = useRecordBrowse();
  const addPin = useAddPin();
  const removePin = useRemovePin();
  const reorderPins = useReorderPins();

  // Local order state for pinned brands (used by DnD)
  const [pinnedOrder, setPinnedOrder] = useState<Array<{ brand: string; goldType: string }> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

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
  const compRow = comparison?.[0];
  const compBrands = compRow?.brands ?? [];
  const compGoldType = compRow?.goldType ?? 'MIEN_SJC';
  // Fall back to domestic prices for brand spreads (unused but kept for future)
  void domestic;

  const FALLBACK_BRANDS: ComparisonBrandDto[] = [
    { brand: 'SJC', buyPrice: 76420000, sellPrice: 78920000, isBestBuy: false, isBestSell: false, crawlSessionId: '' },
    { brand: 'DOJI', buyPrice: 76300000, sellPrice: 78700000, isBestBuy: true, isBestSell: true, crawlSessionId: '' },
  ];
  const displayBrands = compBrands.length > 0 ? compBrands : FALLBACK_BRANDS;

  function handleRowClick(brand: string, goldType: string, buyPrice: number) {
    if (!isLoggedIn) return;
    recordView.mutate({ brand, goldType });
    recordBrowse.mutate({ brand, goldType, buyPrice });
  }

  function isPinnedRow(brand: string, goldType: string): boolean {
    return (personalisationOrder ?? []).some(
      p => p.brand === brand && p.goldType === goldType && p.isPinned,
    );
  }

  // Build the sorted list of pinned brand+goldType keys from server data,
  // falling back to local state during an active drag session
  const serverPinnedItems = (personalisationOrder ?? [])
    .filter((p) => p.isPinned)
    .sort((a, b) => (a.pinOrder ?? 0) - (b.pinOrder ?? 0))
    .map((p) => ({ brand: p.brand, goldType: p.goldType }));

  const activePinnedItems = pinnedOrder ?? serverPinnedItems;
  const pinnedIds = activePinnedItems.map((p) => `${p.brand}__${p.goldType}`);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) {
        setPinnedOrder(null);
        return;
      }
      const oldIndex = activePinnedItems.findIndex((p) => `${p.brand}__${p.goldType}` === active.id);
      const newIndex = activePinnedItems.findIndex((p) => `${p.brand}__${p.goldType}` === over.id);
      const newOrder = arrayMove(activePinnedItems, oldIndex, newIndex);
      setPinnedOrder(newOrder);
      reorderPins.mutate(newOrder, {
        onSettled: () => setPinnedOrder(null),
      });
    },
    [activePinnedItems, reorderPins],
  );

  return (
    <div style={{ padding: '24px 28px 40px' }}>
      <DigestCard />
    <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
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

        {/* Exchange Rate card */}
        <ExchangeRateCard />

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
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr' + (isLoggedIn ? ' 32px' : ''), padding: '12px 24px', font: '700 10px/1 var(--font-mono)', color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', background: 'var(--ink-3)', borderBottom: '1px solid var(--hairline)' }}>
            <span>brand</span><span style={{ textAlign: 'right' }}>buy</span><span style={{ textAlign: 'right' }}>sell</span><span style={{ textAlign: 'right' }}>spread</span>
            {isLoggedIn && <span/>}
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={pinnedIds} strategy={verticalListSortingStrategy}>
              {displayBrands.map((b, i) => {
                const pinned = isPinnedRow(b.brand, compGoldType);
                const id = `${b.brand}__${compGoldType}`;
                if (pinned && isLoggedIn) {
                  return (
                    <SortablePriceRow
                      key={b.brand}
                      id={id}
                      brand={b.brand}
                      goldType={compGoldType}
                      buyPrice={b.buyPrice}
                      sellPrice={b.sellPrice}
                      isBestBuy={b.isBestBuy}
                      isBestSell={b.isBestSell}
                      isLoggedIn={isLoggedIn}
                      isPinned={true}
                      onPin={() => addPin.mutate({ brand: b.brand, goldType: compGoldType })}
                      onUnpin={() => removePin.mutate({ brand: b.brand, goldType: compGoldType })}
                      onClick={() => handleRowClick(b.brand, compGoldType, b.buyPrice)}
                      rowIndex={i}
                    />
                  );
                }
                return (
                  <PriceRow
                    key={b.brand}
                    brand={b.brand}
                    goldType={compGoldType}
                    buyPrice={b.buyPrice}
                    sellPrice={b.sellPrice}
                    isBestBuy={b.isBestBuy}
                    isBestSell={b.isBestSell}
                    isLoggedIn={isLoggedIn}
                    isPinned={false}
                    onPin={() => addPin.mutate({ brand: b.brand, goldType: compGoldType })}
                    onUnpin={() => removePin.mutate({ brand: b.brand, goldType: compGoldType })}
                    onClick={() => handleRowClick(b.brand, compGoldType, b.buyPrice)}
                    rowIndex={i}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
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
          </div>
          <HeatIndexGauge />
          <HeatIndexStats />
        </div>

        {/* Heat Index 7-day trend */}
        <HeatIndexHistoryChart />

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

        {/* Community forecast */}
        <ForecastVoteWidget />
      </div>
    </div>
    </div>
  );
}
