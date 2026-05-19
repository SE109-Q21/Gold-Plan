'use client';

import React, { useState } from 'react';
import { useAdminStats, useAdminPeriodStats, useTriggerCrawl, useAdminTimeSeries } from '@/lib/admin.api';
import type { AdminStatsPeriod } from '@gpls/shared';
import type { TimeSeriesPoint } from '@/lib/admin.api';

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, unit, sub }: { label: string; value: string | number; unit?: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '20px 24px' }}>
      <div style={{ font: '700 10px/1 var(--font-mono)', color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ font: '800 36px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'baseline', gap: 4 }}>
        {value}
        {unit && <span style={{ font: '700 14px/1 var(--font-mono)', color: 'var(--mute)' }}>{unit}</span>}
      </div>
      {sub && <div style={{ font: '500 10px/1 var(--font-mono)', color: 'var(--mute)', marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

// ─── SVG Charts ───────────────────────────────────────────────────────────────

const W = 400;

function BarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const H = 72;
  const gap = 2;
  const bw = (W - gap * (data.length - 1)) / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }} preserveAspectRatio="none">
      {data.map((d, i) => {
        const bh = Math.max((d.value / max) * (H - 2), d.value > 0 ? 2 : 0);
        const x = i * (bw + gap);
        const y = H - bh;
        return (
          <rect key={i} x={x} y={y} width={bw} height={bh} fill={color} opacity={0.75} rx={1.5}>
            <title>{d.label}: {d.value}</title>
          </rect>
        );
      })}
    </svg>
  );
}

function LineChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const H = 72;
  const pad = 4;
  const n = data.length;

  if (n < 2) return null;

  const pts = data.map((d, i) => ({
    x: pad + (i / (n - 1)) * (W - pad * 2),
    y: pad + (1 - d.value / max) * (H - pad * 2),
    label: d.label,
    value: d.value,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const fillPath = `${linePath} L ${pts[n - 1].x.toFixed(1)} ${H} L ${pts[0].x.toFixed(1)} ${H} Z`;
  const gid = `lg-${color.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gid})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color}>
          <title>{p.label}: {p.value}</title>
        </circle>
      ))}
    </svg>
  );
}

function DonutChart({ active, total }: { active: number; total: number }) {
  const inactive = Math.max(total - active, 0);
  const r = 34;
  const cx = 44;
  const cy = 44;
  const sw = 11;
  const circ = 2 * Math.PI * r;

  const activePct = total > 0 ? active / total : 0;
  const activeDash = activePct * circ;
  const inactiveDash = circ - activeDash;

  return (
    <svg width={88} height={88} viewBox="0 0 88 88" style={{ flexShrink: 0 }}>
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw} />
      {/* Active segment */}
      {activeDash > 0 && (
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#22c55e"
          strokeWidth={sw}
          strokeDasharray={`${activeDash} ${inactiveDash}`}
          strokeDashoffset={circ * 0.25}
          style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
        >
          <title>Active: {active}</title>
        </circle>
      )}
      {/* Inactive segment */}
      {inactiveDash > 0 && (
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="rgba(200,80,80,0.55)"
          strokeWidth={sw}
          strokeDasharray={`${inactiveDash} ${activeDash}`}
          strokeDashoffset={circ * 0.25 - activeDash}
          style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
        >
          <title>Inactive: {inactive}</title>
        </circle>
      )}
      {/* Center label */}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--chalk)" fontSize={13} fontWeight={800} fontFamily="var(--font-display)">
        {total > 0 ? Math.round(activePct * 100) : 0}%
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill="var(--mute)" fontSize={9} fontFamily="var(--font-mono)">
        active
      </text>
    </svg>
  );
}

// ─── Chart Card ───────────────────────────────────────────────────────────────

function ChartCard({
  title,
  value,
  delta,
  chart,
  accent,
}: {
  title: string;
  value: string | number;
  delta?: string;
  chart: React.ReactNode;
  accent: string;
}) {
  return (
    <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '18px 20px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ font: '700 10px/1 var(--font-mono)', color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>
            {title}
          </div>
          <div style={{ font: '800 26px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums', color: 'var(--chalk)' }}>
            {value}
          </div>
        </div>
        {delta !== undefined && (
          <span style={{ font: '600 10px/1 var(--font-mono)', color: accent, background: `${accent}18`, border: `1px solid ${accent}40`, padding: '3px 8px', borderRadius: 4 }}>
            {delta}
          </span>
        )}
      </div>
      {chart}
      {/* X-axis labels */}
    </div>
  );
}

// ─── Charts Section ────────────────────────────────────────────────────────────

type Range = 7 | 14 | 30;

function ChartsSection() {
  const [range, setRange] = useState<Range>(30);
  const { data: ts, isLoading } = useAdminTimeSeries(range);

  const series: TimeSeriesPoint[] = ts?.series ?? [];

  function sum(key: keyof TimeSeriesPoint) {
    return series.reduce((acc, d) => acc + (d[key] as number), 0);
  }

  function toBarData(key: keyof TimeSeriesPoint) {
    return series.map(d => ({ label: d.date, value: d[key] as number }));
  }

  function toCrawlRateLine() {
    return series.map(d => ({
      label: d.date,
      value: d.crawlsTotal > 0 ? Math.round((d.crawlsSuccess / d.crawlsTotal) * 100) : 0,
    }));
  }

  const firstDate = series[0]?.date?.slice(5) ?? '';
  const lastDate = series[series.length - 1]?.date?.slice(5) ?? '';

  const RANGES: Range[] = [7, 14, 30];

  return (
    <div style={{ marginBottom: 36 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ font: '700 16px/1 var(--font-display)', margin: 0, letterSpacing: '-0.01em' }}>
          Activity
        </h2>
        <div style={{ display: 'flex', gap: 0 }}>
          {RANGES.map((r, i) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                padding: '6px 14px',
                font: '700 11px/1 var(--font-mono)',
                letterSpacing: '0.08em',
                border: '1px solid var(--line)',
                borderRight: i < RANGES.length - 1 ? 'none' : '1px solid var(--line)',
                borderRadius: i === 0 ? '6px 0 0 6px' : i === RANGES.length - 1 ? '0 6px 6px 0' : 0,
                background: range === r ? 'var(--gold)' : 'transparent',
                color: range === r ? '#0B0B0F' : 'var(--bone)',
                cursor: 'pointer',
              }}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '40px', textAlign: 'center', font: '500 12px/1 var(--font-mono)', color: 'var(--mute)' }}>
          Loading charts…
        </div>
      ) : (
        <>
          {/* 2×2 chart grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <ChartCard
              title="New Registrations"
              value={sum('newUsers')}
              delta={`${range}d total`}
              accent="#D4AF37"
              chart={<BarChart data={toBarData('newUsers')} color="#D4AF37" />}
            />
            <ChartCard
              title="Crawl Success Rate"
              value={`${series.length > 0 && sum('crawlsTotal') > 0 ? Math.round((sum('crawlsSuccess') / sum('crawlsTotal')) * 100) : 0}%`}
              delta={`${sum('crawlsTotal')} crawls`}
              accent="#22c55e"
              chart={<LineChart data={toCrawlRateLine()} color="#22c55e" />}
            />
            <ChartCard
              title="Alerts Fired"
              value={sum('alertsFired')}
              delta={`${range}d total`}
              accent="#7aa4f7"
              chart={<BarChart data={toBarData('alertsFired')} color="#7aa4f7" />}
            />
            <ChartCard
              title="Forecast Votes"
              value={sum('forecastVotes')}
              delta={`${range}d total`}
              accent="#c084fc"
              chart={<BarChart data={toBarData('forecastVotes')} color="#c084fc" />}
            />
          </div>

          {/* Date range label */}
          {series.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
              <span style={{ font: '500 10px/1 var(--font-mono)', color: 'var(--mute)' }}>{firstDate}</span>
              <span style={{ font: '500 10px/1 var(--font-mono)', color: 'var(--mute)' }}>{lastDate}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── User Status Card ─────────────────────────────────────────────────────────

function UserStatusCard({ totalUsers, activeUsers }: { totalUsers: number; activeUsers: number }) {
  const inactive = Math.max(totalUsers - activeUsers, 0);
  const rows = [
    { label: 'Active', value: activeUsers, color: '#22c55e' },
    { label: 'Inactive / Locked', value: inactive, color: 'rgba(200,80,80,0.7)' },
  ];

  return (
    <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '20px 24px', display: 'flex', gap: 24, alignItems: 'center' }}>
      <DonutChart active={activeUsers} total={totalUsers} />
      <div style={{ flex: 1 }}>
        <div style={{ font: '700 10px/1 var(--font-mono)', color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14 }}>
          User Breakdown
        </div>
        {rows.map(row => (
          <div key={row.label} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ font: '600 11px/1 var(--font-display)', color: 'var(--bone)' }}>{row.label}</span>
              <span style={{ font: '700 11px/1 var(--font-mono)', color: row.color }}>{row.value.toLocaleString()}</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${totalUsers > 0 ? (row.value / totalUsers) * 100 : 0}%`,
                background: row.color,
                borderRadius: 2,
                transition: 'width 600ms ease',
              }} />
            </div>
          </div>
        ))}
        <div style={{ font: '500 10px/1 var(--font-mono)', color: 'var(--mute)', marginTop: 6 }}>
          {totalUsers.toLocaleString()} total
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 8px', borderRadius: 4,
      font: '700 9px/1 var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase',
      background: active ? 'rgba(88,200,150,0.12)' : 'rgba(200,80,80,0.12)',
      color: active ? 'var(--up)' : 'var(--down)',
      border: `1px solid ${active ? 'rgba(88,200,150,0.3)' : 'rgba(200,80,80,0.3)'}`,
    }}>
      {active ? 'active' : 'inactive'}
    </span>
  );
}

