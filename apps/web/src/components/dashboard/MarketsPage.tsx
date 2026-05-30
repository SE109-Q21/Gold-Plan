'use client';

import { useState, useCallback } from 'react';
import { PriceChart, type AlertLine, type CompareSeries } from '@/components/ui/PriceChart';
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { usePriceHistory, type HistoryRange } from '@/lib/price.api';
import { useSpreadRanking, useSpreadHistory } from '@/lib/spread.api';
import { useExchangeRates } from '@/lib/exchange-rate.api';
import { useAlerts, useCreateAlert } from '@/lib/alerts.api';
import type { GoldBrand, GoldType } from '@gpls/shared';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

const ASSETS = ['SJC', 'DOJI', 'PNJ'] as const;
type Range = HistoryRange;
const RANGES: Range[] = ['1D', '1W', '1M', '3M', '1Y'];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const GOLD_TYPES: GoldType[] = ['MIEN_SJC', 'NHAN_9999', 'VANG_24K', 'VANG_18K'];
const BRANDS: GoldBrand[] = ['SJC', 'DOJI', 'PNJ', 'BAO_TIN'];

const GOLD_TYPE_LABELS: Record<string, string> = {
  MIEN_SJC: 'Vàng miếng SJC',
  NHAN_9999: 'Nhẫn tròn 9999',
  VANG_24K: 'Vàng 24K',
  VANG_18K: 'Vàng 18K',
};

const COMPARE_COLORS: Record<string, string> = {
  DOJI:    '#60a5fa',
  BAO_TIN: '#a78bfa',
};

const ASSET_CONFIG: Record<string, { brand: GoldBrand; goldType: GoldType }> = {
  'SJC':     { brand: 'SJC',    goldType: 'MIEN_SJC' },
  'DOJI':    { brand: 'DOJI',   goldType: 'MIEN_SJC' },
  'PNJ':     { brand: 'PNJ',    goldType: 'NHAN_9999' },
};

