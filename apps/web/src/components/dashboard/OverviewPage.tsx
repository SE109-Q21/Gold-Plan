'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useInternationalPrice, useDomesticPrices, usePriceHistory, useComparison } from '@/lib/price.api';
import { useExchangeRates } from '@/lib/exchange-rate.api';
import { useAlerts } from '@/lib/alerts.api';
import { PriceChart } from '@/components/ui/PriceChart';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { LiveBadge } from '@/components/ui/LiveBadge';
import { IconPlus } from '@/components/dashboard/DashboardShell';
import type { GoldType, ComparisonBrandDto } from '@gpls/shared';
import { useAuth } from '@/contexts/auth-context';
import { usePersonalisationOrder, useRecordView, useAddPin, useRemovePin, useReorderPins } from '@/lib/personalisation.api';
import { useBrowsingContext, useRecordBrowse } from '@/lib/browsing-history.api';
import { DigestCard } from '@/components/DigestCard';
import { ForecastVoteWidget } from '@/components/ForecastVoteWidget';
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

const RANGE_LABELS = ['1D', '1W', '1M', '3M', '1Y'] as const;

const BRAND_LABELS: Record<string, string> = {
  SJC: 'SJC', DOJI: 'DOJI', PNJ: 'PNJ', BAO_TIN: 'Bảo Tín',
};

const GOLD_TYPE_LABELS: Record<string, string> = {
  MIEN_SJC: 'Miếng SJC',
  NHAN_9999: 'Nhẫn 9999',
  VANG_24K: 'Vàng 24K',
};

const DISPLAY_GOLD_TYPES = ['MIEN_SJC', 'NHAN_9999', 'VANG_24K'] as const;
type Range = '1D' | '1W' | '1M' | '3M' | '1Y';

function fmtVnd(n: number) { return (n / 1_000_000).toFixed(2) + 'M₫'; }

function minsAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diff < 1) return 'vừa xong';
  return `${diff} phút trước`;
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
        <BrandLogo brand={brand} size={36} />
        <div className="text-[14px] leading-[1.1] font-bold font-sans">{BRAND_LABELS[brand] ?? brand}</div>
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
  const { data: history, isLoading: historyLoading } = usePriceHistory('SJC', 'MIEN_SJC', range);
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

  const liveTableRows = DISPLAY_GOLD_TYPES.map(gt => {
    const entries = (domestic ?? []).filter(d => d.goldType === gt);
    return entries.find(d => d.brand === 'SJC') ?? entries[0] ?? null;
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  const compRow = comparison?.[0];
  const compBrands = compRow?.brands ?? [];
  const compGoldType = compRow?.goldType ?? 'MIEN_SJC';

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
              <span className="stamp">XAU/USD · london giao ngay · 24K</span>
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
                  <div className="font-mono text-[9px] text-mute tracking-[0.14em] uppercase mb-[6px]">mỗi lượng · {currency.toLowerCase()}</div>
                  <div className="text-[22px] leading-none font-bold font-sans tabular-nums">
                    {intl ? fmt(intl.spotPriceVnd) : '—'}
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
              <div className="flex flex-col items-end gap-[6px]">
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
                {history && history.length > 0 && (
                  <span className="font-mono text-[9px] text-mute tracking-[0.06em] leading-none">
                    cập nhật {minsAgo(history[history.length - 1].recordedAt)}
                  </span>
                )}
              </div>
            </div>
            <PriceChart history={history ?? []} range={range} onHoverPrice={setHoverPrice} chartId="overview-pc" isLoading={historyLoading} />
          </div>

          {/* Live gold price table */}
          <div className="bg-ink-2 border border-line rounded-[14px]">
            <div className="flex items-center justify-between px-6 py-[18px] border-b border-hairline">
              <h3 className="text-[18px] leading-none font-bold font-sans m-0 tracking-[-0.01em]">Bảng giá vàng trực tiếp</h3>
              <LiveBadge />
            </div>
            <div
              className="px-6 py-3 font-mono text-[10px] text-mute tracking-[0.14em] uppercase bg-ink-3 border-b border-hairline grid"
              style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}
            >
              <span>Loại vàng</span>
              <span className="text-right">Mua vào</span>
              <span className="text-right">Bán ra</span>
              <span className="text-right">Chênh lệch</span>
            </div>
            {!domestic && (
              <div className="p-[24px_20px] flex flex-col gap-3">
                {[0, 1, 2].map(i => (
                  <div key={i} className="grid gap-3 items-center" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
                    {[120, 80, 80, 70].map((w, j) => (
                      <div key={j} className={cn('h-[14px] rounded bg-ink-3 animate-pulse', j > 0 && 'ml-auto')} style={{ width: w }} />
                    ))}
                  </div>
                ))}
              </div>
            )}
            {domestic && liveTableRows.length === 0 && (
              <div className="p-[32px_20px] text-center text-mute font-mono text-[12px]">
                Không có dữ liệu
              </div>
            )}
            {liveTableRows.map((row, i) => (
              <div
                key={row.goldType}
                className={cn('grid px-6 py-4 items-center', i !== 0 && 'border-t border-hairline')}
                style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}
              >
                <div>
                  <div className="text-[14px] leading-none font-bold font-sans">{GOLD_TYPE_LABELS[row.goldType] ?? row.goldType}</div>
                  <div className="font-mono text-[10px] text-mute mt-[5px]">{BRAND_LABELS[row.brand] ?? row.brand}</div>
                </div>
                <div className="text-right font-sans text-[14px] leading-none font-bold tabular-nums">{fmt(row.buyPrice)}</div>
                <div className="text-right font-sans text-[14px] leading-none font-bold tabular-nums">{fmt(row.sellPrice)}</div>
                <div className="text-right font-mono text-[13px] leading-none font-bold tabular-nums text-down">{fmt(row.sellPrice - row.buyPrice)}</div>
              </div>
            ))}
          </div>

          {/* Brand spreads table */}
          <div className="bg-ink-2 border border-line rounded-[14px]">
            <div className="flex items-center justify-between px-6 py-[18px] border-b border-hairline">
              <h3 className="text-[18px] leading-none font-bold font-sans m-0 tracking-[-0.01em]">Chênh lệch các thương hiệu nội địa</h3>
              <div className="flex flex-col items-end gap-[5px]">
                <span className="font-mono text-[10px] text-mute tracking-[0.12em] uppercase">{currency.toLowerCase()} mỗi lượng · tốt nhất nổi bật</span>
                {liveTableRows[0]?.recordedAt && (
                  <span className="font-mono text-[9px] text-mute tracking-[0.06em] leading-none">
                    cập nhật {minsAgo(liveTableRows[0].recordedAt)}
                  </span>
                )}
              </div>
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

          {/* Arbitrage opportunities */}
          <ArbitrageWidget />

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
                    <span className="text-[14px] leading-none font-bold font-sans tabular-nums">{fmt(Number(a.thresholdPrice))}</span>
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
