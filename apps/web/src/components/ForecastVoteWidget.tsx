'use client';

import { useRouter } from 'next/navigation';
import { useActiveSession, useCastVote } from '@/lib/forecast.api';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

function pad2(n: number) { return String(n).padStart(2, '0'); }
function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

type Direction = 'up' | 'flat' | 'down';

const DIRECTION_CONFIG: Record<Direction, { label: string; arrow: string; color: string; bg: string; borderAlpha: string }> = {
  up:   { label: 'Tăng',  arrow: '↑', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   borderAlpha: 'rgba(34,197,94,0.25)' },
  flat: { label: 'Đi ngang', arrow: '→', color: '#D4AF37', bg: 'rgba(212,175,55,0.12)',  borderAlpha: 'rgba(212,175,55,0.25)' },
  down: { label: 'Giảm', arrow: '↓', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   borderAlpha: 'rgba(239,68,68,0.25)' },
};

const RESULT_COLOR: Record<Direction, string> = {
  up: '#22c55e',
  flat: '#D4AF37',
  down: '#ef4444',
};

export function ForecastVoteWidget() {
  const { user } = useAuth();
  const router = useRouter();

  const { data: session, isLoading } = useActiveSession(user ? user.id : null);
  const castVote = useCastVote();

  function handleVote(direction: Direction) {
    if (!session || !user) return;
    castVote.mutate({ sessionId: session.id, direction });
  }

  const hasVoted = session?.userVote !== null && session?.userVote !== undefined;
  const ratios = session?.ratios;

  return (
    <div className="bg-ink-2 border border-[rgba(212,175,55,0.2)] rounded-[12px] p-5">
      {/* Header */}
      <div className="flex justify-between items-baseline mb-4">
        <h3 className="font-display text-[16px] leading-none font-bold m-0">Dự báo cộng đồng</h3>
        {session && !session.sessionClosed && (
          <span className="font-mono text-[10px] text-mute tracking-[0.08em]">
            Đóng lúc {fmtTime(session.closesAt)}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="font-mono text-[13px] leading-none font-medium text-mute py-3">Đang tải…</div>
      )}

      {!isLoading && !session && (
        <div className="font-mono text-[13px] leading-[1.5] font-medium text-mute py-2">
          Hôm nay chưa có phiên dự báo
        </div>
      )}

      {/* Closed with result */}
      {!isLoading && session?.sessionClosed && session.actualResult && (
        <div className="py-3">
          <div className="font-mono text-[11px] text-mute tracking-[0.12em] uppercase mb-2">
            Kết quả hôm nay
          </div>
          <div className="flex items-center gap-[10px]">
            <span
              className="font-display text-[32px] leading-none font-extrabold"
              style={{ color: RESULT_COLOR[session.actualResult] }}
            >
              {DIRECTION_CONFIG[session.actualResult].arrow}
            </span>
            <span
              className="font-display text-[18px] leading-none font-bold"
              style={{ color: RESULT_COLOR[session.actualResult] }}
            >
              {DIRECTION_CONFIG[session.actualResult].label}
            </span>
          </div>
          {session.userVote && (
            <div
              className="mt-[10px] font-mono text-[12px] leading-none font-medium"
              style={{ color: session.userVote === session.actualResult ? '#22c55e' : '#ef4444' }}
            >
              {session.userVote === session.actualResult ? '✓ Bạn dự đoán đúng!' : '✗ Bạn dự đoán sai.'}
            </div>
          )}
        </div>
      )}

      {/* Active session */}
      {!isLoading && session && !session.sessionClosed && (
        <>
          {/* Vote buttons */}
          {!hasVoted && (
            <div className="flex flex-col gap-2">
              {(['up', 'flat', 'down'] as Direction[]).map(dir => {
                const cfg = DIRECTION_CONFIG[dir];
                return (
                  <button
                    key={dir}
                    onClick={() => handleVote(dir)}
                    disabled={castVote.isPending || !user}
                    className={cn(
                      'flex items-center gap-[10px] px-4 py-3 rounded-lg border transition-opacity duration-[140ms]',
                      (castVote.isPending || !user) ? 'cursor-not-allowed' : 'cursor-pointer',
                      castVote.isPending && 'opacity-60',
                    )}
                    style={{ background: cfg.bg, borderColor: cfg.borderAlpha }}
                  >
                    <span className="font-display text-[22px] leading-none font-extrabold w-6 text-center" style={{ color: cfg.color }}>
                      {cfg.arrow}
                    </span>
                    <span className="font-display text-[14px] leading-none font-bold" style={{ color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
              {!user && (
                <button
                  onClick={() => router.push('/auth/login?from=%2F')}
                  className="bg-transparent border-0 p-0 cursor-pointer font-mono text-[11px] leading-[1.4] text-gold mt-2 underline text-left"
                >
                  Đăng nhập để bỏ phiếu →
                </button>
              )}
            </div>
          )}

          {/* Ratio bars */}
          {hasVoted && ratios && (
            <div className="flex flex-col gap-[10px]">
              {(['up', 'flat', 'down'] as Direction[]).map(dir => {
                const cfg = DIRECTION_CONFIG[dir];
                const pct = Math.round((ratios[dir] ?? 0) * 100);
                const isChosen = session.userVote === dir;
                return (
                  <div key={dir}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-[6px]">
                        <span className="font-display text-[16px] leading-none font-bold" style={{ color: cfg.color }}>{cfg.arrow}</span>
                        <span
                          className="font-display text-[13px] leading-none font-semibold"
                          style={{ color: isChosen ? cfg.color : 'var(--bone)' }}
                        >
                          {cfg.label}
                        </span>
                        {isChosen && (
                          <span className="font-mono text-[11px] leading-none font-bold" style={{ color: cfg.color }}>✓</span>
                        )}
                      </div>
                      <span className="font-mono text-[12px] font-bold" style={{ color: cfg.color }}>{pct}%</span>
                    </div>
                    <div className="h-[6px] rounded bg-[rgba(255,255,255,0.06)] overflow-hidden">
                      <div
                        className="h-full rounded transition-[width] duration-500"
                        style={{ width: `${pct}%`, background: cfg.color }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="font-mono text-[10px] text-mute mt-1">{session.totalVotes} lượt bình chọn</div>
            </div>
          )}

          {/* Voted but no ratios */}
          {hasVoted && !ratios && (
            <div className="font-mono text-[13px] leading-[1.5] font-medium text-mute py-2">
              Đã bình chọn:{' '}
              <strong style={{ color: (DIRECTION_CONFIG[session.userVote as Direction] ?? DIRECTION_CONFIG['flat']).color }}>
                {(DIRECTION_CONFIG[session.userVote as Direction] ?? DIRECTION_CONFIG['flat']).label}
              </strong>
            </div>
          )}
        </>
      )}
    </div>
  );
}
