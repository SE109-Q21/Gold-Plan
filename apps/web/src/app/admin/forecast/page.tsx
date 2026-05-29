'use client';

import React, { useState } from 'react';
import {
  useAdminForecastSessions, useAdminSessionVotes,
  useOpenForecastSession, useCloseForecastSession, useSetForecastResult,
  useAutoScoreForecastSession,
} from '@/lib/admin.api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

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
    status === 'open'   ? 'bg-[rgba(88,200,150,0.12)] text-[#22c55e] border-[rgba(88,200,150,0.3)] hover:bg-[rgba(88,200,150,0.12)]' :
    status === 'scored' ? 'bg-[rgba(212,175,55,0.12)] text-gold border-[rgba(212,175,55,0.3)] hover:bg-[rgba(212,175,55,0.12)]' :
    'bg-[rgba(100,100,120,0.18)] text-mute border-line hover:bg-[rgba(100,100,120,0.18)]';
  return (
    <Badge className={cn('font-mono text-[9px] font-bold tracking-[0.12em] uppercase border', cls)}>
      {status === 'open' ? 'Mở' : status === 'scored' ? 'Đã chấm' : 'Đã đóng'}
    </Badge>
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

  if (isLoading) return <tr><td colSpan={9} className="p-[12px_20px] font-mono text-[12px] text-mute bg-ink-3">Đang tải phiếu bầu…</td></tr>;
  if (isError)   return <tr><td colSpan={9} className="p-[12px_20px] font-mono text-[12px] text-down bg-ink-3">Không thể tải phiếu bầu.</td></tr>;

  return (
    <tr>
      <td colSpan={9} className="bg-ink-3 p-0">
        <div className="p-[12px_20px_16px]">
          <div className="font-mono text-[10px] leading-none font-bold text-mute tracking-[0.12em] uppercase mb-[10px]">
            Phiếu bầu ({votes.length})
          </div>
          {votes.length === 0 ? (
            <div className="font-mono text-[12px] leading-none text-mute">Chưa có phiếu bầu cho phiên này.</div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Email', 'Tên hiển thị', 'Hướng', 'Thời gian bầu', 'Đúng?'].map(col => (
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

const INPUT_CLS = 'bg-ink border-line font-mono text-[13px] leading-none text-chalk focus-visible:ring-gold h-[36px]';
const LABEL_CLS = 'font-mono text-[10px] leading-none font-bold text-mute tracking-[0.12em] uppercase mb-[6px]';

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
        <Label className={LABEL_CLS}>Ngày</Label>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} required className={INPUT_CLS}/>
      </div>
      <div>
        <Label className={LABEL_CLS}>Đóng lúc</Label>
        <Input type="datetime-local" value={closesAt} onChange={e => setClosesAt(e.target.value)} required className={INPUT_CLS}/>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending} className="px-[18px] h-[36px] font-mono text-[11px] font-bold tracking-[0.08em] uppercase">
          {isPending ? 'Đang mở…' : 'Mở phiên'}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} className="px-[14px] h-[36px] border-line bg-transparent text-mute hover:bg-ink-3 hover:text-bone font-mono text-[11px] font-bold tracking-[0.08em] uppercase">
          Hủy
        </Button>
      </div>
    </form>
  );
}

