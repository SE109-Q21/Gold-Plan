'use client';

import { useState } from 'react';
import { useAssetsComparison, ComparisonRange } from '@/lib/assets-comparison.api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { DataSeriesDto } from '@gpls/shared';
import { cn } from '@/lib/utils';

const RANGES: ComparisonRange[] = ['1M', '3M', '6M', '1Y'];
const RANGE_LABELS: Record<ComparisonRange, string> = {
  '1M': '1 tháng', '3M': '3 tháng', '6M': '6 tháng', '1Y': '1 năm',
};

const COLORS = {
  gold: '#D4AF37',
  usd: '#58C896',
  bankDeposit: '#888888',
  vnIndex: '#E5484D',
};

function PerformanceCard({ series, capital, color }: { series: DataSeriesDto; capital: number; color: string }) {
  const isPositive = series.returnPercent >= 0;
  const outcome = capital * (1 + series.returnPercent / 100);
  return (
    <div
      className="bg-ink-2 rounded-[10px] p-4 flex-1 min-w-[140px] border"
      style={{ borderColor: color + '44' }}
    >
      <div className="text-mute text-[12px] mb-2">{series.label}</div>
      <div className={cn('text-[24px] font-bold', isPositive ? 'text-[#9DCC6E]' : 'text-down')}>
        {isPositive ? '+' : ''}{series.returnPercent.toFixed(2)}%
      </div>
      <div className="text-mute text-[12px] mt-[6px]">
        {outcome.toLocaleString('vi-VN')}₫
      </div>
      <div className="mt-2 h-[3px] bg-[#2a2a35] rounded-[2px]">
        <div
          className={cn('h-full rounded-[2px]', isPositive ? 'bg-[#9DCC6E]' : 'bg-down')}
          style={{ width: `${Math.min(100, Math.abs(series.returnPercent) * 5)}%` }}
        />
      </div>
    </div>
  );
}

export default function GoldVsAssetsPage() {
  const [range, setRange] = useState<ComparisonRange>('1M');
  const [capital, setCapital] = useState(100_000_000);
  const { data, isLoading } = useAssetsComparison(range);

  const chartData = (() => {
    if (!data) return [];
    const allDates = new Set<string>();
    for (const s of [data.gold, data.usd, data.bankDeposit, data.vnIndex].filter(Boolean)) {
      s!.dataPoints.forEach(p => allDates.add(p.date));
    }
    return Array.from(allDates).sort().map(date => {
      const row: Record<string, string | number> = { date };
      const lookup = (s: DataSeriesDto | null) => s?.dataPoints.find(p => p.date === date)?.value;
      row.gold = lookup(data.gold) ?? '';
      row.usd = lookup(data.usd) ?? '';
      row.bankDeposit = lookup(data.bankDeposit) ?? '';
      if (data.vnIndex) row.vnIndex = lookup(data.vnIndex) ?? '';
      return row;
    });
  })();

  return (
    <div className="max-w-[900px] mx-auto p-[24px_16px]">
      <h1 className="text-gold mb-1 text-[24px] font-bold">
        📊 Vàng vs Các Kênh Đầu Tư
      </h1>
      <p className="text-mute text-[14px] mb-6">
        So sánh hiệu suất vàng với USD, gửi ngân hàng và VN-Index theo từng kỳ.
      </p>

      {/* Controls */}
      <div className="flex gap-2 mb-6 flex-wrap items-center">
        <div className="flex gap-2">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'px-[14px] py-[5px] rounded-md text-[12px] cursor-pointer border',
                range === r ? 'bg-gold border-gold text-gold-ink' : 'bg-ink-2 border-line text-mute',
              )}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-mute text-[13px]">Vốn:</span>
          <input
            type="number"
            value={capital}
            step={10_000_000}
            onChange={e => setCapital(Math.max(0, Number(e.target.value)))}
            className="w-[130px] px-2 py-1 rounded-md bg-ink-2 border border-line text-chalk text-[13px] text-right outline-none"
          />
          <span className="text-mute text-[13px]">₫</span>
        </div>
      </div>

      {isLoading && <p className="text-mute">Đang tải dữ liệu...</p>}

      {data && (
        <>
          <div className="flex gap-3 mb-6 flex-wrap">
            <PerformanceCard series={data.gold} capital={capital} color={COLORS.gold}/>
            <PerformanceCard series={data.usd} capital={capital} color={COLORS.usd}/>
            <PerformanceCard series={data.bankDeposit} capital={capital} color={COLORS.bankDeposit}/>
            {data.vnIndex && <PerformanceCard series={data.vnIndex} capital={capital} color={COLORS.vnIndex}/>}
          </div>

          <div className="bg-ink-2 border border-line rounded-[10px] p-5 mb-4">
            <div className="text-mute text-[13px] mb-3">
              Hiệu suất chuẩn hoá (gốc = 100) — {RANGE_LABELS[range]}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#888' }} tickLine={false}
                  tickFormatter={d => d.slice(5)} interval="preserveStartEnd"/>
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false}/>
                <Tooltip
                  formatter={(v: unknown, name: unknown) => [(v as number).toFixed(2), name as string]}
                  contentStyle={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 6 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }}/>
                <Line type="monotone" dataKey="gold" name="Vàng SJC" stroke={COLORS.gold} dot={false} strokeWidth={2}/>
                <Line type="monotone" dataKey="usd" name="USD/VND" stroke={COLORS.usd} dot={false} strokeWidth={1.5}/>
                <Line type="monotone" dataKey="bankDeposit" name="Gửi NH" stroke={COLORS.bankDeposit} dot={false} strokeWidth={1.5} strokeDasharray="4 4"/>
                {data.vnIndex && (
                  <Line type="monotone" dataKey="vnIndex" name="VN-Index" stroke={COLORS.vnIndex} dot={false} strokeWidth={1.5}/>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#D4AF3710] border border-[#D4AF3730] rounded-lg p-[14px]">
            <span className="text-gold">💡 </span>
            <span className="text-chalk text-[13px]">{data.insight}</span>
          </div>

          {!data.vnIndex && (
            <p className="text-mute text-[12px] mt-2">
              * VN-Index: chưa có dữ liệu. Admin có thể nhập tại trang quản trị → Benchmarks.
            </p>
          )}
        </>
      )}
    </div>
  );
}