function QuickAlertPanel({
  price, lastPrice, onClose,
}: { price: number; lastPrice: number; onClose: () => void }) {
  const [condition, setCondition] = useState<'gte' | 'lte'>(price >= lastPrice ? 'gte' : 'lte');
  const createAlert = useCreateAlert();

  function handleCreate() {
    createAlert.mutate(
      { brand: 'SJC', goldType: 'MIEN_SJC', condition, thresholdPrice: price },
      { onSuccess: onClose },
    );
  }

  const fmtP = (v: number) => (v / 1_000_000).toFixed(2) + 'M₫';

  return (
    <div className="bg-ink-2 border border-[rgba(212,175,55,0.35)] rounded-xl px-[22px] py-[18px] flex items-center gap-5 flex-wrap">
      <div className="flex flex-col gap-1 min-w-[160px]">
        <div className="font-mono text-[9px] text-mute tracking-[0.14em] uppercase">Cảnh báo mới · SJC Vàng miếng</div>
        <div className="text-[26px] leading-none font-extrabold font-sans tabular-nums text-chalk">{fmtP(price)}</div>
      </div>

      <div className="flex flex-col gap-[6px]">
        <div className="font-mono text-[9px] text-mute tracking-[0.12em] uppercase mb-0.5">Điều kiện</div>
        <div className="flex gap-[6px]">
          {(['gte', 'lte'] as const).map(c => {
            const active = condition === c;
            const color = c === 'gte' ? '#22c55e' : '#ef4444';
            return (
              <button
                key={c}
                onClick={() => setCondition(c)}
                className="inline-flex items-center gap-[6px] h-[34px] px-[14px] rounded-md font-mono text-[11px] leading-none font-bold cursor-pointer transition-all duration-[140ms]"
                style={{
                  border: `1px solid ${active ? color : 'var(--line)'}`,
                  background: active ? (c === 'gte' ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)') : 'transparent',
                  color: active ? color : 'var(--mute)',
                }}
              >
                {c === 'gte' ? '≥ tăng lên trên' : '≤ giảm xuống dưới'}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 ml-auto">
        <Button
          onClick={handleCreate}
          disabled={createAlert.isPending}
          className="h-9 px-[18px] border border-[rgba(212,175,55,0.6)] bg-[rgba(212,175,55,0.12)] text-gold hover:bg-[rgba(212,175,55,0.20)] hover:text-gold font-mono text-[11px] font-bold tracking-[0.08em] uppercase"
        >
          {createAlert.isPending ? 'Đang tạo…' : 'Tạo cảnh báo'}
        </Button>
        <Button
          variant="outline"
          onClick={onClose}
          className="h-9 px-[14px] border-line bg-transparent text-mute hover:bg-ink-3 hover:text-bone font-mono text-[11px] font-bold tracking-[0.08em] uppercase"
        >
          Hủy
        </Button>
      </div>
    </div>
  );
}

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
    <div className="bg-ink-2 border border-line rounded-[14px] p-[22px]">
      <div className="flex justify-between items-center mb-[14px]">
        <h3 className="text-[16px] leading-none font-bold font-sans m-0">Xếp hạng chênh lệch giá</h3>
        <span
          onMouseEnter={() => setShowTip(true)}
          onMouseLeave={() => setShowTip(false)}
          className="relative cursor-help font-mono text-[11px] leading-none font-bold text-mute bg-ink-3 border border-line rounded-full w-[18px] h-[18px] inline-flex items-center justify-center shrink-0"
        >
          ?
          {showTip && (
            <span className="absolute bottom-[calc(100%+6px)] right-0 w-[220px] bg-ink-4 border border-line rounded-lg px-[10px] py-2 font-mono text-[11px] leading-[1.5] font-medium text-chalk z-10 pointer-events-none">
              Chênh lệch là khoản bạn mất nếu mua và bán ngay lập tức. Chênh lệch càng nhỏ = chi phí càng thấp.
            </span>
          )}
        </span>
      </div>

      <div className="flex gap-1 mb-[18px] flex-wrap">
        {GOLD_TYPES.map(gt => (
          <Button
            key={gt}
            variant="outline"
            onClick={() => setGoldType(gt)}
            className={cn(
              'h-8 px-[10px] rounded-none font-mono text-[11px] leading-none font-bold tracking-[0.1em] uppercase',
              goldType === gt ? 'border-gold bg-gold text-gold-ink hover:bg-gold hover:text-gold-ink' : 'border-line bg-transparent text-bone hover:bg-ink-3',
            )}
          >
            {GOLD_TYPE_LABELS[gt] ?? gt}
          </Button>
        ))}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-[14px]">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex flex-col gap-[6px]">
              <div className="flex justify-between mb-1">
                <div className="h-3 w-12 bg-ink-3 rounded-sm opacity-60"/>
                <div className="h-3 w-14 bg-ink-3 rounded-sm opacity-60"/>
              </div>
              <div className="h-[6px] bg-ink-3 rounded-sm overflow-hidden">
                <div className="h-full bg-ink-4 rounded-sm opacity-50" style={{ width: `${70 - i * 20}%` }}/>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && (!data || data.length === 0) && (
        <div className="py-6 text-center font-mono text-[13px] leading-none font-medium text-mute">Không có dữ liệu</div>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="flex flex-col gap-[14px]">
          {data.map((item, i) => (
            <div key={item.brand}>
              <div className="flex justify-between items-center mb-[6px]">
                <div className="flex items-center gap-2">
                  <span className={cn('font-mono text-[12px] leading-none font-bold', item.isMostEfficient ? 'text-up' : 'text-chalk')}>
                    {item.brand}
                  </span>
                  {item.isMostEfficient && (
                    <span className="font-mono text-[9px] leading-none font-bold tracking-[0.08em] uppercase bg-[rgba(88,200,150,0.15)] text-up border border-[rgba(88,200,150,0.3)] rounded px-[6px] py-0.5">
                      hiệu quả nhất
                    </span>
                  )}
                </div>
                <span className="font-mono text-[12px] leading-none font-bold tabular-nums text-chalk">
                  {fmtSpread(item.spreadVnd)}
                </span>
              </div>
              <div className="h-[6px] bg-ink-3 rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm transition-[width] duration-300 ease-in-out"
                  style={{ width: `${(item.spreadVnd / maxSpread) * 100}%`, background: barColor(i, item.isMostEfficient) }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const SPREAD_CHART_CONFIG = {
  spreadVnd: { label: 'Chênh lệch (₫)', color: 'var(--gold)' },
} satisfies ChartConfig;

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
    <div className="bg-ink-2 border border-line rounded-[14px] p-[22px]">
      <div className="mb-[14px]">
        <h3 className="text-[16px] leading-none font-bold font-sans m-0 mb-1">Xu hướng chênh lệch 7 ngày</h3>
      </div>

      <div className="flex gap-1 mb-2 flex-wrap">
        {BRANDS.map(b => (
          <Button
            key={b}
            variant="outline"
            onClick={() => setBrand(b)}
            className={cn(
              'h-7 px-2 rounded-none font-mono text-[10px] leading-none font-bold tracking-[0.1em] uppercase',
              brand === b ? 'border-gold bg-gold text-gold-ink hover:bg-gold hover:text-gold-ink' : 'border-line bg-transparent text-bone hover:bg-ink-3',
            )}
          >
            {b}
          </Button>
        ))}
      </div>

      <div className="flex gap-1 mb-[18px] flex-wrap">
        {GOLD_TYPES.map(gt => (
          <Button
            key={gt}
            variant="outline"
            onClick={() => setGoldType(gt)}
            className={cn(
              'h-7 px-2 rounded-none font-mono text-[10px] leading-none font-bold tracking-[0.1em] uppercase',
              goldType === gt ? 'border-gold bg-gold text-gold-ink hover:bg-gold hover:text-gold-ink' : 'border-line bg-transparent text-bone hover:bg-ink-3',
            )}
          >
            {GOLD_TYPE_LABELS[gt] ?? gt}
          </Button>
        ))}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-[10px] pt-1">
          {[80, 55, 70].map((w, i) => (
            <div key={i} className="h-[14px] bg-ink-3 rounded-[3px] opacity-55" style={{ width: `${w}%` }}/>
          ))}
        </div>
      )}

      {!isLoading && (!chartData || chartData.length === 0) && (
        <div className="py-8 text-center font-mono text-[13px] leading-none font-medium text-mute">Không có dữ liệu</div>
      )}

      {!isLoading && chartData.length > 0 && (
        <ChartContainer config={SPREAD_CHART_CONFIG} className="h-[200px] w-full">
          <ReLineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
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
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => [typeof value === 'number' ? (value / 1_000_000).toFixed(3) + 'M₫' : '-', 'chênh lệch']}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="spreadVnd"
              stroke="var(--color-spreadVnd)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'var(--color-spreadVnd)', stroke: '#0B0B0F', strokeWidth: 2 }}
            />
          </ReLineChart>
        </ChartContainer>
      )}
    </div>
  );
}

export function MarketsPage({ currency = 'VND' }: { currency?: string }) {
  const [range, setRange] = useState<Range>('1M');
  const [asset, setAsset] = useState('SJC');
  const [hoverPrice, setHoverPrice] = useState<number | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [pendingAlertPrice, setPendingAlertPrice] = useState<number | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const { user, getAccessToken } = useAuth();
  const { data: rates } = useExchangeRates();
  const { data: alertsData } = useAlerts();

  const { brand: activeBrand, goldType: activeGoldType } = ASSET_CONFIG[asset] ?? ASSET_CONFIG['SJC'];

  const handleExportCsv = useCallback(async () => {
    setCsvLoading(true);
    try {
      const token = getAccessToken();
      const url = `${API_BASE}/prices/history/export?brand=${activeBrand}&goldType=${activeGoldType}&range=${range}`;
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `gold-history-${activeBrand}-${range}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // silently ignore
    } finally {
      setCsvLoading(false);
    }
  }, [range, activeBrand, activeGoldType, getAccessToken]);

  const { data: history, isLoading: historyLoading } = usePriceHistory(activeBrand, activeGoldType, range);
  const { data: history1D, isLoading: history1DLoading } = usePriceHistory(activeBrand, activeGoldType, '1D');
  const { data: dojiHistory } = usePriceHistory('DOJI' as GoldBrand, 'NHAN_9999' as GoldType, range);
  const { data: baoTinHistory } = usePriceHistory('BAO_TIN' as GoldBrand, 'NHAN_9999' as GoldType, range);
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
      return { t: `${hh}:${mm}:${ss}`, p: pt.buyPrice, diff, down: diff < 0 };
    });
  })();

  const vol = (() => {
    if (chartData.length < 3) return null;
    const returns = chartData.slice(1).map((p, i) => (p - chartData[i]) / chartData[i]);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length;
    return (Math.sqrt(variance) * 100).toFixed(2) + '%';
  })();

  const sjcAlerts: AlertLine[] = (alertsData ?? [])
    .filter(a => a.brand === activeBrand && a.goldType === activeGoldType)
    .map(a => ({
      id: a.id,
      condition: a.condition,
      thresholdPrice: Number(a.thresholdPrice),
      status: a.status,
    }));

  const compareData: CompareSeries[] = showCompare ? [
    ...(dojiHistory?.length ? [{ brand: 'DOJI', history: dojiHistory, color: COMPARE_COLORS.DOJI }] : []),
    ...(baoTinHistory?.length ? [{ brand: 'BAO_TIN', history: baoTinHistory, color: COMPARE_COLORS.BAO_TIN }] : []),
  ] : [];

  const fmt = (vnd: number): string => {
    const effectiveCurrency = currency;
    if (effectiveCurrency === 'USD' && rates) return '$' + (vnd / rates.usdVnd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (effectiveCurrency === 'EUR' && rates) return '€' + (vnd / rates.eurVnd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (vnd / 1_000_000).toFixed(2) + 'M₫';
  };

  return (
    <div className="px-7 pt-6 pb-10 flex flex-col gap-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[36px] leading-none font-extrabold font-sans m-0 tracking-[-0.025em]">thị trường</h1>
          <div className="font-mono text-[11px] text-mute mt-2">biểu đồ tương tác · di chuột để xem · tự làm mới 5 phút trong giờ giao dịch</div>
        </div>
      </div>

      {/* Asset tabs */}
      <div className="flex gap-[6px]">
        {ASSETS.map(a => (
          <Button
            key={a}
            variant="outline"
            onClick={() => setAsset(a)}
            className={cn(
              'h-[34px] px-[14px] rounded-none font-mono text-[11px] leading-none font-bold tracking-[0.1em] uppercase',
              asset === a ? 'border-gold bg-gold text-gold-ink hover:bg-gold hover:text-gold-ink' : 'border-line bg-transparent text-bone hover:bg-ink-3',
            )}
          >{a}</Button>
        ))}
      </div>

      {/* Main chart card */}
      <div className="bg-ink-2 border border-line rounded-[14px] p-7">
        <div className="flex justify-between items-start mb-5">
          <div>
            <div className="font-mono text-[10px] text-mute tracking-[0.14em] uppercase mb-2">{asset} · {GOLD_TYPE_LABELS[activeGoldType] ?? activeGoldType} · giao ngay</div>
            <div className="flex items-baseline gap-[14px]">
              <span className="text-[56px] leading-[0.95] font-extrabold font-sans tracking-[-0.03em] tabular-nums">{fmt(hoverVal)}</span>
              <span className={cn(
                'inline-flex items-center gap-[6px] font-mono text-[14px] leading-none font-bold px-[10px] py-[7px] rounded',
                change >= 0 ? 'text-up bg-[rgba(88,200,150,0.10)]' : 'text-down bg-[rgba(229,72,77,0.10)]',
              )}>
                {change >= 0 ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}% · {range}
              </span>
            </div>
          </div>
          <div className="flex gap-1 items-center">
            {RANGES.map(r => (
              <Button
                key={r}
                variant="outline"
                onClick={() => setRange(r)}
                className={cn(
                  'h-8 px-[10px] rounded-none font-mono text-[11px] leading-none font-bold tracking-[0.1em] uppercase',
                  range === r ? 'border-gold bg-gold text-gold-ink hover:bg-gold hover:text-gold-ink' : 'border-line bg-transparent text-bone hover:bg-ink-3',
                )}
              >{r}</Button>
            ))}
            <Button
              variant="outline"
              onClick={() => { setShowCompare(v => !v); setPendingAlertPrice(null); }}
              className={cn(
                'h-8 px-[10px] gap-[5px] rounded-none font-mono text-[11px] leading-none font-bold tracking-[0.1em] uppercase ml-1',
                showCompare ? 'border-[rgba(147,197,253,0.5)] bg-[rgba(147,197,253,0.08)] text-[#93c5fd] hover:bg-[rgba(147,197,253,0.12)] hover:text-[#93c5fd]' : 'border-line bg-transparent text-bone hover:bg-ink-3',
              )}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 5-5"/></svg>
              so sánh
            </Button>
            {user && (
              <Button
                variant="outline"
                onClick={handleExportCsv}
                disabled={csvLoading}
                className={cn(
                  'h-8 px-[10px] gap-[5px] border-line rounded-none font-mono text-[11px] leading-none font-bold tracking-[0.1em] uppercase ml-1',
                  csvLoading ? 'text-mute opacity-60' : 'text-bone bg-transparent hover:bg-ink-3',
                )}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {csvLoading ? '…' : 'csv'}
              </Button>
            )}
          </div>
        </div>

        <PriceChart
          history={history ?? []}
          range={range}
          onHoverPrice={setHoverPrice}
          alerts={sjcAlerts}
          onAddAlertAtPrice={user && !showCompare ? (p) => { setPendingAlertPrice(p); } : undefined}
          compareData={compareData}
          isLoading={historyLoading}
          formatPrice={fmt}
        />

        <div className="grid grid-cols-2 mt-[22px] pt-[18px] border-t border-hairline">
          {[
            { l: 'σ Vol',  v: vol ?? '—',   tint: 'text-gold' },
            { l: 'Tín hiệu', v: 'Xu hướng mua', tint: 'text-up'   },
          ].map((s, i) => (
            <div key={s.l} className={cn('', i !== 0 && 'pl-5 border-l border-hairline')}>
              <div className="font-mono text-[9px] text-mute tracking-[0.14em] uppercase mb-[6px]">{s.l}</div>
              <div className={cn('text-[18px] leading-none font-bold font-sans tabular-nums', s.tint)}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {pendingAlertPrice !== null && (
        <QuickAlertPanel
          price={pendingAlertPrice}
          lastPrice={data[data.length - 1]}
          onClose={() => setPendingAlertPrice(null)}
        />
      )}

      <div className="grid grid-cols-2 gap-5">
        <SpreadRankingSection />

        <div className="bg-ink-2 border border-line rounded-[14px] p-[22px]">
          <h3 className="text-[16px] leading-none font-bold font-sans m-0 mb-[14px]">Giá gần đây</h3>
          {ticks.length === 0 && (
            <div className="py-6 text-center font-mono text-[12px] leading-none font-medium text-mute">
              {history1DLoading ? 'đang tải…' : 'chưa có dữ liệu'}
            </div>
          )}
          {ticks.map((r, i) => (
            <div
              key={r.t}
              className={cn('grid py-2 font-mono text-[12px] leading-none font-medium', i !== 0 && 'border-t border-hairline')}
              style={{ gridTemplateColumns: '90px 1fr 90px' }}
            >
              <span className="text-mute">{r.t}</span>
              <span className="text-[13px] font-sans tabular-nums">{fmt(r.p)}</span>
              <span className={cn('text-right font-bold', r.down ? 'text-down' : 'text-up')}>
                {r.down ? '▼' : '▲'} {(r.diff >= 0 ? '+' : '') + fmt(Math.abs(r.diff))}
              </span>
            </div>
          ))}
        </div>
      </div>

      <SpreadHistoryChart />
    </div>
  );
}
