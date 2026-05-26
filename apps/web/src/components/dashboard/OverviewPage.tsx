'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useInternationalPrice, useDomesticPrices, usePriceHistory, useComparison } from '@/lib/price.api';
import { useExchangeRates } from '@/lib/exchange-rate.api';
import { useHeatIndex } from '@/lib/heat-index.api';
import { useAlerts } from '@/lib/alerts.api';
import { Sparkline } from '@/components/ui/ChartPrimitives';
import { PriceChart } from '@/components/ui/PriceChart';
import { IconPlus } from '@/components/dashboard/DashboardShell';
import type { GoldType, ComparisonBrandDto } from '@gpls/shared';
import { useAuth } from '@/contexts/auth-context';
import { usePersonalisationOrder, useRecordView, useAddPin, useRemovePin, useReorderPins } from '@/lib/personalisation.api';
import { useBrowsingContext, useRecordBrowse } from '@/lib/browsing-history.api';
import { DigestCard } from '@/components/DigestCard';
import { ForecastVoteWidget } from '@/components/ForecastVoteWidget';
import { HeatIndexHistoryChart } from '@/components/HeatIndexHistoryChart';
import { ArbitrageWidget } from '@/components/ArbitrageWidget';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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

const KARATS = [
  { karat: '24K', pct: 99.9, multiplier: 1 },
  { karat: '22K', pct: 91.6, multiplier: 0.916 },
  { karat: '18K', pct: 75.0, multiplier: 0.75 },
] as const;

function fmtVnd(n: number) { return (n / 1_000_000).toFixed(2) + 'M₫'; }
function fmtUsd(n: number) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function minsAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diff < 1) return 'vừa xong';
  return `${diff} phút trước`;
}

