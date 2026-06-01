'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLeaderboard } from '@/lib/forecast.api';
import type { LeaderboardEntryDto } from '@gpls/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

function IconArrowLeft({ s = 16 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
    </svg>
  );
}

function prevMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split('-');
  return `Tháng ${Number(m)}/${y}`;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-[18px]">🥇</span>;
  if (rank === 2) return <span className="text-[18px]">🥈</span>;
  if (rank === 3) return <span className="text-[18px]">🥉</span>;
  return (
    <span className="font-mono text-[13px] leading-none font-bold text-mute min-w-[22px] inline-block text-center">
      {rank}
    </span>
  );
}

function EntryRow({ entry, index }: { entry: LeaderboardEntryDto; index: number }) {
  const isTop3 = entry.rank <= 3;
  return (
    <div
      className={cn(
        'grid items-center px-6 py-[14px]',
        index !== 0 && 'border-t border-hairline',
        entry.rank === 1 && 'bg-[rgba(212,175,55,0.05)]',
      )}
      style={{ gridTemplateColumns: '44px 1fr 80px 64px 64px' }}
    >
      <div className="flex items-center justify-center">
        <RankBadge rank={entry.rank} />
      </div>
      <div>
        <span className={cn(
          'font-display text-[14px] leading-none',
          isTop3 ? 'font-bold text-chalk' : 'font-medium text-bone',
        )}>
          {entry.displayName ?? `Người dùng ${entry.userId.slice(0, 6)}`}
        </span>
      </div>
      <div className="text-right">
        <span className={cn(
          'font-display text-[16px] leading-none font-bold [font-variant-numeric:tabular-nums]',
          isTop3 ? 'text-gold' : 'text-chalk',
        )}>
          {entry.totalPoints}
        </span>
      </div>
      <div className="text-right">
        <span className="font-mono text-[13px] [font-variant-numeric:tabular-nums] text-[#22c55e] font-semibold">
          {entry.correctCount}
        </span>
      </div>
      <div className="text-right">
        <span className="font-mono text-[13px] [font-variant-numeric:tabular-nums] text-mute font-semibold">
          {entry.streak}
        </span>
      </div>
    </div>
  );
}

function buildMonthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    options.push({ value, label: fmtMonth(value) });
  }
  return options;
}


function LeaderboardContent() {
  const router = useRouter();
  const [month, setMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const { data, isLoading, isError } = useLeaderboard(month);

  const canGoForward = nextMonth(month) <= new Date().toISOString().slice(0, 7);
  const monthOptions = buildMonthOptions();

  return (
    <div className="h-full overflow-auto bg-ink">
    <div className="p-[32px_28px_60px] max-w-[760px] mx-auto">
      <Button
        variant="ghost"
        onClick={() => router.push('/')}
        className="text-mute flex items-center gap-[6px] font-mono text-[12px] font-semibold tracking-[0.08em] p-0 pb-6 h-auto hover:bg-transparent hover:text-bone"
      >
        <IconArrowLeft s={14}/> quay lại dashboard
      </Button>

      {/* Page header */}
      <div className="mb-7">
        <h1 className="font-display text-[28px] leading-none font-extrabold m-0 mb-2 tracking-[-0.02em] uppercase">
          Bảng xếp hạng
        </h1>
        <p className="font-mono text-[13px] leading-[1.5] text-mute m-0">
          Top nhà dự báo theo điểm tháng
        </p>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" onClick={() => setMonth(prev => prevMonth(prev))} aria-label="Tháng trước" className="w-[34px] h-[34px] p-0 bg-ink-2 border-line text-bone hover:bg-ink-3 font-display text-[16px] font-bold">
          ‹
        </Button>
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="h-[34px] px-3 bg-ink-2 border border-line rounded-md text-chalk font-display text-[13px] font-bold cursor-pointer outline-none"
        >
          {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <Button variant="outline" onClick={() => setMonth(prev => nextMonth(prev))} disabled={!canGoForward} aria-label="Tháng sau" className="w-[34px] h-[34px] p-0 bg-ink-2 border-line text-bone hover:bg-ink-3 font-display text-[16px] font-bold disabled:opacity-40">
          ›
        </Button>
      </div>

      {/* Table */}
      <div className="bg-ink-2 border border-line rounded-[14px] overflow-hidden">
        {/* Header */}
        <div
          className="grid px-6 py-3 bg-ink-3 border-b border-hairline font-mono text-[10px] text-mute tracking-[0.14em] uppercase"
          style={{ gridTemplateColumns: '44px 1fr 80px 64px 64px' }}
        >
          <span className="text-center">#</span>
          <span>Tên</span>
          <span className="text-right">Điểm</span>
          <span className="text-right">Đúng</span>
          <span className="text-right">Chuỗi</span>
        </div>

        {isLoading && (
          <div className="p-[32px_24px] font-mono text-[13px] leading-none text-mute text-center">đang tải…</div>
        )}

        {isError && !isLoading && (
          <div className="p-[32px_24px] font-mono text-[13px] leading-none text-down text-center">Không thể tải bảng xếp hạng.</div>
        )}

        {!isLoading && !isError && data && data.entries.length === 0 && (
          <div className="p-[32px_24px] font-mono text-[13px] leading-none text-mute text-center">Chưa có dữ liệu cho tháng này.</div>
        )}

        {!isLoading && !isError && data && data.entries.map((entry, i) => (
          <EntryRow key={entry.userId} entry={entry} index={i} />
        ))}
      </div>

      {data && data.entries.length > 0 && (
        <p className="font-mono text-[11px] leading-[1.5] text-mute mt-4 text-center">
          Mỗi dự báo đúng = +1 điểm · Chuỗi liên tiếp thưởng thêm điểm bonus
        </p>
      )}
    </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return <LeaderboardContent />;
}
