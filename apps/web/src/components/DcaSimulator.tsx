'use client';

import { useState } from 'react';
import { useDcaSimulate } from '@/lib/dca.api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const BRANDS = ['SJC', 'DOJI', 'PNJ', 'BAO_TIN'];
const GOLD_TYPES = ['MIEN_SJC', 'NHAN_9999', 'VANG_24K', 'VANG_18K'];

function formatCurrency(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

export function DcaSimulator() {
  const [form, setForm] = useState({
    brand: 'SJC',
    goldType: 'MIEN_SJC',
    startDate: '2024-01-01',
    frequency: 'weekly' as const,
    qtyPerPurchase: 0.1,
  });

  const { data, isLoading, error } = useDcaSimulate(form);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const chartData = data?.dataPoints.map(dp => ({
    date: new Date(dp.date).toLocaleDateString('vi-VN', { month: '2-digit', year: '2-digit' }),
    dcaValue: dp.cumulativeValue,
    lumpSumValue: dp.lumpSumValue,
    fullDate: dp.date,
  })) || [];

  return (
    <div className="flex flex-col gap-6 p-6 bg-[var(--ink-2)] border border-[var(--line)] rounded-xl">
      <div className="flex items-center justify-between">
        <span className="stamp">F06 — DCA Simulator</span>
        <span className="mono text-[10px] text-[var(--mute)]">No Login Required</span>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="mono text-[9px] text-[var(--mute)] uppercase tracking-wider">Brand</label>
          <select 
            value={form.brand}
            onChange={e => setForm({ ...form, brand: e.target.value })}
            className="h-10 px-3 bg-[var(--ink-3)] border border-[var(--line)] rounded-md text-[13px] font-bold outline-none focus:border-[var(--gold)]"
          >
            {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="mono text-[9px] text-[var(--mute)] uppercase tracking-wider">Type</label>
          <select 
            value={form.goldType}
            onChange={e => setForm({ ...form, goldType: e.target.value })}
            className="h-10 px-3 bg-[var(--ink-3)] border border-[var(--line)] rounded-md text-[13px] font-bold outline-none focus:border-[var(--gold)]"
          >
            {GOLD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="mono text-[9px] text-[var(--mute)] uppercase tracking-wider">Start Date</label>
          <input 
            type="date"
            value={form.startDate}
            onChange={e => setForm({ ...form, startDate: e.target.value })}
            className="h-10 px-3 bg-[var(--ink-3)] border border-[var(--line)] rounded-md text-[13px] font-bold outline-none focus:border-[var(--gold)]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="mono text-[9px] text-[var(--mute)] uppercase tracking-wider">Freq</label>
          <select 
            value={form.frequency}
            onChange={e => setForm({ ...form, frequency: e.target.value as any })}
            className="h-10 px-3 bg-[var(--ink-3)] border border-[var(--line)] rounded-md text-[13px] font-bold outline-none focus:border-[var(--gold)]"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="mono text-[9px] text-[var(--mute)] uppercase tracking-wider">Qty (Tael)</label>
          <input 
            type="number"
            step="0.01"
            min="0.01"
            value={form.qtyPerPurchase}
            onChange={e => setForm({ ...form, qtyPerPurchase: parseFloat(e.target.value) || 0 })}
            className="h-10 px-3 bg-[var(--ink-3)] border border-[var(--line)] rounded-md text-[13px] font-bold outline-none focus:border-[var(--gold)]"
          />
        </div>
      </form>

      {isLoading && (
        <div className="h-64 flex items-center justify-center mono text-xs text-[var(--mute)] animate-pulse">
          Simulating strategy...
        </div>
      )}

      {error && (
        <div className="p-4 bg-[rgba(229,72,77,0.1)] border border-[var(--down)] rounded-lg text-[var(--down)] mono text-[11px]">
          {error instanceof Error ? error.message : 'Error simulating DCA. Check date range.'}
        </div>
      )}

      {data && !isLoading && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'Avg Cost', val: formatCurrency(data.averageCostVnd) },
              { label: 'Total Gold', val: `${data.totalGoldTael.toFixed(2)} Tael` },
              { label: 'Total Spent', val: formatCurrency(data.totalSpentVnd) },
              { label: 'Current Value', val: formatCurrency(data.currentValueVnd) },
              { 
                label: 'P&L vs Lump Sum', 
                val: `${data.dcaPnlPct > data.lumpSumPnlPct ? '+' : ''}${(data.dcaPnlPct - data.lumpSumPnlPct).toFixed(2)}%`,
                highlight: true 
              },
            ].map(s => (
              <div key={s.label} className="p-4 bg-[var(--ink-3)] border border-[var(--line)] rounded-lg">
                <div className="mono text-[8px] text-[var(--mute)] uppercase tracking-widest mb-1.5">{s.label}</div>
                <div className={`tabular text-[14px] font-bold ${s.highlight ? 'text-[var(--gold)]' : ''}`}>{s.val}</div>
              </div>
            ))}
          </div>

          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'var(--mute)', fontSize: 10, fontFamily: 'var(--font-mono)' }} 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  hide
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  contentStyle={{ background: 'var(--ink-4)', border: '1px solid var(--line)', borderRadius: 8, font: '11px var(--font-mono)' }}
                  formatter={(value: any) => [formatCurrency(value as number), '']}
                  labelStyle={{ color: 'var(--mute)', marginBottom: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="dcaValue" 
                  name="DCA Value"
                  stroke="var(--gold)" 
                  strokeWidth={2} 
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="lumpSumValue" 
                  name="Lump Sum Value"
                  stroke="var(--mute)" 
                  strokeWidth={2} 
                  strokeDasharray="4 4"
                  dot={false} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