function HeatIndexGauge() {
  const { data, isLoading } = useHeatIndex();
  const [showTooltip, setShowTooltip] = useState(false);

  const score = data?.value ?? 0;
  const label = data?.category ?? '—';
  const zoneColor = score <= 33 ? '#60A5FA' : score <= 66 ? '#FBBF24' : '#EF4444';
  const arcLen = Math.PI * 50;
  const visibleArc = (score / 100) * arcLen;
  const needleAngle = (score / 100) * Math.PI;
  const needleX = 60 - Math.cos(needleAngle) * 50;
  const needleY = 66 - Math.sin(needleAngle) * 50;
  const tooltipContent = data
    ? `Vận tốc: ${data.priceVelocity?.toFixed(1) ?? '—'}% · Chênh lệch: ${data.spreadSize != null ? (data.spreadSize / 1_000_000).toFixed(2) : '—'}M₫ · Vượt ngưỡng: ${data.thresholdCrossings ?? '—'}`
    : '';

  if (isLoading) return (
    <div className="h-[76px] flex items-center justify-center text-mute font-mono text-[12px] leading-none font-medium">
      Đang tải…
    </div>
  );

  return (
    <div className="relative flex items-center gap-[22px]">
      <svg width="120" height="76" viewBox="0 0 120 76">
        <path d="M10 66 A50 50 0 0 1 110 66" stroke="#22232B" strokeWidth="8" fill="none" strokeLinecap="round"/>
        <path d="M10 66 A50 50 0 0 1 110 66"
          stroke={zoneColor} strokeWidth="8" fill="none" strokeLinecap="round"
          strokeDasharray={`${visibleArc} ${arcLen}`}
          strokeDashoffset="0"
        />
        <circle cx={needleX} cy={needleY} r="7" fill={zoneColor} stroke="#0B0B0F" strokeWidth="2"/>
      </svg>
      <div>
        <div className="text-[44px] leading-none font-extrabold font-sans tabular-nums">{score}</div>
        <div className="font-mono text-[10px] text-mute tracking-[0.12em] uppercase mt-1">/ 100 · {label.toLowerCase()}</div>
      </div>
      <span
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="absolute top-0 right-0 cursor-help font-mono text-[11px] leading-none font-bold text-mute px-[6px] py-[2px] border border-line rounded"
      >
        ?
        {showTooltip && tooltipContent && (
          <span className="absolute bottom-[120%] right-0 bg-ink-3 border border-line rounded-lg px-3 py-2 font-mono text-[11px] leading-[1.5] font-medium text-chalk whitespace-nowrap z-[100]">
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
    { l: 'Vận tốc', v: data ? `${data.priceVelocity?.toFixed(1) ?? '—'}%` : '—' },
    { l: 'Chênh lệch', v: data ? `${data.spreadSize != null ? (data.spreadSize / 1_000_000).toFixed(2) : '—'}M` : '—' },
    { l: 'Vượt ngưỡng', v: data ? `${data.thresholdCrossings}` : '—' },
  ];
  return (
    <div className="grid grid-cols-3 gap-3 mt-[18px] pt-[14px] border-t border-hairline">
      {stats.map(s => (
        <div key={s.l}>
          <div className="font-mono text-[9px] text-mute tracking-[0.14em] uppercase mb-1">{s.l}</div>
          <div className="text-[16px] leading-none font-bold font-sans tabular-nums">{s.v}</div>
        </div>
      ))}
    </div>
  );
}

function ExchangeRateCard() {
  const { data: fx } = useExchangeRates();
  const sourceBadgeColor =
    fx?.source === 'live' ? 'text-live' :
    fx?.source === 'stale' ? 'text-gold' :
    'text-mute';
  const sourceLabel =
    fx?.source === 'live' ? 'Trực tiếp' :
    fx?.source === 'stale' ? 'Dữ liệu cũ' :
    fx?.source ?? '';

  return (
    <div className="bg-ink-2 border border-line rounded-[14px] px-6 py-[18px]">
      <div className="flex justify-between items-center mb-4">
        <span className="font-mono text-[9px] text-mute tracking-[0.14em] uppercase leading-none font-bold">tỷ giá</span>
        <div className="flex items-center gap-2">
          {fx && (
            <>
              <span className={cn('font-mono text-[9px] leading-none font-bold tracking-[0.14em] uppercase', sourceBadgeColor)}>
                {sourceLabel}
              </span>
              <span className="font-mono text-[9px] text-mute tracking-[0.08em] leading-none font-bold">
                {minsAgo(fx.updatedAt)}
              </span>
            </>
          )}
          {!fx && <span className="font-mono text-[9px] text-mute tracking-[0.08em] leading-none font-bold">Đang tải…</span>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-[14px] bg-ink-3 border border-line rounded-[10px]">
          <div className="font-mono text-[9px] text-mute tracking-[0.14em] uppercase mb-[6px]">usd / vnd</div>
          <div className="text-[22px] leading-none font-bold font-sans tabular-nums">
            {fx ? fx.usdVnd.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}
          </div>
          <div className="font-mono text-[10px] text-mute mt-[6px]">trên 1 USD</div>
        </div>
        <div className="p-[14px] bg-ink-3 border border-line rounded-[10px]">
          <div className="font-mono text-[9px] text-mute tracking-[0.14em] uppercase mb-[6px]">eur / vnd</div>
          <div className="text-[22px] leading-none font-bold font-sans tabular-nums">
            {fx ? fx.eurVnd.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}
          </div>
          <div className="font-mono text-[10px] text-mute mt-[6px]">trên 1 EUR</div>
        </div>
      </div>
    </div>
  );
}

function daysAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d === 0) return 'hôm nay';
  if (d === 1) return '1 ngày trước';
  return `${d} ngày trước`;
}

function PinIcon({ pinned, onClick }: { pinned: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      title={pinned ? 'Bỏ ghim' : 'Ghim'}
      className={cn(
        'w-auto h-auto px-1 py-0.5 text-[14px] leading-none shrink-0 hover:bg-transparent',
        pinned ? 'text-gold' : 'text-mute',
      )}
    >
      📌
    </Button>
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
  fmt: (vnd: number) => string;
}

function DragHandle({ dragHandleProps }: { dragHandleProps?: React.HTMLAttributes<HTMLDivElement> }) {
  return (
    <div
      {...dragHandleProps}
      title="Kéo để sắp xếp"
      className="flex items-center justify-center w-5 h-5 cursor-grab text-mute text-[13px] shrink-0 opacity-50 select-none touch-none"
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
    <span className="inline-flex items-center gap-1 ml-[6px]">
      <span className="font-mono text-[9px] text-mute">
        Đã xem {daysAgo(ctx.lastViewedAt)}
        {formattedPrice && <> · {formattedPrice}</>}
      </span>
      {ctx.deltaPct !== null && (
        <span
          className={cn(
            'font-mono text-[9px] font-bold',
            ctx.deltaPct >= 0 ? 'text-up' : 'text-down',
          )}
        >
          ({ctx.deltaPct >= 0 ? '+' : ''}{ctx.deltaPct.toFixed(2)}%)
        </span>
      )}
    </span>
  );
}

function PriceRow({
  brand, goldType, buyPrice, sellPrice, isBestBuy, isBestSell,
  isLoggedIn, isPinned, onPin, onUnpin, onClick, rowIndex, dragHandleProps, fmt,
}: PriceRowProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'grid px-6 py-4 items-center',
        rowIndex !== 0 && 'border-t border-hairline',
        isBestBuy ? 'bg-[rgba(212,175,55,0.04)]' : 'bg-transparent',
        isLoggedIn ? 'cursor-pointer' : 'cursor-default',
      )}
      style={{
        gridTemplateColumns: (isPinned && isLoggedIn ? '20px ' : '') + '2fr 1fr 1fr 1fr' + (isLoggedIn ? ' 32px' : ''),
      }}
    >
      {isPinned && isLoggedIn && <DragHandle dragHandleProps={dragHandleProps} />}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-md bg-ink-3 border border-line flex items-center justify-center font-mono text-[11px] font-extrabold text-gold tracking-[0.06em]">
          {brand.slice(0, 2)}
        </div>
        <div className="text-[14px] leading-[1.1] font-bold font-sans">{brand}</div>
      </div>
      <div className="text-right">
        <div className="inline-flex items-center flex-wrap justify-end">
          <div className="text-[15px] leading-none font-bold font-sans tabular-nums">{fmt(buyPrice)}</div>
          {isLoggedIn && <BrowsingBadge brand={brand} goldType={goldType} />}
        </div>
        {isBestBuy && (
          <div className="font-mono text-[9px] text-up tracking-[0.14em] uppercase mt-1">▲ tốt nhất</div>
        )}
      </div>
      <div className="text-right">
        <div className={cn('text-[15px] leading-none font-bold font-sans tabular-nums', isBestSell ? 'text-gold' : 'text-chalk')}>
          {fmt(sellPrice)}
        </div>
        {isBestSell && (
          <div className="font-mono text-[9px] text-gold tracking-[0.14em] uppercase mt-1">▼ thấp nhất</div>
        )}
      </div>
      <div className="text-right">
        <div className="font-mono text-[13px] font-bold tabular-nums">{fmt(sellPrice - buyPrice)}</div>
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
      <PriceRow {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

export function OverviewPage({ currency, onNavigateAlerts }: { currency: string; onNavigateAlerts: () => void }) {
  const [range, setRange] = useState<Range>('1M');
  const [hoverPrice, setHoverPrice] = useState<number | null>(null);

  const { user } = useAuth();
  const isLoggedIn = user !== null;
  const router = useRouter();

  function handleNavigateAlerts() {
    if (!isLoggedIn) {
      router.push('/auth/login?from=%2F');
      return;
    }
    onNavigateAlerts();
  }

  const { data: intl } = useInternationalPrice();
  const { data: domestic } = useDomesticPrices();
  const { data: history } = usePriceHistory('SJC', 'MIEN_SJC', range);
  const { data: history1D } = usePriceHistory('SJC', 'MIEN_SJC', '1D');
  const { data: comparison } = useComparison('MIEN_SJC' as GoldType);
  const { data: alertsData } = useAlerts();
  const { data: rates } = useExchangeRates();

  const fmt = (vnd: number): string => {
    if (currency === 'USD' && rates) return '$' + (vnd / rates.usdVnd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (currency === 'EUR' && rates) return '€' + (vnd / rates.eurVnd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (vnd / 1_000_000).toFixed(2) + 'M₫';
  };

  const change1D = (() => {
    if (!history1D || history1D.length < 2) return null;
    const first = history1D[0].buyPrice;
    const last = history1D[history1D.length - 1].buyPrice;
    return ((last - first) / first) * 100;
  })();

  const { data: personalisationOrder } = usePersonalisationOrder();
  const recordView = useRecordView();
  const recordBrowse = useRecordBrowse();
  const addPin = useAddPin();
  const removePin = useRemovePin();
  const reorderPins = useReorderPins();

  const [pinnedOrder, setPinnedOrder] = useState<Array<{ brand: string; goldType: string }> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const chartData = (history ?? []).map(p => p.buyPrice);
  const displayData = chartData.length > 1 ? chartData : [2280, 2295, 2310, 2325, 2345];
  const hoverVal = hoverPrice ?? displayData[displayData.length - 1];

  const compRow = comparison?.[0];
  const compBrands = compRow?.brands ?? [];
  const compGoldType = compRow?.goldType ?? 'MIEN_SJC';
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
    <div className="px-7 pt-6 pb-10">
      <DigestCard />
      <div className="grid gap-5" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
        {/* ── Left column */}
        <div className="flex flex-col gap-5 min-w-0">

          {/* Hero price card */}
          <div
            className="bg-ink-2 border border-line rounded-[14px] px-7 pt-[26px] pb-[22px] overflow-hidden"
            style={{ clipPath: 'polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)' }}
          >
            <div className="flex justify-between items-center mb-[18px]">
              <span className="stamp">XAU/USD · london spot · 24K</span>
              <span className="font-mono text-[11px] text-mute">{intl ? 'trực tiếp' : 'đang tải…'}</span>
            </div>
            <div className="flex items-end gap-8">
              <div>
                <div className="font-mono text-[10px] text-mute tracking-[0.14em] uppercase mb-2">giao ngay · mỗi troy oz</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[76px] leading-[0.95] font-extrabold font-sans tracking-[-0.035em] tabular-nums">
                    ${intl ? Math.floor(intl.spotPriceUsd).toLocaleString() : '2,345'}
                  </span>
                  <span className="text-[44px] leading-none font-extrabold font-sans text-gold tabular-nums">
                    .{intl ? String(Math.round(intl.spotPriceUsd * 100) % 100).padStart(2, '0') : '67'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <span className={cn(
                    'inline-flex items-center gap-[6px] font-mono text-[14px] leading-none font-bold px-[10px] py-[7px] rounded',
                    change1D != null && change1D < 0
                      ? 'text-down bg-[rgba(229,72,77,0.10)]'
                      : 'text-up bg-[rgba(88,200,150,0.10)]',
                  )}>
                    <svg width="11" height="11" viewBox="0 0 10 10">
                      <path d={change1D != null && change1D < 0 ? 'M5 9l4-6H1z' : 'M5 1l4 6H1z'} fill={change1D != null && change1D < 0 ? 'var(--down)' : 'var(--up)'}/>
                    </svg>
                    {change1D != null ? (change1D >= 0 ? '+' : '') + change1D.toFixed(2) + '%' : '—'}
                  </span>
                  <span className="font-mono text-[11px] text-mute">24h</span>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div className="p-[14px] bg-ink-3 border border-line rounded-[10px]">
                  <div className="font-mono text-[9px] text-mute tracking-[0.14em] uppercase mb-[6px]">mỗi lượng · vnd</div>
                  <div className="text-[22px] leading-none font-bold font-sans tabular-nums">
                    {intl ? (intl.spotPriceVnd / 1_000_000).toFixed(2) : '78.92'}
                    <span className="text-mute text-[14px] ml-1">M₫</span>
                  </div>
                  <div className={cn('font-mono text-[10px] mt-[6px]', change1D != null && change1D < 0 ? 'text-down' : 'text-up')}>
                    {change1D != null ? (change1D >= 0 ? '+' : '') + change1D.toFixed(2) + '%' : '—'}
                  </div>
                </div>
                <div className="p-[14px] bg-ink-3 border border-line rounded-[10px]">
                  <div className="font-mono text-[9px] text-mute tracking-[0.14em] uppercase mb-[6px]">usd / vnd</div>
                  <div className="text-[22px] leading-none font-bold font-sans tabular-nums">
                    {intl ? intl.exchangeRate.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '24,815'}
                  </div>
                  <div className="font-mono text-[10px] text-mute mt-[6px]">—</div>
                </div>
              </div>
            </div>
          </div>

          {/* Exchange Rate card */}
          <ExchangeRateCard />

          {/* Chart card */}
          <div className="bg-ink-2 border border-line rounded-[14px] p-6">
            <div className="flex justify-between items-center mb-[14px]">
              <div>
                <h3 className="text-[18px] leading-none font-bold font-sans m-0 tracking-[-0.01em]">Lịch sử giá</h3>
                <div className="font-mono text-[11px] text-mute mt-[6px]">
                  SJC Miếng · <span className="text-chalk">{fmt(hoverVal)}</span>
                </div>
              </div>
              <div className="flex gap-0">
                {RANGE_LABELS.map((r, i) => (
                  <Button
                    key={r}
                    variant="outline"
                    onClick={() => setRange(r)}
                    className={cn(
                      'h-[30px] px-[10px] font-mono text-[11px] leading-none font-bold tracking-[0.1em] uppercase rounded-none border-line',
                      i === 0 && 'rounded-l-[6px]',
                      i === RANGE_LABELS.length - 1 && 'rounded-r-[6px]',
                      i < RANGE_LABELS.length - 1 && 'border-r-0',
                      range === r
                        ? 'border-gold bg-gold text-gold-ink hover:bg-gold hover:text-gold-ink'
                        : 'bg-transparent text-bone hover:bg-ink-3',
                    )}
                  >{r}</Button>
                ))}
              </div>
            </div>
            <PriceChart history={history ?? []} range={range} onHoverPrice={setHoverPrice} chartId="overview-pc" />
          </div>

          {/* Brand spreads table */}
          <div className="bg-ink-2 border border-line rounded-[14px]">
            <div className="flex items-center justify-between px-6 py-[18px] border-b border-hairline">
              <h3 className="text-[18px] leading-none font-bold font-sans m-0 tracking-[-0.01em]">Chênh lệch các thương hiệu nội địa</h3>
              <span className="font-mono text-[10px] text-mute tracking-[0.12em] uppercase">vnd mỗi lượng · tốt nhất nổi bật</span>
            </div>
            <div
              className="px-6 py-3 font-mono text-[10px] text-mute tracking-[0.14em] uppercase bg-ink-3 border-b border-hairline grid"
              style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' + (isLoggedIn ? ' 32px' : '') }}
            >
              <span>thương hiệu</span>
              <span className="text-right">mua</span>
              <span className="text-right">bán</span>
              <span className="text-right">chênh lệch</span>
              {isLoggedIn && <span/>}
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
                        fmt={fmt}
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
                      fmt={fmt}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* ── Right column */}
        <div className="flex flex-col gap-5 min-w-0">

          {/* Karat strip */}
          <div className="bg-ink-2 border border-line rounded-[14px] p-5">
            <div className="flex justify-between items-baseline mb-[14px]">
              <h3 className="text-[16px] leading-none font-bold font-sans m-0">Theo karat</h3>
              <span className="font-mono text-[10px] text-mute tracking-[0.12em] uppercase">mỗi oz · usd</span>
            </div>
            {KARATS.map((k, i) => {
              const price = intl ? intl.spotPriceUsd * k.multiplier : 0;
              const karatDir: 'up' | 'down' = change1D != null && change1D < 0 ? 'down' : 'up';
              const karatSpark = history1D && history1D.length > 0
                ? history1D.slice(-12).map(p => (p.buyPrice / 1_000_000) * k.multiplier)
                : [];
              const changeStr = change1D != null ? (change1D >= 0 ? '+' : '') + change1D.toFixed(2) + '%' : '—';
              return (
                <div
                  key={k.karat}
                  className={cn('grid items-center gap-3 py-[14px]', i !== 0 && 'border-t border-hairline')}
                  style={{ gridTemplateColumns: '52px 1fr 80px 60px' }}
                >
                  <div className="text-[18px] leading-none font-extrabold font-sans text-gold tracking-[-0.02em]">{k.karat}</div>
                  <div>
                    <div className="text-[20px] leading-none font-bold font-sans tabular-nums">{price > 0 ? fmtUsd(price) : '…'}</div>
                    <div className="font-mono text-[10px] text-mute mt-1">{k.pct}% độ tinh khiết</div>
                  </div>
                  <Sparkline data={karatSpark.length > 0 ? karatSpark : [1,1,1,1,1,1,1,1,1,1,1,1]} w={80} h={28} dir={karatDir}/>
                  <div className={cn('font-mono text-[11px] text-right font-bold', karatDir === 'up' ? 'text-up' : 'text-down')}>{changeStr}</div>
                </div>
              );
            })}
          </div>

          {/* Market heat */}
          <div className="bg-ink-2 border border-line rounded-[14px] p-5">
            <div className="flex justify-between items-baseline mb-[14px]">
              <h3 className="text-[16px] leading-none font-bold font-sans m-0">Nhiệt độ thị trường</h3>
            </div>
            <HeatIndexGauge />
            <HeatIndexStats />
          </div>

          {/* Arbitrage opportunities */}
          <ArbitrageWidget />

          {/* Heat Index 7-day trend */}
          <HeatIndexHistoryChart />

          {/* Alerts widget */}
          <div className="bg-ink-2 border border-line rounded-[14px] p-5">
            <div className="flex justify-between items-baseline mb-[14px]">
              <h3 className="text-[16px] leading-none font-bold font-sans m-0">Cảnh báo của bạn</h3>
              <Button
                variant="ghost"
                onClick={handleNavigateAlerts}
                className="h-auto px-0 py-0 font-mono text-[11px] text-gold tracking-[0.08em] leading-none font-bold hover:bg-transparent hover:text-gold"
              >
                xem tất cả →
              </Button>
            </div>
            {!isLoggedIn && (
              <div className="py-5 text-center text-mute font-mono text-[12px] leading-none font-medium">
                đăng nhập để xem cảnh báo
              </div>
            )}
            {isLoggedIn && alertsData?.length === 0 && (
              <div className="py-5 text-center text-mute font-mono text-[12px] leading-none font-medium">
                chưa có cảnh báo
              </div>
            )}
            {isLoggedIn && (alertsData ?? []).slice(0, 3).map((a, i) => {
              const isFired = a.status === 'triggered';
              return (
                <div
                  key={a.id}
                  className={cn('flex items-center justify-between py-3', i !== 0 && 'border-t border-hairline')}
                >
                  <div className="flex items-center gap-[10px]">
                    <span className="font-mono text-[10px] font-bold text-gold tracking-[0.1em] px-[6px] py-[3px] border border-gold rounded-[3px]">{a.brand}</span>
                    <span className="font-mono text-[13px] text-bone leading-none font-medium">{a.condition === 'gte' ? '≥' : '≤'}</span>
                    <span className="text-[14px] leading-none font-bold font-sans tabular-nums">{(Number(a.thresholdPrice) / 1_000_000).toFixed(2)}M₫</span>
                  </div>
                  <span className={cn(
                    'font-mono text-[9px] leading-none font-bold tracking-[0.14em] uppercase px-[7px] py-[4px] rounded-[3px] border',
                    isFired ? 'text-gold-ink bg-gold border-gold' : 'text-mute bg-transparent border-line',
                  )}>
                    {isFired ? 'đã kích hoạt' : 'đang chờ'}
                  </span>
                </div>
              );
            })}
            <Button
              onClick={handleNavigateAlerts}
              className="w-full h-11 mt-[10px] gap-2 bg-gold text-gold-ink border border-gold rounded-[10px] font-mono text-[14px] leading-none font-bold tracking-[0.04em] uppercase hover:bg-gold/90 hover:text-gold-ink"
            >
              <IconPlus s={15}/> thêm cảnh báo
            </Button>
          </div>

          {/* Community forecast */}
          <ForecastVoteWidget />
        </div>
      </div>
    </div>
  );
}
