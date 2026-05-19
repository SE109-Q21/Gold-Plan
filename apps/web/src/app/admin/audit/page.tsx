'use client';

import { useState } from 'react';
import { useAdminAuditLog } from '@/lib/admin.api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function actionBadgeColor(action: string): { bg: string; fg: string; border: string } {
  const a = action.toLowerCase();
  if (a.includes('lock')) {
    return { bg: 'rgba(239,68,68,0.12)', fg: '#ef4444', border: 'rgba(239,68,68,0.3)' };
  }
  if (a.includes('forecast')) {
    return { bg: 'rgba(212,175,55,0.12)', fg: '#D4AF37', border: 'rgba(212,175,55,0.3)' };
  }
  if (a.includes('anomaly')) {
    return { bg: 'rgba(99,155,255,0.12)', fg: '#7aa4f7', border: 'rgba(99,155,255,0.3)' };
  }
  return { bg: 'rgba(180,180,200,0.10)', fg: 'var(--bone)', border: 'var(--line)' };
}

function ActionBadge({ action }: { action: string }) {
  const c = actionBadgeColor(action);
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
      whiteSpace: 'nowrap',
    }}>
      {action}
    </span>
  );
}

function truncate(str: string | null | undefined, max: number): string {
  if (!str) return '—';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

// ─── Audit Log Page ───────────────────────────────────────────────────────────

export default function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useAdminAuditLog(page);

  const items: Array<{
    id: string;
    createdAt: string;
    adminId: string;
    action: string;
    entityType: string;
    entityId: string;
    newValue: unknown;
  }> = data?.data ?? [];

  const totalPages: number = data?.total ? Math.ceil(data.total / (data.limit ?? 30)) : 1;

  const paginationBtnStyle = (disabled: boolean): React.CSSProperties => ({
    padding: '7px 16px',
    background: 'transparent',
    border: '1px solid var(--line)',
    borderRadius: 6,
    cursor: disabled ? 'not-allowed' : 'pointer',
    font: '700 10px/1 var(--font-mono)',
    color: disabled ? 'var(--mute)' : 'var(--bone)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    opacity: disabled ? 0.4 : 1,
  });

  return (
    <div style={{ padding: '32px 36px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          font: '800 28px/1 var(--font-display)',
          margin: '0 0 6px',
          letterSpacing: '-0.02em',
        }}>
          Audit Log
        </h1>
        <div style={{ font: '500 12px/1 var(--font-mono)', color: 'var(--mute)' }}>
          Admin action history — 30 entries per page
        </div>
      </div>

      {/* Table card */}
      <div style={{
        background: 'var(--ink-2)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 20,
      }}>
        {isLoading && (
          <div style={{ padding: '24px', font: '500 13px/1 var(--font-mono)', color: 'var(--mute)' }}>
            Loading…
          </div>
        )}
        {isError && (
          <div style={{ padding: '24px', font: '500 13px/1 var(--font-mono)', color: 'var(--down)' }}>
            Failed to load audit log.
          </div>
        )}
        {!isLoading && !isError && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--ink-3)' }}>
                {['Date', 'Admin ID', 'Action', 'Entity Type', 'Entity ID', 'New Value'].map(col => (
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
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{
                    padding: '24px 16px',
                    font: '500 13px/1 var(--font-mono)',
                    color: 'var(--mute)',
                    textAlign: 'center',
                  }}>
                    No audit log entries found.
                  </td>
                </tr>
              ) : items.map((entry, i) => {
                const newValueStr = entry.newValue != null
                  ? truncate(JSON.stringify(entry.newValue), 80)
                  : '—';

                return (
                  <tr key={entry.id ?? i} style={{ borderTop: '1px solid var(--hairline)' }}>
                    <td style={{
                      padding: '12px 16px',
                      font: '400 11px/1 var(--font-mono)',
                      color: 'var(--mute)',
                      whiteSpace: 'nowrap',
                    }}>
                      {entry.createdAt
                        ? new Date(entry.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
                        : '—'}
                    </td>
                    <td style={{
                      padding: '12px 16px',
                      font: '400 11px/1 var(--font-mono)',
                      color: 'var(--bone)',
                    }}>
                      {truncate(entry.adminId, 12)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <ActionBadge action={entry.action} />
                    </td>
                    <td style={{
                      padding: '12px 16px',
                      font: '500 12px/1 var(--font-mono)',
                      color: 'var(--bone)',
                    }}>
                      {entry.entityType ?? '—'}
                    </td>
                    <td style={{
                      padding: '12px 16px',
                      font: '400 11px/1 var(--font-mono)',
                      color: 'var(--mute)',
                    }}>
                      {truncate(entry.entityId, 12)}
                    </td>
                    <td style={{
                      padding: '12px 16px',
                      font: '400 11px/1 var(--font-mono)',
                      color: 'var(--mute)',
                      maxWidth: 260,
                    }}>
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

      {/* Pagination */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page <= 1}
          style={paginationBtnStyle(page <= 1)}
        >
          ← Prev
        </button>
        <span style={{ font: '500 12px/1 var(--font-mono)', color: 'var(--mute)' }}>
          Page {page}{totalPages > 1 ? ` / ${totalPages}` : ''}
        </span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={page >= totalPages}
          style={paginationBtnStyle(page >= totalPages)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
