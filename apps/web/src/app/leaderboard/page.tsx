'use client';

import { useState } from 'react';
import { useLeaderboard } from '@/lib/forecast.api';
import type { LeaderboardEntryDto } from '@gpls/shared';

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
  if (rank === 1) return <span style={{ fontSize: 18 }}>🥇</span>;
  if (rank === 2) return <span style={{ fontSize: 18 }}>🥈</span>;
  if (rank === 3) return <span style={{ fontSize: 18 }}>🥉</span>;
  return (
    <span className="mono" style={{ font: '700 13px/1 var(--font-mono)', color: 'var(--mute)', minWidth: 22, display: 'inline-block', textAlign: 'center' }}>
      {rank}
    </span>
  );
}

function EntryRow({ entry, index }: { entry: LeaderboardEntryDto; index: number }) {
  const isTop3 = entry.rank <= 3;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '44px 1fr 80px 64px 64px',
      alignItems: 'center',
      padding: '14px 24px',
      borderTop: index === 0 ? 'none' : '1px solid var(--hairline)',
      background: entry.rank === 1 ? 'rgba(212,175,55,0.05)' : 'transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RankBadge rank={entry.rank} />
      </div>
      <div>
        <span style={{
          font: `${isTop3 ? '700' : '500'} 14px/1 var(--font-display)`,
          color: isTop3 ? 'var(--chalk)' : 'var(--bone)',
        }}>
          {entry.displayName ?? `User ${entry.userId.slice(0, 6)}`}
        </span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{
          font: '700 16px/1 var(--font-display)',
          fontVariantNumeric: 'tabular-nums',
          color: isTop3 ? 'var(--gold)' : 'var(--chalk)',
        }}>
          {entry.totalPoints}
        </span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span className="mono" style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', color: '#22c55e', fontWeight: 600 }}>
          {entry.correctCount}
        </span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span className="mono" style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', color: 'var(--mute)', fontWeight: 600 }}>
          {entry.streak}
        </span>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const [month, setMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const { data, isLoading, isError } = useLeaderboard(month);

  const canGoForward = nextMonth(month) <= new Date().toISOString().slice(0, 7);

  return (
    <div style={{ padding: '32px 28px 60px', maxWidth: 760, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ font: '800 28px/1 var(--font-display)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Bảng xếp hạng
        </h1>
        <p style={{ font: '500 13px/1.5 var(--font-mono)', color: 'var(--mute)', margin: 0 }}>
          Top nhà dự báo theo điểm tháng
        </p>
      </div>

      {/* Month selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => setMonth(prev => prevMonth(prev))}
          style={{
            width: 34, height: 34, background: 'var(--ink-2)', border: '1px solid var(--line)',
            borderRadius: 6, cursor: 'pointer', color: 'var(--bone)',
            font: '700 16px/1 var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="Tháng trước"
        >
          ‹
        </button>
        <span style={{ font: '700 15px/1 var(--font-display)', minWidth: 140, textAlign: 'center', color: 'var(--chalk)' }}>
          {fmtMonth(month)}
        </span>
        <button
          onClick={() => setMonth(prev => nextMonth(prev))}
          disabled={!canGoForward}
          style={{
            width: 34, height: 34, background: 'var(--ink-2)', border: '1px solid var(--line)',
            borderRadius: 6, cursor: canGoForward ? 'pointer' : 'not-allowed', color: canGoForward ? 'var(--bone)' : 'var(--mute)',
            font: '700 16px/1 var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: canGoForward ? 1 : 0.4,
          }}
          aria-label="Tháng sau"
        >
          ›
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '44px 1fr 80px 64px 64px',
          padding: '12px 24px',
          background: 'var(--ink-3)',
          borderBottom: '1px solid var(--hairline)',
          font: '700 10px/1 var(--font-mono)',
          color: 'var(--mute)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}>
          <span style={{ textAlign: 'center' }}>#</span>
          <span>Tên</span>
          <span style={{ textAlign: 'right' }}>Điểm</span>
          <span style={{ textAlign: 'right' }}>Đúng</span>
          <span style={{ textAlign: 'right' }}>Chuỗi</span>
        </div>

        {/* Loading */}
        {isLoading && (
          <div style={{ padding: '32px 24px', font: '500 13px/1 var(--font-mono)', color: 'var(--mute)', textAlign: 'center' }}>
            đang tải…
          </div>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <div style={{ padding: '32px 24px', font: '500 13px/1 var(--font-mono)', color: '#ef4444', textAlign: 'center' }}>
            Không thể tải bảng xếp hạng.
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && data && data.entries.length === 0 && (
          <div style={{ padding: '32px 24px', font: '500 13px/1 var(--font-mono)', color: 'var(--mute)', textAlign: 'center' }}>
            Chưa có dữ liệu cho tháng này.
          </div>
        )}

        {/* Entries */}
        {!isLoading && !isError && data && data.entries.map((entry, i) => (
          <EntryRow key={entry.userId} entry={entry} index={i} />
        ))}
      </div>

      {/* Footer note */}
      {data && data.entries.length > 0 && (
        <p style={{ font: '500 11px/1.5 var(--font-mono)', color: 'var(--mute)', marginTop: 16, textAlign: 'center' }}>
          Mỗi dự báo đúng = +1 điểm · Chuỗi liên tiếp thưởng thêm điểm bonus
        </p>
      )}
    </div>
  );
}