export default function AdminForecastPage() {
  const { data: sessions, isLoading, isError } = useAdminForecastSessions();
  const { mutate: closeSession, isPending: isClosing } = useCloseForecastSession();
  const { mutate: setResult, isPending: isSettingResult } = useSetForecastResult();
  const { mutate: autoScore, isPending: isAutoScoring } = useAutoScoreForecastSession();
  const [showNewForm, setShowNewForm] = useState(false);
  const [expandedVotes, setExpandedVotes] = useState<string | null>(null);
  const [showManualOverride, setShowManualOverride] = useState<string | null>(null);

  function toggleVotes(id: string) { setExpandedVotes(prev => prev === id ? null : id); }

  return (
    <div className="h-full overflow-auto bg-ink">
    <div className="p-[32px_36px_60px]">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-display text-[28px] leading-none font-extrabold m-0 mb-[6px] tracking-[-0.02em]">Phiên Dự Báo</h1>
          <div className="font-mono text-[12px] leading-none text-mute">Quản lý phiên dự báo giá vàng và kết quả</div>
        </div>
        <Button
          onClick={() => setShowNewForm(v => !v)}
          className={cn(
            'px-[18px] h-[38px] font-mono text-[11px] font-bold tracking-[0.08em] uppercase',
            showNewForm ? 'bg-[rgba(212,175,55,0.15)] border border-gold text-gold hover:bg-[rgba(212,175,55,0.25)] hover:text-gold' : '',
          )}
        >
          {showNewForm ? 'Hủy' : '+ Mở phiên mới'}
        </Button>
      </div>

      {showNewForm && <NewSessionForm onClose={() => setShowNewForm(false)}/>}

      <div className="bg-ink-2 border border-line rounded-[12px] overflow-hidden">
        {isLoading && <div className="p-6 font-mono text-[13px] leading-none text-mute">Đang tải…</div>}
        {isError  && <div className="p-6 font-mono text-[13px] leading-none text-down">Không thể tải phiên dự báo.</div>}

        {!isLoading && !isError && (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-ink-3">
                {['Ngày', 'Trạng thái', 'Phiếu bầu (↑/→/↓)', 'Kết quả', 'Hành động'].map(col => (
                  <th key={col} className={TH}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(sessions ?? []).length === 0 ? (
                <tr><td colSpan={5} className="p-[24px_16px] font-mono text-[13px] text-mute text-center">Không tìm thấy phiên dự báo nào.</td></tr>
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
                            <Button variant="outline" size="sm" onClick={() => closeSession(session.id)} disabled={isClosing} className="px-[9px] py-[5px] h-auto border-line bg-transparent text-mute hover:bg-ink-3 hover:text-bone font-mono text-[10px] font-bold tracking-[0.06em] uppercase">
                              Đóng
                            </Button>
                          )}
                          {status === 'closed' && (
                            <div className="flex flex-col gap-[6px]">
                              {/* Primary: auto-score from price data */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => autoScore(session.id)}
                                disabled={isAutoScoring || isSettingResult}
                                className="px-[9px] py-[5px] h-auto border-gold bg-[rgba(212,175,55,0.08)] text-gold hover:bg-[rgba(212,175,55,0.16)] hover:text-gold font-mono text-[10px] font-bold tracking-[0.06em] uppercase whitespace-nowrap"
                              >
                                {isAutoScoring ? '⏳ Đang chấm…' : '⚡ Chấm tự động'}
                              </Button>
                              {/* Override toggle */}
                              <button
                                type="button"
                                onClick={() => setShowManualOverride(prev => prev === session.id ? null : session.id)}
                                className="font-mono text-[9px] leading-none text-mute hover:text-bone tracking-[0.06em] text-left"
                              >
                                {showManualOverride === session.id ? '▲ ẩn' : '▼ chấm thủ công'}
                              </button>
                              {showManualOverride === session.id && (
                                <div className="flex gap-[4px] flex-wrap mt-[2px]">
                                  <span className="font-mono text-[8px] leading-none text-mute uppercase tracking-[0.08em] self-center mr-1">override:</span>
                                  <Button variant="outline" size="sm" onClick={() => setResult({ id: session.id, actualResult: 'up' })}   disabled={isSettingResult || isAutoScoring} className="px-[8px] py-[4px] h-auto border-[#22c55e] bg-transparent text-[#22c55e] hover:bg-[rgba(34,197,94,0.08)] hover:text-[#22c55e] font-mono text-[9px] font-bold tracking-[0.06em] uppercase">↑</Button>
                                  <Button variant="outline" size="sm" onClick={() => setResult({ id: session.id, actualResult: 'flat' })} disabled={isSettingResult || isAutoScoring} className="px-[8px] py-[4px] h-auto border-gold bg-transparent text-gold hover:bg-[rgba(212,175,55,0.08)] hover:text-gold font-mono text-[9px] font-bold tracking-[0.06em] uppercase">→</Button>
                                  <Button variant="outline" size="sm" onClick={() => setResult({ id: session.id, actualResult: 'down' })} disabled={isSettingResult || isAutoScoring} className="px-[8px] py-[4px] h-auto border-[#ef4444] bg-transparent text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] hover:text-[#ef4444] font-mono text-[9px] font-bold tracking-[0.06em] uppercase">↓</Button>
                                </div>
                              )}
                            </div>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleVotes(session.id)}
                            className={cn(
                              'px-[9px] py-[5px] h-auto font-mono text-[10px] font-bold tracking-[0.06em] uppercase whitespace-nowrap',
                              isExpanded ? 'bg-[rgba(100,100,120,0.18)] border-bone text-chalk hover:bg-[rgba(100,100,120,0.28)] hover:text-chalk' : 'border-line bg-transparent text-mute hover:bg-ink-3 hover:text-bone',
                            )}
                          >
                            {isExpanded ? 'Ẩn' : 'Phiếu bầu'}
                          </Button>
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
    </div>
  );
}