// ─── Period Stats Section ──────────────────────────────────────────────────────

const PERIOD_LABELS: { key: AdminStatsPeriod; label: string }[] = [
  { key: 'day', label: 'Today' },
  { key: 'week', label: '7 Days' },
  { key: 'month', label: '30 Days' },
];

function PeriodStatsSection() {
  const [period, setPeriod] = useState<AdminStatsPeriod>('day');
  const { data, isLoading } = useAdminPeriodStats(period);

  const cards = [
    { label: 'New Users',     value: isLoading ? '—' : (data?.newUsers ?? '—') },
    { label: 'Alerts Sent',   value: isLoading ? '—' : (data?.alertsSent ?? '—') },
    { label: 'Crawl Success', value: isLoading ? '—' : (data?.crawlSuccessRate ?? '—'), unit: '%' },
    { label: 'Total Crawls',  value: isLoading ? '—' : (data?.totalCrawls ?? '—') },
  ];

  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ font: '700 16px/1 var(--font-display)', margin: 0, letterSpacing: '-0.01em' }}>
          Statistics
        </h2>
        <div style={{ display: 'flex', gap: 0 }}>
          {PERIOD_LABELS.map(({ key, label }, i) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              style={{
                padding: '6px 14px',
                font: '700 11px/1 var(--font-mono)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                border: '1px solid var(--line)',
                borderRight: i < PERIOD_LABELS.length - 1 ? 'none' : '1px solid var(--line)',
                borderRadius: i === 0 ? '6px 0 0 6px' : i === PERIOD_LABELS.length - 1 ? '0 6px 6px 0' : 0,
                background: period === key ? 'var(--gold)' : 'transparent',
                color: period === key ? '#0B0B0F' : 'var(--bone)',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {cards.map(({ label, value, unit }) => (
          <StatCard key={label} label={label} value={value} unit={unit} />
        ))}
      </div>
    </div>
  );
}

// ─── Trigger Crawl Button ────────────────────────────────────────────────────

function TriggerCrawlButton() {
  const { mutate, isPending, isSuccess, isError, data, reset } = useTriggerCrawl();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        onClick={() => { reset(); mutate(); }}
        disabled={isPending}
        style={{
          height: 36, padding: '0 18px',
          background: isPending ? 'rgba(212,175,55,0.15)' : 'var(--gold)',
          border: '1px solid var(--gold)', borderRadius: 8,
          cursor: isPending ? 'not-allowed' : 'pointer',
          font: '700 11px/1 var(--font-mono)', color: isPending ? 'var(--gold)' : '#0B0B0F',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          transition: 'all 140ms ease', opacity: isPending ? 0.7 : 1,
        }}
      >
        {isPending ? '⟳ Triggering…' : 'Trigger Crawl'}
      </button>
      {isSuccess && data && (
        <span style={{ font: '600 11px/1 var(--font-mono)', color: 'var(--up)', letterSpacing: '0.04em' }}>
          ✓ {data.triggered} source{data.triggered !== 1 ? 's' : ''} triggered
        </span>
      )}
      {isError && (
        <span style={{ font: '600 11px/1 var(--font-mono)', color: 'var(--down)', letterSpacing: '0.04em' }}>
          ✗ Crawl failed
        </span>
      )}
    </div>
  );
}

// ─── Overview Page ────────────────────────────────────────────────────────────

export default function AdminOverviewPage() {
  const { data: stats, isLoading, isError } = useAdminStats();

  return (
    <div style={{ padding: '32px 36px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ font: '800 28px/1 var(--font-display)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Overview
          </h1>
          <div style={{ font: '500 12px/1 var(--font-mono)', color: 'var(--mute)' }}>
            System health and key metrics
          </div>
        </div>
        <TriggerCrawlButton />
      </div>

      {/* Top stat cards + User Status donut */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1.6fr', gap: 16, marginBottom: 36 }}>
        <StatCard label="Total Users"         value={isLoading ? '—' : (stats?.totalUsers ?? '—')} />
        <StatCard label="Active Users"        value={isLoading ? '—' : (stats?.activeUsers ?? '—')} />
        <StatCard label="Alerts Sent Today"   value={isLoading ? '—' : (stats?.alertsSentToday ?? '—')} />
        <StatCard label="Crawl Success Rate"  value={isLoading ? '—' : (stats?.crawlSuccessRate ?? '—')} unit="%" />
        {!isLoading && stats ? (
          <UserStatusCard totalUsers={stats.totalUsers} activeUsers={stats.activeUsers} />
        ) : (
          <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 12 }} />
        )}
      </div>

      {/* Activity Charts */}
      <ChartsSection />

      {/* Period Statistics */}
      <PeriodStatsSection />

      {/* Data Sources Table */}
      <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ font: '700 16px/1 var(--font-display)', margin: 0, letterSpacing: '-0.01em' }}>
            Data Sources
          </h2>
          <span style={{ font: '700 10px/1 var(--font-mono)', color: 'var(--mute)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {stats?.dataSources?.length ?? 0} sources
          </span>
        </div>

        {isLoading && <div style={{ padding: '24px', font: '500 13px/1 var(--font-mono)', color: 'var(--mute)' }}>Loading…</div>}
        {isError  && <div style={{ padding: '24px', font: '500 13px/1 var(--font-mono)', color: 'var(--down)' }}>Failed to load data sources.</div>}

        {!isLoading && !isError && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--ink-3)' }}>
                {['Name', 'Brand', 'Status', 'Last Crawled', 'Latest Status'].map(col => (
                  <th key={col} style={{ textAlign: 'left', padding: '10px 16px', font: '700 10px/1 var(--font-mono)', color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(stats?.dataSources ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px 16px', font: '500 13px/1 var(--font-mono)', color: 'var(--mute)', textAlign: 'center' }}>
                    No data sources found.
                  </td>
                </tr>
              ) : (stats?.dataSources ?? []).map(ds => (
                <tr key={ds.id} style={{ borderTop: '1px solid var(--hairline)' }}>
                  <td style={{ padding: '14px 16px', font: '600 13px/1 var(--font-display)' }}>{ds.name}</td>
                  <td style={{ padding: '14px 16px', font: '700 11px/1 var(--font-mono)', color: 'var(--gold)', letterSpacing: '0.06em' }}>{ds.brand}</td>
                  <td style={{ padding: '14px 16px' }}><StatusBadge active={ds.isActive} /></td>
                  <td style={{ padding: '14px 16px', font: '500 12px/1 var(--font-mono)', color: 'var(--mute)' }}>
                    {ds.lastCrawledAt ? new Date(ds.lastCrawledAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {ds.lastStatus ? (
                      <span style={{ font: '700 9px/1 var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: ds.lastStatus === 'completed' ? 'var(--up)' : ds.lastStatus === 'failed' ? 'var(--down)' : 'var(--gold)' }}>
                        {ds.lastStatus}
                      </span>
                    ) : (
                      <span style={{ font: '500 12px/1 var(--font-mono)', color: 'var(--mute)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
