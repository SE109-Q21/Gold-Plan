'use client';

import { useState } from 'react';
import { useAdminUsers, useLockUser, useUnlockUser } from '@/lib/admin.api';

// ─── Status Badge ─────────────────────────────────────────────────────────────

function UserStatusBadge({ status }: { status: string }) {
  const color =
    status === 'active'  ? 'var(--up)' :
    status === 'locked'  ? 'var(--down)' :
    status === 'pending' ? 'var(--gold)' :
    'var(--mute)';

  const bg =
    status === 'active'  ? 'rgba(88,200,150,0.12)' :
    status === 'locked'  ? 'rgba(200,80,80,0.12)' :
    status === 'pending' ? 'rgba(212,175,55,0.12)' :
    'rgba(100,100,120,0.12)';

  const border =
    status === 'active'  ? 'rgba(88,200,150,0.3)' :
    status === 'locked'  ? 'rgba(200,80,80,0.3)' :
    status === 'pending' ? 'rgba(212,175,55,0.3)' :
    'var(--line)';

  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 8px',
      borderRadius: 4,
      font: '700 9px/1 var(--font-mono)',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      background: bg,
      color,
      border: `1px solid ${border}`,
    }}>
      {status}
    </span>
  );
}

// ─── Users Page ───────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useAdminUsers(page);
  const { mutate: lock, isPending: isLocking } = useLockUser();
  const { mutate: unlock, isPending: isUnlocking } = useUnlockUser();

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 20;
  const totalPages = Math.ceil(total / limit);
  const isMutating = isLocking || isUnlocking;

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          font: '800 28px/1 var(--font-display)',
          margin: '0 0 6px',
          letterSpacing: '-0.02em',
        }}>
          Users
        </h1>
        <div style={{ font: '500 12px/1 var(--font-mono)', color: 'var(--mute)' }}>
          {total > 0 ? `${total} registered accounts` : 'Manage user accounts'}
        </div>
      </div>

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
            Failed to load users.
          </div>
        )}

        {!isLoading && !isError && (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--ink-3)' }}>
                  {['Email', 'Display Name', 'Role', 'Status', 'Alerts', 'Created At', 'Actions'].map(col => (
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
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{
                      padding: '24px 16px',
                      font: '500 13px/1 var(--font-mono)',
                      color: 'var(--mute)',
                      textAlign: 'center',
                    }}>
                      No users found.
                    </td>
                  </tr>
                ) : users.map(u => (
                  <tr key={u.id} style={{ borderTop: '1px solid var(--hairline)' }}>
                    <td style={{ padding: '14px 16px', font: '500 13px/1 var(--font-mono)', color: 'var(--bone)' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '14px 16px', font: '500 13px/1 var(--font-display)', color: 'var(--chalk)' }}>
                      {u.displayName ?? <span style={{ color: 'var(--mute)' }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        font: '700 10px/1 var(--font-mono)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: u.role === 'admin' ? 'var(--gold)' : 'var(--mute)',
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <UserStatusBadge status={u.status} />
                    </td>
                    <td style={{ padding: '14px 16px', font: '500 12px/1 var(--font-mono)', color: 'var(--mute)', textAlign: 'center' }}>
                      {u.alertCount}
                    </td>
                    <td style={{ padding: '14px 16px', font: '500 12px/1 var(--font-mono)', color: 'var(--mute)', whiteSpace: 'nowrap' }}>
                      {new Date(u.createdAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {u.status === 'locked' ? (
                        <button
                          onClick={() => unlock(u.id)}
                          disabled={isMutating}
                          style={{
                            padding: '6px 12px',
                            background: 'transparent',
                            border: '1px solid var(--up)',
                            borderRadius: 6,
                            cursor: isMutating ? 'not-allowed' : 'pointer',
                            font: '700 10px/1 var(--font-mono)',
                            color: 'var(--up)',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            opacity: isMutating ? 0.5 : 1,
                          }}
                        >
                          Unlock
                        </button>
                      ) : u.status === 'active' || u.status === 'pending' ? (
                        <button
                          onClick={() => lock(u.id)}
                          disabled={isMutating}
                          style={{
                            padding: '6px 12px',
                            background: 'transparent',
                            border: '1px solid var(--down)',
                            borderRadius: 6,
                            cursor: isMutating ? 'not-allowed' : 'pointer',
                            font: '700 10px/1 var(--font-mono)',
                            color: 'var(--down)',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            opacity: isMutating ? 0.5 : 1,
                          }}
                        >
                          Lock
                        </button>
                      ) : (
                        <span style={{ font: '500 11px/1 var(--font-mono)', color: 'var(--mute)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                padding: '16px 20px',
                borderTop: '1px solid var(--hairline)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{ font: '500 11px/1 var(--font-mono)', color: 'var(--mute)' }}>
                  Page {page} of {totalPages} · {total} total
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    style={{
                      padding: '6px 14px',
                      background: 'transparent',
                      border: '1px solid var(--line)',
                      borderRadius: 6,
                      cursor: page <= 1 ? 'not-allowed' : 'pointer',
                      font: '700 10px/1 var(--font-mono)',
                      color: page <= 1 ? 'var(--mute)' : 'var(--bone)',
                      letterSpacing: '0.08em',
                      opacity: page <= 1 ? 0.5 : 1,
                    }}
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    style={{
                      padding: '6px 14px',
                      background: 'transparent',
                      border: '1px solid var(--line)',
                      borderRadius: 6,
                      cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                      font: '700 10px/1 var(--font-mono)',
                      color: page >= totalPages ? 'var(--mute)' : 'var(--bone)',
                      letterSpacing: '0.08em',
                      opacity: page >= totalPages ? 0.5 : 1,
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
