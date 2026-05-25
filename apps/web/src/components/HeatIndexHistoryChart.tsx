'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useHeatIndexHistory } from '@/lib/heat-index.api';

interface HeatIndexHistoryItem {
  score: number;
  label: string;
  velocityPct: number;
  spreadVnd: number;
  crossings: number;
  computedAt: string;
}

function formatVi(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const CARD_CLS = 'bg-ink-2 border border-[rgba(212,175,55,0.2)] rounded-[12px] p-5';
const TITLE_CLS = 'font-mono text-[11px] font-bold tracking-[0.1em] uppercase text-gold m-0 mb-4';

export function HeatIndexHistoryChart() {
  const { data, isLoading } = useHeatIndexHistory(7);

  if (isLoading) {
    return (
      <div className={CARD_CLS}>
        <p className={TITLE_CLS}>Lịch sử Heat Index — 7 ngày</p>
        <div className="h-[200px] rounded-lg bg-ink-3 animate-pulse" />
      </div>
    );
  }

  const items = (data as unknown as HeatIndexHistoryItem[] | undefined) ?? [];

  if (items.length === 0) {
    return (
      <div className={CARD_CLS}>
        <p className={TITLE_CLS}>Lịch sử Heat Index — 7 ngày</p>
        <div className="h-[200px] flex items-center justify-center text-mute font-mono text-[13px] leading-none font-medium">
          Chưa có dữ liệu lịch sử
        </div>
      </div>
    );
  }

  const chartData = items.map(item => ({
    label: formatVi(item.computedAt),
    score: item.score,
  }));

  return (
    <div className={CARD_CLS}>
      <p className={TITLE_CLS}>Lịch sử Heat Index — 7 ngày</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--mute)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: 'var(--mute)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--ink-3)',
              border: '1px solid rgba(212,175,55,0.3)',
              borderRadius: 8,
              font: '500 12px/1.4 var(--font-mono)',
              color: 'var(--chalk)',
            }}
            labelStyle={{ color: 'var(--mute)', marginBottom: 4 }}
            formatter={(value) => [value, 'Heat Index']}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#D4AF37"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#D4AF37', stroke: 'var(--ink-2)', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
