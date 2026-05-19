'use client';

import React, { useState } from 'react';
import {
  useAdminForecastSessions,
  useAdminSessionVotes,
  useOpenForecastSession,
  useCloseForecastSession,
  useSetForecastResult,
} from '@/lib/admin.api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DIR_COLOR: Record<string, string> = {
  up: '#22c55e',
  flat: '#D4AF37',
  down: '#ef4444',
};

const DIR_ARROW: Record<string, string> = {
  up: '↑',
  flat: '→',
  down: '↓',
};

function sessionStatus(s: { scoredAt: string | null; sessionClosed: boolean }) {
  if (s.scoredAt) return 'scored';
  if (s.sessionClosed) return 'closed';
  return 'open';
}

function StatusBadge({ status }: { status: 'open' | 'closed' | 'scored' }) {
  const colors: Record<string, { bg: string; fg: string; border: string }> = {
    open: { bg: 'rgba(88,200,150,0.12)', fg: '#22c55e', border: 'rgba(88,200,150,0.3)' },
    closed: { bg: 'rgba(100,100,120,0.18)', fg: 'var(--mute)', border: 'var(--line)' },
    scored: { bg: 'rgba(212,175,55,0.12)', fg: '#D4AF37', border: 'rgba(212,175,55,0.3)' },
  };
  const c = colors[status];
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 8px',
      borderRadius: 4,
      font: '700 9px/1 var(--font-mono)',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      background: c.bg,
      color: c.fg,
      border: `1px solid ${c.border}`,
    }}>
      {status}
    </span>
  );
}

// ─── Vote Bar ─────────────────────────────────────────────────────────────────

function VoteBar({ counts }: { counts: { up: number; down: number; flat: number; total: number } }) {
  const total = counts.total || 1;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 140 }}>
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', flex: 1, background: 'var(--ink-3)' }}>
        {counts.up > 0 && (
          <div style={{ width: `${(counts.up / total) * 100}%`, background: '#22c55e' }} />
        )}
        {counts.flat > 0 && (
          <div style={{ width: `${(counts.flat / total) * 100}%`, background: '#D4AF37' }} />
        )}
        {counts.down > 0 && (
          <div style={{ width: `${(counts.down / total) * 100}%`, background: '#ef4444' }} />
        )}
      </div>
      <span style={{ font: '500 10px/1 var(--font-mono)', color: 'var(--mute)', whiteSpace: 'nowrap' }}>
        <span style={{ color: '#22c55e' }}>{counts.up}</span>
        {' / '}
        <span style={{ color: '#D4AF37' }}>{counts.flat}</span>
        {' / '}
        <span style={{ color: '#ef4444' }}>{counts.down}</span>
      </span>
    </div>
  );
}

// ─── Vote Detail Panel ────────────────────────────────────────────────────────

