'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useActiveSession, useCastVote } from '@/lib/forecast.api';
import { useAuth } from '@/contexts/auth-context';

function pad2(n: number) { return String(n).padStart(2, '0'); }
function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

type Direction = 'up' | 'flat' | 'down';

const DIRECTION_CONFIG: Record<Direction, { label: string; arrow: string; color: string; bg: string }> = {
  up:   { label: 'Up',   arrow: '↑', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  flat: { label: 'Flat', arrow: '→', color: '#D4AF37', bg: 'rgba(212,175,55,0.12)' },
  down: { label: 'Down', arrow: '↓', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
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
    <div style={{
      background: 'var(--ink-2)',
      border: '1px solid rgba(212,175,55,0.2)',
      borderRadius: 12,
      padding: 20,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <h3 style={{ font: '700 16px/1 var(--font-display)', margin: 0 }}>
          Community forecast
        </h3>
        {session && !session.sessionClosed && (
          <span className="mono" style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '0.08em' }}>
            Closes at {fmtTime(session.closesAt)}
          </span>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ font: '500 13px/1 var(--font-mono)', color: 'var(--mute)', padding: '12px 0' }}>
          Loading…
        </div>
      )}

      {/* No session */}
      {!isLoading && !session && (
        <div style={{ font: '500 13px/1.5 var(--font-mono)', color: 'var(--mute)', padding: '8px 0' }}>
          No forecast session today
        </div>
      )}

      {/* Active session — closed with result */}
      {!isLoading && session?.sessionClosed && session.actualResult && (
        <div style={{ padding: '12px 0' }}>
          <div style={{ font: '700 11px/1 var(--font-mono)', color: 'var(--mute)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
            Today&apos;s result
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ font: '800 32px/1 var(--font-display)', color: RESULT_COLOR[session.actualResult] }}>
              {DIRECTION_CONFIG[session.actualResult].arrow}
            </span>
            <span style={{ font: '700 18px/1 var(--font-display)', color: RESULT_COLOR[session.actualResult] }}>
              {DIRECTION_CONFIG[session.actualResult].label}
            </span>
          </div>
          {session.userVote && (
            <div style={{ marginTop: 10, font: '500 12px/1 var(--font-mono)', color: session.userVote === session.actualResult ? '#22c55e' : '#ef4444' }}>
              {session.userVote === session.actualResult ? '✓ You got it right!' : '✗ You got it wrong.'}
            </div>
          )}
        </div>
      )}

      {/* Active session — voting or results */}
      {!isLoading && session && !session.sessionClosed && (
        <>
          {/* Vote buttons (pre-vote) */}
          {!hasVoted && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(['up', 'flat', 'down'] as Direction[]).map(dir => {
                const cfg = DIRECTION_CONFIG[dir];
                return (
                  <button
                    key={dir}
                    onClick={() => handleVote(dir)}
                    disabled={castVote.isPending || !user}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 16px',
                      background: cfg.bg,
                      border: `1px solid ${cfg.color}40`,
                      borderRadius: 8,
                      cursor: castVote.isPending || !user ? 'not-allowed' : 'pointer',
                      opacity: castVote.isPending ? 0.6 : 1,
                      transition: 'opacity 140ms ease, border-color 140ms ease',
                    }}
                  >
                    <span style={{ font: '800 22px/1 var(--font-display)', color: cfg.color, width: 24, textAlign: 'center' }}>
                      {cfg.arrow}
                    </span>
                    <span style={{ font: '700 14px/1 var(--font-display)', color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
              {!user && (
                <button
                  onClick={() => router.push('/auth/login?from=%2F')}
                  style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', font: '500 11px/1.4 var(--font-mono)', color: 'var(--gold)', margin: '8px 0 0', textDecoration: 'underline' }}
                >
                  Sign in to vote →
                </button>
              )}
            </div>
          )}

          {/* Ratio bars (post-vote) */}
          {hasVoted && ratios && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(['up', 'flat', 'down'] as Direction[]).map(dir => {
                const cfg = DIRECTION_CONFIG[dir];
                const pct = Math.round((ratios[dir] ?? 0) * 100);
                const isChosen = session.userVote === dir;
                return (
                  <div key={dir}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ font: '700 16px/1 var(--font-display)', color: cfg.color }}>{cfg.arrow}</span>
                        <span style={{ font: '600 13px/1 var(--font-display)', color: isChosen ? cfg.color : 'var(--bone)' }}>
                          {cfg.label}
                        </span>
                        {isChosen && (
                          <span style={{ font: '700 11px/1 var(--font-mono)', color: cfg.color }}>✓</span>
                        )}
                      </div>
                      <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>
                        {pct}%
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: cfg.color,
                        borderRadius: 4,
                        transition: 'width 500ms ease',
                      }} />
                    </div>
                  </div>
                );
              })}
              <div className="mono" style={{ fontSize: 10, color: 'var(--mute)', marginTop: 4 }}>
                {session.totalVotes} votes
              </div>
            </div>
          )}

          {/* Voted but no ratios yet */}
          {hasVoted && !ratios && (
            <div style={{ font: '500 13px/1.5 var(--font-mono)', color: 'var(--mute)', padding: '8px 0' }}>
              Voted: <strong style={{ color: (DIRECTION_CONFIG[session.userVote as Direction] ?? DIRECTION_CONFIG['flat']).color }}>
                {(DIRECTION_CONFIG[session.userVote as Direction] ?? DIRECTION_CONFIG['flat']).label}
              </strong>
            </div>
          )}
        </>
      )}
    </div>
  );
}
