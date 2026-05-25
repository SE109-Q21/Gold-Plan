'use client';

import React, { useState } from 'react';
import {
  useAdminForecastSessions, useAdminSessionVotes,
  useOpenForecastSession, useCloseForecastSession, useSetForecastResult,
} from '@/lib/admin.api';
import { cn } from '@/lib/utils';

const TH = 'text-left p-[10px_16px] font-mono text-[10px] leading-none font-bold text-mute tracking-[0.14em] uppercase whitespace-nowrap';

const DIR_COLOR: Record<string, string> = { up: '#22c55e', flat: '#D4AF37', down: '#ef4444' };
const DIR_ARROW: Record<string, string> = { up: '↑', flat: '→', down: '↓' };

function sessionStatus(s: { scoredAt: string | null; sessionClosed: boolean }) {
  if (s.scoredAt) return 'scored';
  if (s.sessionClosed) return 'closed';
  return 'open';
}

function StatusBadge({ status }: { status: 'open' | 'closed' | 'scored' }) {
  const cls =
    status === 'open'   ? 'bg-[rgba(88,200,150,0.12)] text-[#22c55e] border-[rgba(88,200,150,0.3)]' :
    status === 'scored' ? 'bg-[rgba(212,175,55,0.12)] text-gold border-[rgba(212,175,55,0.3)]' :
    'bg-[rgba(100,100,120,0.18)] text-mute border-line';
  return (
    <span className={cn('inline-block px-2 py-[3px] rounded font-mono text-[9px] leading-none font-bold tracking-[0.12em] uppercase border', cls)}>
      {status}
    </span>
  );
}

function VoteBar({ counts }: { counts: { up: number; down: number; flat: number; total: number } }) {
  const total = counts.total || 1;
  return (
    <div className="flex items-center gap-[6px] min-w-[140px]">
      <div className="flex h-2 rounded overflow-hidden flex-1 bg-ink-3">
        {counts.up   > 0 && <div className="bg-[#22c55e]" style={{ width: `${(counts.up   / total) * 100}%` }}/>}
        {counts.flat > 0 && <div className="bg-gold"      style={{ width: `${(counts.flat / total) * 100}%` }}/>}
        {counts.down > 0 && <div className="bg-[#ef4444]" style={{ width: `${(counts.down / total) * 100}%` }}/>}
      </div>
      <span className="font-mono text-[10px] leading-none text-mute whitespace-nowrap">
        <span className="text-[#22c55e]">{counts.up}</span>
        {' / '}
        <span className="text-gold">{counts.flat}</span>
        {' / '}
        <span className="text-[#ef4444]">{counts.down}</span>
      </span>
    </div>
  );
}