function VoteDetailPanel({ sessionId }: { sessionId: string }) {
  const { data, isLoading, isError } = useAdminSessionVotes(sessionId);

  if (isLoading) {
    return (
      <tr>
        <td colSpan={9} style={{ padding: '12px 20px', font: '500 12px/1 var(--font-mono)', color: 'var(--mute)', background: 'var(--ink-3)' }}>
          Loading votes…
        </td>
      </tr>
    );
  }

  if (isError) {
    return (
      <tr>
        <td colSpan={9} style={{ padding: '12px 20px', font: '500 12px/1 var(--font-mono)', color: 'var(--down)', background: 'var(--ink-3)' }}>
          Failed to load votes.
        </td>
      </tr>
    );
  }

  const votes: Array<{ id: string; email: string; displayName: string | null; direction: string; votedAt: string; isCorrect: boolean | null }> = data?.votes ?? [];

  return (
    <tr>
      <td colSpan={9} style={{ background: 'var(--ink-3)', padding: '0' }}>
        <div style={{ padding: '12px 20px 16px' }}>
          <div style={{ font: '700 10px/1 var(--font-mono)', color: 'var(--mute)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
            Votes ({votes.length})
          </div>
          {votes.length === 0 ? (
            <div style={{ font: '500 12px/1 var(--font-mono)', color: 'var(--mute)' }}>No votes for this session.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Email', 'Display Name', 'Direction', 'Voted At', 'Correct?'].map(col => (
                    <th key={col} style={{
                      textAlign: 'left',
                      padding: '6px 12px',
                      font: '700 9px/1 var(--font-mono)',
                      color: 'var(--mute)',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      borderBottom: '1px solid var(--hairline)',
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {votes.map((v, i) => (
                  <tr key={v.id} style={{ borderTop: i > 0 ? '1px solid var(--hairline)' : undefined }}>
                    <td style={{ padding: '7px 12px', font: '400 11px/1 var(--font-mono)', color: 'var(--bone)' }}>
                      {v.email}
                    </td>
                    <td style={{ padding: '7px 12px', font: '500 12px/1 var(--font-display)', color: 'var(--chalk)' }}>
                      {v.displayName}
                    </td>
                    <td style={{ padding: '7px 12px' }}>
                      <span style={{ font: '700 13px/1 var(--font-mono)', color: DIR_COLOR[v.direction] ?? 'var(--bone)' }}>
                        {DIR_ARROW[v.direction] ?? v.direction}
                      </span>
                    </td>
                    <td style={{ padding: '7px 12px', font: '400 11px/1 var(--font-mono)', color: 'var(--mute)', whiteSpace: 'nowrap' }}>
                      {new Date(v.votedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                    </td>
                    <td style={{ padding: '7px 12px', font: '700 12px/1 var(--font-mono)' }}>
                      {v.isCorrect === null ? (
                        <span style={{ color: 'var(--mute)' }}>—</span>
                      ) : v.isCorrect ? (
                        <span style={{ color: '#22c55e' }}>✓</span>
                      ) : (
                        <span style={{ color: '#ef4444' }}>✗</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── New Session Form ─────────────────────────────────────────────────────────

function NewSessionForm({ onClose }: { onClose: () => void }) {
  const [date, setDate] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const { mutate: openSession, isPending } = useOpenForecastSession();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !closesAt) return;
    openSession({ date, closesAt }, { onSuccess: onClose });
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--ink)',
    border: '1px solid var(--line)',
    borderRadius: 6,
    padding: '8px 12px',
    font: '500 13px/1 var(--font-mono)',
    color: 'var(--chalk)',
    outline: 'none',
    colorScheme: 'dark',
  };

  const labelStyle: React.CSSProperties = {
    font: '700 10px/1 var(--font-mono)',
    color: 'var(--mute)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginBottom: 6,
    display: 'block',
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: 'var(--ink-2)',
        border: '1px solid var(--line)',
        borderRadius: 10,
        padding: '20px 24px',
        marginBottom: 24,
        display: 'flex',
        gap: 24,
        alignItems: 'flex-end',
        flexWrap: 'wrap',
      }}
    >
      <div>
        <label style={labelStyle}>Date</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>Closes At</label>
        <input
          type="datetime-local"
          value={closesAt}
          onChange={e => setClosesAt(e.target.value)}
          required
          style={inputStyle}
        />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: '8px 18px',
            background: 'var(--gold)',
            border: 0,
            borderRadius: 6,
            cursor: isPending ? 'not-allowed' : 'pointer',
            font: '700 11px/1 var(--font-mono)',
            color: '#000',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? 'Opening…' : 'Open Session'}
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '8px 14px',
            background: 'transparent',
            border: '1px solid var(--line)',
            borderRadius: 6,
            cursor: 'pointer',
            font: '700 11px/1 var(--font-mono)',
            color: 'var(--mute)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Forecast Sessions Page ───────────────────────────────────────────────────

export default function AdminForecastPage() {
  const { data: sessions, isLoading, isError } = useAdminForecastSessions();
  const { mutate: closeSession, isPending: isClosing } = useCloseForecastSession();
  const { mutate: setResult, isPending: isSettingResult } = useSetForecastResult();

  const [showNewForm, setShowNewForm] = useState(false);
  const [expandedVotes, setExpandedVotes] = useState<string | null>(null);

  function toggleVotes(id: string) {
    setExpandedVotes(prev => (prev === id ? null : id));
  }

  const actionBtnStyle = (color: string): React.CSSProperties => ({
    padding: '5px 9px',
    background: 'transparent',
    border: `1px solid ${color}`,
    borderRadius: 5,
    cursor: 'pointer',
    font: '700 10px/1 var(--font-mono)',
    color,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  });

  return (
    <div style={{ padding: '32px 36px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ font: '800 28px/1 var(--font-display)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Forecast Sessions
          </h1>
          <div style={{ font: '500 12px/1 var(--font-mono)', color: 'var(--mute)' }}>
            Manage gold price forecast sessions and results
          </div>
        </div>
        <button
          onClick={() => setShowNewForm(v => !v)}
          style={{
            padding: '9px 18px',
            background: showNewForm ? 'rgba(212,175,55,0.15)' : 'var(--gold)',
            border: showNewForm ? '1px solid var(--gold)' : '0',
            borderRadius: 8,
            cursor: 'pointer',
            font: '700 11px/1 var(--font-mono)',
            color: showNewForm ? 'var(--gold)' : '#000',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {showNewForm ? 'Cancel' : '+ Open New Session'}
        </button>
      </div>

      {/* New Session Form */}
      {showNewForm && (
        <NewSessionForm onClose={() => setShowNewForm(false)} />
      )}

      {/* Table card */}
      <div style={{
        background: 'var(--ink-2)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {isLoading && (
          <div style={{ padding: '24px', font: '500 13px/1 var(--font-mono)', color: 'var(--mute)' }}>
            Loading…
          </div>
        )}
        {isError && (
          <div style={{ padding: '24px', font: '500 13px/1 var(--font-mono)', color: 'var(--down)' }}>
            Failed to load forecast sessions.
          </div>
        )}
        {!isLoading && !isError && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--ink-3)' }}>
                {['Date', 'Status', 'Votes (↑/→/↓)', 'Result', 'Actions'].map(col => (
                  <th key={col} style={{
                    textAlign: 'left',
                    padding: '10px 16px',
                    font: '700 10px/1 var(--font-mono)',
                    color: 'var(--mute)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(sessions ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} style={{
                    padding: '24px 16px',
                    font: '500 13px/1 var(--font-mono)',
                    color: 'var(--mute)',
                    textAlign: 'center',
                  }}>
                    No forecast sessions found.
                  </td>
                </tr>
              ) : (sessions ?? []).map(session => {
                const status = sessionStatus(session);
                const isExpanded = expandedVotes === session.id;

                return (
                  <React.Fragment key={session.id}>
                    <tr style={{ borderTop: '1px solid var(--hairline)' }}>
                      {/* Date */}
                      <td style={{ padding: '14px 16px', font: '600 13px/1 var(--font-mono)', color: 'var(--chalk)', whiteSpace: 'nowrap' }}>
                        {session.date}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <StatusBadge status={status as 'open' | 'closed' | 'scored'} />
                      </td>

                      {/* Vote bar */}
                      <td style={{ padding: '14px 16px' }}>
                        <VoteBar counts={session.voteCounts} />
                      </td>

                      {/* Result */}
                      <td style={{ padding: '14px 16px' }}>
                        {session.actualResult ? (
                          <span style={{
                            font: '700 14px/1 var(--font-mono)',
                            color: DIR_COLOR[session.actualResult],
                          }}>
                            {DIR_ARROW[session.actualResult]} {session.actualResult.toUpperCase()}
                          </span>
                        ) : (
                          <span style={{ font: '500 12px/1 var(--font-mono)', color: 'var(--mute)' }}>—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {status === 'open' && (
                            <button
                              onClick={() => closeSession(session.id)}
                              disabled={isClosing}
                              style={actionBtnStyle('var(--mute)')}
                            >
                              Close
                            </button>
                          )}
                          {status === 'closed' && (
                            <>
                              <button
                                onClick={() => setResult({ id: session.id, actualResult: 'up' })}
                                disabled={isSettingResult}
                                style={actionBtnStyle('#22c55e')}
                              >
                                ↑ Up
                              </button>
                              <button
                                onClick={() => setResult({ id: session.id, actualResult: 'flat' })}
                                disabled={isSettingResult}
                                style={actionBtnStyle('#D4AF37')}
                              >
                                → Flat
                              </button>
                              <button
                                onClick={() => setResult({ id: session.id, actualResult: 'down' })}
                                disabled={isSettingResult}
                                style={actionBtnStyle('#ef4444')}
                              >
                                ↓ Down
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => toggleVotes(session.id)}
                            style={{
                              ...actionBtnStyle('var(--mute)'),
                              background: isExpanded ? 'rgba(100,100,120,0.18)' : 'transparent',
                              color: isExpanded ? 'var(--chalk)' : 'var(--mute)',
                              borderColor: isExpanded ? 'var(--bone)' : 'var(--line)',
                            }}
                          >
                            {isExpanded ? 'Hide' : 'Votes'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <VoteDetailPanel sessionId={session.id} />
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
