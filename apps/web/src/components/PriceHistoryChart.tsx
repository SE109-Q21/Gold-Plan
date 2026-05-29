'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import type { GoldBrand, GoldType } from '@gpls/shared';
import { usePriceHistory } from '@/lib/price.api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

type Range = '1D' | '1W' | '1M';

const RANGES: Range[] = ['1D', '1W', '1M'];
const RANGE_LABELS: Record<Range, string> = { '1D': '1 ngày', '1W': '1 tuần', '1M': '1 tháng' };

const GOLD_TYPES: GoldType[] = ['MIEN_SJC', 'NHAN_9999', 'VANG_24K', 'VANG_18K'];
const GOLD_TYPE_LABELS: Record<GoldType, string> = {
  MIEN_SJC: 'Miếng SJC',
  NHAN_9999: 'Nhẫn 9999',
  VANG_24K: 'Vàng 24K',
  VANG_18K: 'Vàng 18K',
};

const BRANDS: GoldBrand[] = ['SJC', 'DOJI', 'PNJ', 'BAO_TIN'];
const BRAND_LABELS: Record<GoldBrand, string> = {
  SJC: 'SJC', DOJI: 'DOJI', PNJ: 'PNJ', BAO_TIN: 'Bảo Tín',
};

function formatDate(iso: string, range: Range): string {
  const d = new Date(iso);
  if (range === '1D') return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function formatVndShort(value: number): string {
  return `${(value / 1_000_000).toFixed(1)}M`;
}

const SELECT_CLS = 'bg-ink-3 border border-line rounded px-2 py-1 font-sans text-[13px] text-chalk outline-none cursor-pointer';

export function PriceHistoryChart() {
  const [range, setRange] = useState<Range>('1D');
  const [goldType, setGoldType] = useState<GoldType>('MIEN_SJC');
  const [brand, setBrand] = useState<GoldBrand>('SJC');

  const { data: points, isLoading, error } = usePriceHistory(brand, goldType, range);

  const chartData = (points ?? []).map((p) => ({
    time: formatDate(p.recordedAt, range),
    buyPrice: p.buyPrice,
    sellPrice: p.sellPrice,
  }));

  return (
    <div className="bg-ink-2 rounded-lg border border-line p-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-[2px] rounded-md bg-ink-3 border border-line p-[2px]">
          {RANGES.map((r) => (
            <Button
              key={r}
              variant="ghost"
              onClick={() => setRange(r)}
              className={cn(
                'rounded px-3 py-1 h-auto font-sans text-[13px] font-medium',
                range === r ? 'bg-ink-4 shadow text-gold hover:bg-ink-4 hover:text-gold' : 'text-bone hover:text-chalk hover:bg-transparent',
              )}
            >
              {RANGE_LABELS[r]}
            </Button>
          ))}
        </div>
        <select value={brand} onChange={(e) => setBrand(e.target.value as GoldBrand)} className={SELECT_CLS}>
          {BRANDS.map((b) => <option key={b} value={b}>{BRAND_LABELS[b]}</option>)}
        </select>
        <select value={goldType} onChange={(e) => setGoldType(e.target.value as GoldType)} className={SELECT_CLS}>
          {GOLD_TYPES.map((t) => <option key={t} value={t}>{GOLD_TYPE_LABELS[t]}</option>)}
        </select>
      </div>

      {isLoading && <div className="py-16 text-center text-mute font-sans text-[13px]">Đang tải biểu đồ...</div>}
      {error && <div className="py-16 text-center text-down font-sans text-[13px]">Không thể tải dữ liệu</div>}
      {!isLoading && !error && chartData.length === 0 && (
        <div className="py-16 text-center text-mute font-sans text-[13px]">Chưa có dữ liệu cho khoảng thời gian này</div>
      )}

      {!isLoading && !error && chartData.length > 0 && (
        <ChartContainer config={{
          buyPrice:  { label: 'Giá mua', color: 'var(--up)' },
          sellPrice: { label: 'Giá bán', color: 'var(--down)' },
        } satisfies ChartConfig} className="h-[280px] w-full">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
            <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'var(--mute)', fontFamily: 'var(--font-mono)' }} interval="preserveStartEnd" />
            <YAxis tickFormatter={formatVndShort} tick={{ fontSize: 11, fill: 'var(--mute)', fontFamily: 'var(--font-mono)' }} width={55} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => {
              if (value === undefined) return '';
              return new Intl.NumberFormat('vi-VN').format(Number(value)) + ' ₫';
            }}/>}/>
            <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--bone)' }} />
            <Line type="monotone" dataKey="buyPrice" name="Giá mua" stroke="var(--color-buyPrice)" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="sellPrice" name="Giá bán" stroke="var(--color-sellPrice)" dot={false} strokeWidth={2} />
          </LineChart>
        </ChartContainer>
      )}
    </div>
  );
}
