'use client';

import { useState } from 'react';
import { useAdminAuditLog } from '@/lib/admin.api';
import { cn } from '@/lib/utils';

const TH = 'text-left p-[10px_16px] font-mono text-[10px] leading-none font-bold text-mute tracking-[0.14em] uppercase whitespace-nowrap';

function actionBadgeColor(action: string): { bg: string; fg: string; border: string } {
  const a = action.toLowerCase();
  if (a.includes('lock'))     return { bg: 'rgba(239,68,68,0.12)',  fg: '#ef4444', border: 'rgba(239,68,68,0.3)'  };
  if (a.includes('forecast')) return { bg: 'rgba(212,175,55,0.12)', fg: '#D4AF37', border: 'rgba(212,175,55,0.3)' };
  if (a.includes('anomaly'))  return { bg: 'rgba(99,155,255,0.12)', fg: '#7aa4f7', border: 'rgba(99,155,255,0.3)' };
  return { bg: 'rgba(180,180,200,0.10)', fg: 'var(--bone)', border: 'var(--line)' };
}

function ActionBadge({ action }: { action: string }) {
  const c = actionBadgeColor(action);
  return (
    <span
      className="inline-block px-2 py-[3px] rounded font-mono text-[9px] leading-none font-bold tracking-[0.12em] uppercase whitespace-nowrap border"
      style={{ background: c.bg, color: c.fg, borderColor: c.border }}
    >
      {action}
    </span>
  );
}

function truncate(str: string | null | undefined, max: number): string {
  if (!str) return '—';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export default function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useAdminAuditLog(page);

  const items: Array<{
    id: string; createdAt: string; adminId: string; action: string;
    entityType: string; entityId: string; newValue: unknown;
  }> = data?.data ?? [];

  const totalPages: number = data?.total ? Math.ceil(data.total / (data.limit ?? 30)) : 1;

  const paginationBtn = (disabled: boolean) => cn(
    'px-4 py-[7px] bg-transparent border border-line rounded-md font-mono text-[10px] leading-none font-bold tracking-[0.08em] uppercase',
    disabled ? 'text-mute cursor-not-allowed opacity-40' : 'text-bone cursor-pointer',
  );

  return (
    <div className="p-[32px_36px]">
      <div className="mb-7">
        <h1 className="font-display text-[28px] leading-none font-extrabold m-0 mb-[6px] tracking-[-0.02em]">
          Audit Log
        </h1>
        <div className="font-mono text-[12px] leading-none text-mute">
          Admin action history — 30 entries per page
        </div>
      </div>

      <div className="bg-ink-2 border border-line rounded-[12px] overflow-hidden mb-5">
        {isLoading && <div className="p-6 font-mono text-[13px] leading-none text-mute">Loading…</div>}
        {isError  && <div className="p-6 font-mono text-[13px] leading-none text-down">Failed to load audit log.</div>}

        {!isLoading && !isError && (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-ink-3">
                {['Date', 'Admin ID', 'Action', 'Entity Type', 'Entity ID', 'New Value'].map(col => (
                  <th key={col} className={TH}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-[24px_16px] font-mono text-[13px] text-mute text-center">
                    No audit log entries found.
                  </td>
                </tr>
              ) : items.map((entry, i) => {
                const newValueStr = entry.newValue != null ? truncate(JSON.stringify(entry.newValue), 80) : '—';
                return (
                  <tr key={entry.id ?? i} className="border-t border-hairline">
                    <td className="p-[12px_16px] font-mono text-[11px] leading-none text-mute whitespace-nowrap">
                      {entry.createdAt ? new Date(entry.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—'}
                    </td>
                    <td className="p-[12px_16px] font-mono text-[11px] leading-none text-bone">
                      {truncate(entry.adminId, 12)}
                    </td>
                    <td className="p-[12px_16px]">
                      <ActionBadge action={entry.action}/>
                    </td>
                    <td className="p-[12px_16px] font-mono text-[12px] leading-none text-bone">
                      {entry.entityType ?? '—'}
                    </td>
                    <td className="p-[12px_16px] font-mono text-[11px] leading-none text-mute">
                      {truncate(entry.entityId, 12)}
                    </td>
                    <td className="p-[12px_16px] font-mono text-[11px] leading-none text-mute max-w-[260px]">
                      <span title={entry.newValue != null ? JSON.stringify(entry.newValue) : undefined}>
                        {newValueStr}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center gap-3 justify-end">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className={paginationBtn(page <= 1)}>
          ← Prev
        </button>
        <span className="font-mono text-[12px] leading-none text-mute">
          Page {page}{totalPages > 1 ? ` / ${totalPages}` : ''}
        </span>
        <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className={paginationBtn(page >= totalPages)}>
          Next →
        </button>
      </div>
    </div>
  );
}
