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

// Runtime shape returned by the API (service-local DTO)
interface HeatIndexHistoryItem {
  value: number;
  category: string;
  priceVelocity: number;
  spreadSize: number;
  thresholdCrossings: number;
  updatedAt?: string;       // legacy fallback
  calculatedAt?: string;    // canonical field (matches shared HeatIndexDto)
}

function formatVi(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HeatIndexHistoryChart() {
  const { data, isLoading } = useHeatIndexHistory(7);

  if (isLoading) {
    return (
      <div
        style={{
          background: 'var(--ink-2)',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: 12,
          padding: 20,
        }}
      >
        <p
          className="mono"
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            margin: '0 0 16px',
          }}
        >
          Lịch sử Heat Index — 7 ngày
        </p>
        <div
          style={{
            height: 200,
            borderRadius: 8,
            background:
              'linear-gradient(90deg, var(--ink-3) 25%, var(--ink-2) 50%, var(--ink-3) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  const items = (data as unknown as HeatIndexHistoryItem[] | undefined) ?? [];

  if (items.length === 0) {
    return (
      <div
        style={{
          background: 'var(--ink-2)',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: 12,
          padding: 20,
        }}
      >
        <p
          className="mono"
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            margin: '0 0 16px',
          }}
        >
          Lịch sử Heat Index — 7 ngày
        </p>
        <div
          style={{
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--mute)',
            font: '500 13px/1 var(--font-mono)',
          }}
        >
          Chưa có dữ liệu lịch sử
        </div>
      </div>
    );
  }

  const chartData = items.map(item => ({
    label: formatVi(item.calculatedAt ?? item.updatedAt ?? ''),
    score: item.value,
  }));

  return (
    <div
      style={{
        background: 'var(--ink-2)',
        border: '1px solid rgba(212,175,55,0.2)',
        borderRadius: 12,
        padding: 20,
      }}
    >
      <p
        className="mono"
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--gold)',
          margin: '0 0 16px',
        }}
      >
        Lịch sử Heat Index — 7 ngày
      </p>
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