function VoteDetailPanel({ sessionId }: { sessionId: string }) {
  const { data, isLoading, isError } = useAdminSessionVotes(sessionId);
  const votes: Array<{ id: string; email: string; displayName: string | null; direction: string; votedAt: string; isCorrect: boolean | null }> = data?.votes ?? [];

  if (isLoading) return <tr><td colSpan={9} className="p-[12px_20px] font-mono text-[12px] text-mute bg-ink-3">Loading votes…</td></tr>;
  if (isError)   return <tr><td colSpan={9} className="p-[12px_20px] font-mono text-[12px] text-down bg-ink-3">Failed to load votes.</td></tr>;

  return (
    <tr>
      <td colSpan={9} className="bg-ink-3 p-0">
        <div className="p-[12px_20px_16px]">
          <div className="font-mono text-[10px] leading-none font-bold text-mute tracking-[0.12em] uppercase mb-[10px]">
            Votes ({votes.length})
          </div>
          {votes.length === 0 ? (
            <div className="font-mono text-[12px] leading-none text-mute">No votes for this session.</div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Email', 'Display Name', 'Direction', 'Voted At', 'Correct?'].map(col => (
                    <th key={col} className="text-left p-[6px_12px] font-mono text-[9px] leading-none font-bold text-mute tracking-[0.12em] uppercase border-b border-hairline">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {votes.map((v, i) => (
                  <tr key={v.id} className={i > 0 ? 'border-t border-hairline' : ''}>
                    <td className="p-[7px_12px] font-mono text-[11px] leading-none text-bone">{v.email}</td>
                    <td className="p-[7px_12px] font-display text-[12px] leading-none font-medium text-chalk">{v.displayName}</td>
                    <td className="p-[7px_12px]">
                      <span className="font-mono text-[13px] leading-none font-bold" style={{ color: DIR_COLOR[v.direction] ?? 'var(--bone)' }}>
                        {DIR_ARROW[v.direction] ?? v.direction}
                      </span>
                    </td>
                    <td className="p-[7px_12px] font-mono text-[11px] leading-none text-mute whitespace-nowrap">
                      {new Date(v.votedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                    </td>
                    <td className="p-[7px_12px] font-mono text-[12px] leading-none font-bold">
                      {v.isCorrect === null ? <span className="text-mute">—</span> : v.isCorrect ? <span className="text-[#22c55e]">✓</span> : <span className="text-[#ef4444]">✗</span>}
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

const INPUT_CLS = 'bg-ink border border-line rounded-md px-3 py-2 font-mono text-[13px] leading-none text-chalk outline-none';

function NewSessionForm({ onClose }: { onClose: () => void }) {
  const [date, setDate] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const { mutate: openSession, isPending } = useOpenForecastSession();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !closesAt) return;
    openSession({ date, closesAt }, { onSuccess: onClose });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-ink-2 border border-line rounded-[10px] p-[20px_24px] mb-6 flex gap-6 items-end flex-wrap">
      <div>
        <label className="block font-mono text-[10px] leading-none font-bold text-mute tracking-[0.12em] uppercase mb-[6px]">Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={INPUT_CLS}/>
      </div>
      <div>
        <label className="block font-mono text-[10px] leading-none font-bold text-mute tracking-[0.12em] uppercase mb-[6px]">Closes At</label>
        <input type="datetime-local" value={closesAt} onChange={e => setClosesAt(e.target.value)} required className={INPUT_CLS}/>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className={cn('px-[18px] py-2 bg-gold border-0 rounded-md font-mono text-[11px] leading-none font-bold text-gold-ink tracking-[0.08em] uppercase', isPending ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer')}
        >
          {isPending ? 'Opening…' : 'Open Session'}
        </button>
        <button type="button" onClick={onClose} className="px-[14px] py-2 bg-transparent border border-line rounded-md font-mono text-[11px] leading-none font-bold text-mute tracking-[0.08em] uppercase cursor-pointer">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function AdminForecastPage() {
  const { data: sessions, isLoading, isError } = useAdminForecastSessions();
  const { mutate: closeSession, isPending: isClosing } = useCloseForecastSession();
  const { mutate: setResult, isPending: isSettingResult } = useSetForecastResult();
  const [showNewForm, setShowNewForm] = useState(false);
  const [expandedVotes, setExpandedVotes] = useState<string | null>(null);

  function toggleVotes(id: string) { setExpandedVotes(prev => prev === id ? null : id); }

  const actionBtn = (color: string, disabled: boolean) => cn(
    'px-[9px] py-[5px] bg-transparent border rounded-[5px] font-mono text-[10px] leading-none font-bold tracking-[0.06em] uppercase whitespace-nowrap',
    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
  );

  return (
    <div className="p-[32px_36px]">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-display text-[28px] leading-none font-extrabold m-0 mb-[6px] tracking-[-0.02em]">Forecast Sessions</h1>
          <div className="font-mono text-[12px] leading-none text-mute">Manage gold price forecast sessions and results</div>
        </div>
        <button
          onClick={() => setShowNewForm(v => !v)}
          className={cn(
            'px-[18px] py-[9px] rounded-lg font-mono text-[11px] leading-none font-bold tracking-[0.08em] uppercase cursor-pointer',
            showNewForm ? 'bg-[rgba(212,175,55,0.15)] border border-gold text-gold' : 'bg-gold border-0 text-gold-ink',
          )}
        >
          {showNewForm ? 'Cancel' : '+ Open New Session'}
        </button>
      </div>

      {showNewForm && <NewSessionForm onClose={() => setShowNewForm(false)}/>}

      <div className="bg-ink-2 border border-line rounded-[12px] overflow-hidden">
        {isLoading && <div className="p-6 font-mono text-[13px] leading-none text-mute">Loading…</div>}
        {isError  && <div className="p-6 font-mono text-[13px] leading-none text-down">Failed to load forecast sessions.</div>}

        {!isLoading && !isError && (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-ink-3">
                {['Date', 'Status', 'Votes (↑/→/↓)', 'Result', 'Actions'].map(col => (
                  <th key={col} className={TH}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(sessions ?? []).length === 0 ? (
                <tr><td colSpan={5} className="p-[24px_16px] font-mono text-[13px] text-mute text-center">No forecast sessions found.</td></tr>
              ) : (sessions ?? []).map(session => {
                const status = sessionStatus(session);
                const isExpanded = expandedVotes === session.id;
                return (
                  <React.Fragment key={session.id}>
                    <tr className="border-t border-hairline">
                      <td className="p-[14px_16px] font-mono text-[13px] leading-none font-semibold text-chalk whitespace-nowrap">
                        {session.date}
                      </td>
                      <td className="p-[14px_16px]">
                        <StatusBadge status={status as 'open' | 'closed' | 'scored'}/>
                      </td>
                      <td className="p-[14px_16px]">
                        <VoteBar counts={session.voteCounts}/>
                      </td>
                      <td className="p-[14px_16px]">
                        {session.actualResult ? (
                          <span className="font-mono text-[14px] leading-none font-bold" style={{ color: DIR_COLOR[session.actualResult] }}>
                            {DIR_ARROW[session.actualResult]} {session.actualResult.toUpperCase()}
                          </span>
                        ) : (
                          <span className="font-mono text-[12px] leading-none text-mute">—</span>
                        )}
                      </td>
                      <td className="p-[14px_16px]">
                        <div className="flex gap-[6px] flex-wrap items-center">
                          {status === 'open' && (
                            <button onClick={() => closeSession(session.id)} disabled={isClosing} className={cn(actionBtn('var(--mute)', isClosing), 'border-line text-mute')}>
                              Close
                            </button>
                          )}
                          {status === 'closed' && (
                            <>
                              <button onClick={() => setResult({ id: session.id, actualResult: 'up' })}   disabled={isSettingResult} className={cn(actionBtn('#22c55e', isSettingResult), 'border-[#22c55e] text-[#22c55e]')}>↑ Up</button>
                              <button onClick={() => setResult({ id: session.id, actualResult: 'flat' })} disabled={isSettingResult} className={cn(actionBtn('#D4AF37', isSettingResult), 'border-gold text-gold')}>→ Flat</button>
                              <button onClick={() => setResult({ id: session.id, actualResult: 'down' })} disabled={isSettingResult} className={cn(actionBtn('#ef4444', isSettingResult), 'border-[#ef4444] text-[#ef4444]')}>↓ Down</button>
                            </>
                          )}
                          <button
                            onClick={() => toggleVotes(session.id)}
                            className={cn(
                              'px-[9px] py-[5px] border rounded-[5px] font-mono text-[10px] leading-none font-bold tracking-[0.06em] uppercase cursor-pointer whitespace-nowrap',
                              isExpanded ? 'bg-[rgba(100,100,120,0.18)] border-bone text-chalk' : 'bg-transparent border-line text-mute',
                            )}
                          >
                            {isExpanded ? 'Hide' : 'Votes'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && <VoteDetailPanel sessionId={session.id}/>}
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
