'use client';

import { useState } from 'react';
import { useAssetsComparison, ComparisonRange } from '@/lib/assets-comparison.api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { DataSeriesDto } from '@gpls/shared';

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

function PerformanceCard({
  series, capital, color,
}: { series: DataSeriesDto; capital: number; color: string }) {
  const isPositive = series.returnPercent >= 0;
  const outcome = capital * (1 + series.returnPercent / 100);
  return (
    <div style={{
      background: 'var(--ink-2)',
      border: `1px solid ${color}44`,
      borderRadius: 10,
      padding: 16,
      flex: 1,
      minWidth: 140,
    }}>
      <div style={{ color: 'var(--chalk-3)', fontSize: 12, marginBottom: 8 }}>{series.label}</div>
      <div style={{
        fontSize: 24,
        fontWeight: 700,
        color: isPositive ? '#9DCC6E' : '#E5484D',
      }}>
        {isPositive ? '+' : ''}{series.returnPercent.toFixed(2)}%
      </div>
      <div style={{ color: 'var(--chalk-3)', fontSize: 12, marginTop: 6 }}>
        {outcome.toLocaleString('vi-VN')}₫
      </div>
      <div style={{ marginTop: 8, height: 3, background: '#2a2a35', borderRadius: 2 }}>
        <div style={{
          width: `${Math.min(100, Math.abs(series.returnPercent) * 5)}%`,
          height: '100%',
          background: isPositive ? '#9DCC6E' : '#E5484D',
          borderRadius: 2,
        }} />
      </div>
    </div>
  );
}

export default function GoldVsAssetsPage() {
  const [range, setRange] = useState<ComparisonRange>('1M');
  const [capital, setCapital] = useState(100_000_000);
  const { data, isLoading } = useAssetsComparison(range);

  // Build unified chart data
  const chartData = (() => {
    if (!data) return [];
    const allDates = new Set<string>();
    for (const s of [data.gold, data.usd, data.bankDeposit, data.vnIndex].filter(Boolean)) {
      s!.dataPoints.forEach(p => allDates.add(p.date));
    }
    return Array.from(allDates).sort().map(date => {
      const row: Record<string, string | number> = { date };
      const lookup = (s: DataSeriesDto | null) =>
        s?.dataPoints.find(p => p.date === date)?.value;
      row.gold = lookup(data.gold) ?? '';
      row.usd = lookup(data.usd) ?? '';
      row.bankDeposit = lookup(data.bankDeposit) ?? '';
      if (data.vnIndex) row.vnIndex = lookup(data.vnIndex) ?? '';
      return row;
    });
  })();

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ color: 'var(--gold)', marginBottom: 4, fontSize: 24 }}>
        📊 Vàng vs Các Kênh Đầu Tư
      </h1>
      <p style={{ color: 'var(--chalk-3)', fontSize: 14, marginBottom: 24 }}>
        So sánh hiệu suất vàng với USD, gửi ngân hàng và VN-Index theo từng kỳ.
      </p>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {RANGES.map(r => (
            <button key={r} onClick={() => setRange(r)} style={{
              padding: '5px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
              background: range === r ? 'var(--gold)' : 'var(--ink-2)',
              color: range === r ? '#000' : 'var(--chalk-3)',
              border: `1px solid ${range === r ? 'var(--gold)' : 'var(--line)'}`,
            }}>
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--chalk-3)', fontSize: 13 }}>Vốn:</span>
          <input
            type="number" value={capital} step={10_000_000}
            onChange={e => setCapital(Math.max(0, Number(e.target.value)))}
            style={{
              width: 130, padding: '4px 8px', borderRadius: 6,
              background: 'var(--ink-2)', border: '1px solid var(--line)',
              color: 'var(--chalk)', fontSize: 13, textAlign: 'right',
            }}
          />
          <span style={{ color: 'var(--chalk-3)', fontSize: 13 }}>₫</span>
        </div>
      </div>

      {isLoading && <p style={{ color: 'var(--chalk-3)' }}>Đang tải dữ liệu...</p>}

      {data && (
        <>
          {/* Performance cards */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <PerformanceCard series={data.gold} capital={capital} color={COLORS.gold} />
            <PerformanceCard series={data.usd} capital={capital} color={COLORS.usd} />
            <PerformanceCard series={data.bankDeposit} capital={capital} color={COLORS.bankDeposit} />
            {data.vnIndex && (
              <PerformanceCard series={data.vnIndex} capital={capital} color={COLORS.vnIndex} />
            )}
          </div>

          {/* Normalized line chart */}
          <div style={{
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            borderRadius: 10, padding: 20, marginBottom: 16,
          }}>
            <div style={{ color: 'var(--chalk-3)', fontSize: 13, marginBottom: 12 }}>
              Hiệu suất chuẩn hoá (gốc = 100) — {RANGE_LABELS[range]}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#888' }} tickLine={false}
                  tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#888' }}
                  tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(v: any, name: any) => [v.toFixed(2), name]}
                  contentStyle={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 6 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="gold" name="Vàng SJC"
                  stroke={COLORS.gold} dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="usd" name="USD/VND"
                  stroke={COLORS.usd} dot={false} strokeWidth={1.5} />
                <Line type="monotone" dataKey="bankDeposit" name="Gửi NH"
                  stroke={COLORS.bankDeposit} dot={false} strokeWidth={1.5} strokeDasharray="4 4" />
                {data.vnIndex && (
                  <Line type="monotone" dataKey="vnIndex" name="VN-Index"
                    stroke={COLORS.vnIndex} dot={false} strokeWidth={1.5} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Insight banner */}
          <div style={{
            background: '#D4AF3710', border: '1px solid #D4AF3730',
            borderRadius: 8, padding: 14,
          }}>
            <span style={{ color: '#D4AF37' }}>💡 </span>
            <span style={{ color: 'var(--chalk)', fontSize: 13 }}>{data.insight}</span>
          </div>

          {!data.vnIndex && (
            <p style={{ color: 'var(--chalk-3)', fontSize: 12, marginTop: 8 }}>
              * VN-Index: chưa có dữ liệu. Admin có thể nhập tại trang quản trị → Benchmarks.
            </p>
          )}
        </>
      )}
    </div>
  );
}
