'use client';

import React, { useState } from 'react';
import { useAdminStats, useAdminPeriodStats, useTriggerCrawl, useAdminTimeSeries } from '@/lib/admin.api';
import type { AdminStatsPeriod } from '@gpls/shared';
import type { TimeSeriesPoint } from '@/lib/admin.api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const TH = 'text-left p-[10px_16px] font-mono text-[10px] leading-none font-bold text-mute tracking-[0.14em] uppercase whitespace-nowrap';

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, unit, sub }: { label: string; value: string | number; unit?: string; sub?: string }) {
  return (
    <div className="bg-ink-2 border border-line rounded-[12px] p-[20px_24px]">
      <div className="font-mono text-[10px] leading-none font-bold text-mute tracking-[0.14em] uppercase mb-2">
        {label}
      </div>
      <div className="font-display text-[36px] leading-none font-extrabold tabular-nums flex items-baseline gap-1">
        {value}
        {unit && <span className="font-mono text-[14px] leading-none font-bold text-mute">{unit}</span>}
      </div>
      {sub && <div className="font-mono text-[10px] leading-none font-medium text-mute mt-2">{sub}</div>}
    </div>
  );
}

// ─── SVG Charts ───────────────────────────────────────────────────────────────

const W = 400;
const H = 110;
const GRIDS = 4;

function BarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const padT = 8;
  const padB = 0;
  const chartH = H - padT - padB;
  const gap = data.length > 20 ? 1 : 3;
  const bw = Math.max((W - gap * (data.length - 1)) / data.length, 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" style={{ height: H }} preserveAspectRatio="none">
      {Array.from({ length: GRIDS }, (_, i) => {
        const y = padT + (i / GRIDS) * chartH;
        return <line key={i} x1={0} y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.045)" strokeWidth={1} />;
      })}
      {data.map((d, i) => {
        const bh = Math.max((d.value / max) * chartH, d.value > 0 ? 3 : 0);
        const x = i * (bw + gap);
        const y = H - padB - bh;
        return (
          <rect key={i} x={x} y={y} width={bw} height={bh} fill={color} opacity={0.85} rx={2}>
            <title>{d.label}: {d.value}</title>
          </rect>
        );
      })}
    </svg>
  );
}

function LineChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const pad = 6;
  const n = data.length;

  if (n < 2) return null;

  const pts = data.map((d, i) => ({
    x: pad + (i / (n - 1)) * (W - pad * 2),
    y: pad + (1 - d.value / max) * (H - pad * 2),
    label: d.label,
    value: d.value,
  }));

  const smoothPath = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const prev = pts[i - 1];
    const cpx = ((prev.x + p.x) / 2).toFixed(1);
    return `${acc} C ${cpx} ${prev.y.toFixed(1)}, ${cpx} ${p.y.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, '');

  const fillPath = `${smoothPath} L ${pts[n - 1].x.toFixed(1)} ${H} L ${pts[0].x.toFixed(1)} ${H} Z`;
  const gid = `lg-${color.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" style={{ height: H }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {Array.from({ length: GRIDS }, (_, i) => {
        const y = pad + (i / GRIDS) * (H - pad * 2);
        return <line key={i} x1={pad} y1={y} x2={W - pad} y2={y} stroke="rgba(255,255,255,0.045)" strokeWidth={1} />;
      })}
      <path d={fillPath} fill={`url(#${gid})`} />
      <path d={smoothPath} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill={color}>
        <title>{pts[pts.length - 1].label}: {pts[pts.length - 1].value}</title>
      </circle>
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
    <svg width={88} height={88} viewBox="0 0 88 88" className="shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw} />
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
          <title>Hoạt động: {active}</title>
        </circle>
      )}
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
          <title>Không hoạt động: {inactive}</title>
        </circle>
      )}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--chalk)" fontSize={13} fontWeight={800} fontFamily="var(--font-display)">
        {total > 0 ? Math.round(activePct * 100) : 0}%
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill="var(--mute)" fontSize={9} fontFamily="var(--font-mono)">
        hoạt động
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
    <div className="bg-ink-2 border border-line rounded-[12px] p-[18px_20px_16px]">
      <div className="flex justify-between items-start mb-[16px]">
        <div>
          <div className="font-mono text-[10px] leading-none font-bold text-mute tracking-[0.14em] uppercase mb-[8px]">
            {title}
          </div>
          <div className="font-display text-[28px] leading-none font-extrabold tabular-nums text-chalk">
            {value}
          </div>
        </div>
        {delta !== undefined && (
          <span
            className="font-mono text-[10px] leading-none font-semibold px-[8px] py-[4px] rounded-[5px] border"
            style={{ color: accent, background: `${accent}14`, borderColor: `${accent}38` }}
          >
            {delta}
          </span>
        )}
      </div>
      <div className="rounded-[8px] overflow-hidden bg-ink-3/40">
        {chart}
      </div>
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
    <div className="mb-9">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-[16px] leading-none font-bold m-0 tracking-[-0.01em]">
          Hoạt động
        </h2>
        <div className="flex">
          {RANGES.map((r, i) => (
            <Button
              key={r}
              variant="outline"
              onClick={() => setRange(r)}
              className={cn(
                'px-[14px] py-[6px] h-auto font-mono text-[11px] font-bold tracking-[0.08em] uppercase border-line rounded-none',
                i === 0 && 'rounded-l-[6px]',
                i === RANGES.length - 1 && 'rounded-r-[6px]',
                i < RANGES.length - 1 && 'border-r-0',
                range === r ? 'bg-gold text-gold-ink border-gold hover:bg-gold hover:text-gold-ink' : 'bg-transparent text-bone hover:bg-ink-3',
              )}
            >
              {r}d
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="bg-ink-2 border border-line rounded-[12px] p-10 text-center font-mono text-[12px] leading-none text-mute">
          Đang tải biểu đồ…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <ChartCard
              title="Đăng ký mới"
              value={sum('newUsers')}
              delta={`${range}d total`}
              accent="#D4AF37"
              chart={<BarChart data={toBarData('newUsers')} color="#D4AF37" />}
            />
            <ChartCard
              title="Tỷ lệ thu thập thành công"
              value={`${series.length > 0 && sum('crawlsTotal') > 0 ? Math.round((sum('crawlsSuccess') / sum('crawlsTotal')) * 100) : 0}%`}
              delta={`${sum('crawlsTotal')} crawls`}
              accent="#22c55e"
              chart={<LineChart data={toCrawlRateLine()} color="#22c55e" />}
            />
            <ChartCard
              title="Cảnh báo đã kích hoạt"
              value={sum('alertsFired')}
              delta={`${range}d total`}
              accent="#7aa4f7"
              chart={<BarChart data={toBarData('alertsFired')} color="#7aa4f7" />}
            />
            <ChartCard
              title="Lượt dự báo"
              value={sum('forecastVotes')}
              delta={`${range}d total`}
              accent="#c084fc"
              chart={<BarChart data={toBarData('forecastVotes')} color="#c084fc" />}
            />
          </div>

          {series.length > 0 && (
            <div className="flex justify-between px-1">
              <span className="font-mono text-[10px] leading-none text-mute">{firstDate}</span>
              <span className="font-mono text-[10px] leading-none text-mute">{lastDate}</span>
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
    { label: 'Hoạt động', value: activeUsers, color: '#22c55e' },
    { label: 'Không hoạt động / Bị khóa', value: inactive, color: 'rgba(200,80,80,0.7)' },
  ];

  return (
    <div className="bg-ink-2 border border-line rounded-[12px] p-[20px_24px] flex gap-6 items-center">
      <DonutChart active={activeUsers} total={totalUsers} />
      <div className="flex-1">
        <div className="font-mono text-[10px] leading-none font-bold text-mute tracking-[0.14em] uppercase mb-[14px]">
          Phân loại người dùng
        </div>
        {rows.map(row => (
          <div key={row.label} className="mb-[10px]">
            <div className="flex justify-between mb-1">
              <span className="font-display text-[11px] leading-none font-semibold text-bone">{row.label}</span>
              <span className="font-mono text-[11px] leading-none font-bold" style={{ color: row.color }}>{row.value.toLocaleString()}</span>
            </div>
            <div className="h-1 rounded-[2px] bg-[rgba(255,255,255,0.06)] overflow-hidden">
              <div
                className="h-full rounded-[2px] transition-[width] duration-[600ms] ease-in-out"
                style={{ width: `${totalUsers > 0 ? (row.value / totalUsers) * 100 : 0}%`, background: row.color }}
              />
            </div>
          </div>
        ))}
        <div className="font-mono text-[10px] leading-none text-mute mt-[6px]">
          {totalUsers.toLocaleString()} total
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge className={cn(
      'font-mono text-[9px] font-bold tracking-[0.12em] uppercase border',
      active
        ? 'bg-[rgba(88,200,150,0.12)] text-up border-[rgba(88,200,150,0.3)] hover:bg-[rgba(88,200,150,0.12)]'
        : 'bg-[rgba(200,80,80,0.12)] text-down border-[rgba(200,80,80,0.3)] hover:bg-[rgba(200,80,80,0.12)]',
    )}>
      {active ? 'active' : 'inactive'}
    </Badge>
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
    { label: 'Người dùng mới',     value: isLoading ? '—' : (data?.newUsers ?? '—') },
    { label: 'Cảnh báo đã gửi',   value: isLoading ? '—' : (data?.alertsSent ?? '—') },
    { label: 'Thu thập thành công', value: isLoading ? '—' : (data?.crawlSuccessRate ?? '—'), unit: '%' as const },
    { label: 'Tổng lượt thu thập',  value: isLoading ? '—' : (data?.totalCrawls ?? '—') },
  ];

  return (
    <div className="mb-9">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-[16px] leading-none font-bold m-0 tracking-[-0.01em]">
          Thống kê
        </h2>
        <div className="flex">
          {PERIOD_LABELS.map(({ key, label }, i) => (
            <Button
              key={key}
              variant="outline"
              onClick={() => setPeriod(key)}
              className={cn(
                'px-[14px] py-[6px] h-auto font-mono text-[11px] font-bold tracking-[0.08em] uppercase border-line rounded-none',
                i === 0 && 'rounded-l-[6px]',
                i === PERIOD_LABELS.length - 1 && 'rounded-r-[6px]',
                i < PERIOD_LABELS.length - 1 && 'border-r-0',
                period === key ? 'bg-gold text-gold-ink border-gold hover:bg-gold hover:text-gold-ink' : 'bg-transparent text-bone hover:bg-ink-3',
              )}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
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
    <div className="flex items-center gap-3">
      <Button
        onClick={() => { reset(); mutate(); }}
        disabled={isPending}
        className={cn(
          'h-9 px-[18px] font-mono text-[11px] font-bold tracking-[0.08em] uppercase',
          isPending && 'bg-[rgba(212,175,55,0.15)] border border-gold text-gold hover:bg-[rgba(212,175,55,0.15)] hover:text-gold',
        )}
      >
        {isPending ? '⟳ Triggering…' : 'Trigger Crawl'}
      </Button>
      {isSuccess && data && (
        <span className="font-mono text-[11px] leading-none text-up tracking-[0.04em]">
          ✓ {data.triggered} source{data.triggered !== 1 ? 's' : ''} triggered
        </span>
      )}
      {isError && (
        <span className="font-mono text-[11px] leading-none text-down tracking-[0.04em]">
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
    <div className="h-full overflow-auto bg-ink">
    <div className="p-[32px_36px_60px]">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-[28px] leading-none font-extrabold m-0 mb-[6px] tracking-[-0.02em]">
            Tổng quan
          </h1>
          <div className="font-mono text-[12px] leading-none text-mute">
            Sức khỏe hệ thống và chỉ số chính
          </div>
        </div>
        <TriggerCrawlButton />
      </div>

      <div className="grid gap-4 mb-9" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1.6fr' }}>
        <StatCard label="Tổng người dùng"        value={isLoading ? '—' : (stats?.totalUsers ?? '—')} />
        <StatCard label="Người dùng hoạt động"       value={isLoading ? '—' : (stats?.activeUsers ?? '—')} />
        <StatCard label="Cảnh báo đã gửi hôm nay"  value={isLoading ? '—' : (stats?.alertsSentToday ?? '—')} />
        <StatCard label="Tỷ lệ thu thập thành công" value={isLoading ? '—' : (stats?.crawlSuccessRate ?? '—')} unit="%" />
        {!isLoading && stats ? (
          <UserStatusCard totalUsers={stats.totalUsers} activeUsers={stats.activeUsers} />
        ) : (
          <div className="bg-ink-2 border border-line rounded-[12px]" />
        )}
      </div>

      <ChartsSection />

      <PeriodStatsSection />

      <div className="bg-ink-2 border border-line rounded-[12px] overflow-hidden">
        <div className="p-[18px_24px] border-b border-line flex items-center justify-between">
          <h2 className="font-display text-[16px] leading-none font-bold m-0 tracking-[-0.01em]">
            Data Sources
          </h2>
          <span className="font-mono text-[10px] leading-none text-mute tracking-[0.1em] uppercase">
            {stats?.dataSources?.length ?? 0} sources
          </span>
        </div>

        {isLoading && <div className="p-6 font-mono text-[13px] leading-none text-mute">Loading…</div>}
        {isError  && <div className="p-6 font-mono text-[13px] leading-none text-down">Failed to load data sources.</div>}

        {!isLoading && !isError && (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-ink-3">
                {['Name', 'Brand', 'Status', 'Last Crawled', 'Latest Status'].map(col => (
                  <th key={col} className={TH}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(stats?.dataSources ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-[24px_16px] font-mono text-[13px] text-mute text-center">
                    No data sources found.
                  </td>
                </tr>
              ) : (stats?.dataSources ?? []).map(ds => (
                <tr key={ds.id} className="border-t border-hairline">
                  <td className="p-[14px_16px] font-display text-[13px] leading-none font-semibold">{ds.name}</td>
                  <td className="p-[14px_16px] font-mono text-[11px] leading-none font-bold text-gold tracking-[0.06em]">{ds.brand}</td>
                  <td className="p-[14px_16px]"><StatusBadge active={ds.isActive} /></td>
                  <td className="p-[14px_16px] font-mono text-[12px] leading-none text-mute">
                    {ds.lastCrawledAt ? new Date(ds.lastCrawledAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—'}
                  </td>
                  <td className="p-[14px_16px]">
                    {ds.lastStatus ? (
                      <span className={cn(
                        'font-mono text-[9px] leading-none font-bold tracking-[0.1em] uppercase',
                        ds.lastStatus === 'completed' ? 'text-up' :
                        ds.lastStatus === 'failed' ? 'text-down' : 'text-gold',
                      )}>
                        {ds.lastStatus}
                      </span>
                    ) : (
                      <span className="font-mono text-[12px] leading-none text-mute">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
    </div>
  );
}
