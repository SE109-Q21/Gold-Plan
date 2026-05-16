'use client';

import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';
import type { GoldBrand, GoldType } from '@gpls/shared';
import { usePriceHistory } from '@/lib/price.api';

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
  SJC: 'SJC',
  DOJI: 'DOJI',
  PNJ: 'PNJ',
  BAO_TIN: 'Bảo Tín',
};

function formatDate(iso: string, range: Range): string {
  const d = new Date(iso);
  if (range === '1D') return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function formatVndShort(value: number): string {
  return `${(value / 1_000_000).toFixed(1)}M`;
}

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
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-md bg-gray-100 p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                range === r ? 'bg-white shadow text-yellow-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
        <select
          value={brand}
          onChange={(e) => setBrand(e.target.value as GoldBrand)}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        >
          {BRANDS.map((b) => (
            <option key={b} value={b}>{BRAND_LABELS[b]}</option>
          ))}
        </select>
        <select
          value={goldType}
          onChange={(e) => setGoldType(e.target.value as GoldType)}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        >
          {GOLD_TYPES.map((t) => (
            <option key={t} value={t}>{GOLD_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {isLoading && <div className="py-16 text-center text-gray-400">Đang tải biểu đồ...</div>}
      {error && <div className="py-16 text-center text-red-500">Không thể tải dữ liệu</div>}
      {!isLoading && !error && chartData.length === 0 && (
        <div className="py-16 text-center text-gray-400">Chưa có dữ liệu cho khoảng thời gian này</div>
      )}

      {!isLoading && !error && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tickFormatter={formatVndShort} tick={{ fontSize: 11 }} width={55} />
            <Tooltip
              formatter={(value: any) => {
                if (value === undefined) return '';
                return new Intl.NumberFormat('vi-VN').format(Number(value)) + ' ₫';
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="buyPrice"
              name="Giá mua"
              stroke="#16a34a"
              dot={false}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="sellPrice"
              name="Giá bán"
              stroke="#dc2626"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
