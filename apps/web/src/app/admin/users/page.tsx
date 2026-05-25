'use client';

import { useState } from 'react';
import { useAdminUsers, useLockUser, useUnlockUser, useChangeUserRole } from '@/lib/admin.api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const TH = 'text-left p-[10px_16px] font-mono text-[10px] leading-none font-bold text-mute tracking-[0.14em] uppercase whitespace-nowrap';
const TD = 'p-[14px_16px]';

function UserStatusBadge({ status }: { status: string }) {
  const cls =
    status === 'active'  ? 'bg-[rgba(88,200,150,0.12)] text-up border-[rgba(88,200,150,0.3)] hover:bg-[rgba(88,200,150,0.12)]' :
    status === 'locked'  ? 'bg-[rgba(200,80,80,0.12)] text-down border-[rgba(200,80,80,0.3)] hover:bg-[rgba(200,80,80,0.12)]' :
    status === 'pending' ? 'bg-[rgba(212,175,55,0.12)] text-gold border-[rgba(212,175,55,0.3)] hover:bg-[rgba(212,175,55,0.12)]' :
    'bg-[rgba(100,100,120,0.12)] text-mute border-line hover:bg-[rgba(100,100,120,0.12)]';

  return (
    <Badge className={cn('font-mono text-[9px] font-bold tracking-[0.12em] uppercase border', cls)}>
      {status}
    </Badge>
  );
}

const FILTER_SELECT = 'h-[34px] px-[10px] bg-ink-3 border border-line rounded-md font-mono text-[12px] leading-none text-bone cursor-pointer outline-none';

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const { data, isLoading, isError } = useAdminUsers({ page, search: search || undefined, status: statusFilter || undefined, role: roleFilter || undefined });
  const { mutate: lock, isPending: isLocking } = useLockUser();
  const { mutate: unlock, isPending: isUnlocking } = useUnlockUser();
  const { mutate: changeRole, isPending: isChangingRole } = useChangeUserRole();

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 20;
  const totalPages = Math.ceil(total / limit);
  const isMutating = isLocking || isUnlocking || isChangingRole;

  function handleSearchChange(v: string) { setSearch(v); setPage(1); }
  function handleFilterChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLSelectElement>) => { setter(e.target.value); setPage(1); };
  }

  const actionBtn = (color: 'up' | 'down' | 'gold' | 'mute', disabled: boolean) => cn(
    'px-[10px] py-[5px] bg-transparent rounded-[5px] font-mono text-[9px] leading-none font-bold tracking-[0.08em] uppercase border',
    color === 'up'   ? 'border-up text-up' :
    color === 'down' ? 'border-down text-down' :
    color === 'gold' ? 'border-[rgba(212,175,55,0.5)] text-gold' :
    'border-line text-mute',
    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
  );

  return (
    <div className="p-[32px_36px]">
      <div className="mb-6">
        <h1 className="font-display text-[28px] leading-none font-extrabold m-0 mb-[6px] tracking-[-0.02em]">Users</h1>
        <div className="font-mono text-[12px] leading-none text-mute">
          {total > 0 ? `${total} registered accounts` : 'Manage user accounts'}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-[10px] mb-4 flex-wrap">
        <Input
          type="text"
          placeholder="Search by email…"
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          className="flex-[1_1_200px] max-w-[300px] h-[34px] bg-ink-3 border-line text-chalk font-mono text-[13px] placeholder:text-mute focus-visible:ring-gold"
        />
        <select value={statusFilter} onChange={handleFilterChange(setStatusFilter)} className={FILTER_SELECT}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="locked">Locked</option>
          <option value="pending">Pending</option>
        </select>
        <select value={roleFilter} onChange={handleFilterChange(setRoleFilter)} className={FILTER_SELECT}>
          <option value="">All roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        {(search || statusFilter || roleFilter) && (
          <Button
            variant="outline"
            onClick={() => { setSearch(''); setStatusFilter(''); setRoleFilter(''); setPage(1); }}
            className="h-[34px] px-[14px] border-line bg-transparent text-mute hover:bg-ink-3 hover:text-bone font-mono text-[11px] font-semibold tracking-[0.06em]"
          >
            Clear
          </Button>
        )}
      </div>

      <div className="bg-ink-2 border border-line rounded-[12px] overflow-hidden">
        {isLoading && <div className="p-6 font-mono text-[13px] leading-none text-mute">Loading…</div>}
        {isError  && <div className="p-6 font-mono text-[13px] leading-none text-down">Failed to load users.</div>}

        {!isLoading && !isError && (
          <>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-ink-3">
                  {['Email', 'Display Name', 'Role', 'Status', 'Alerts', 'Created At', 'Actions'].map(col => (
                    <th key={col} className={TH}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-[24px_16px] font-mono text-[13px] text-mute text-center">No users found.</td>
                  </tr>
                ) : users.map(u => (
                  <tr key={u.id} className="border-t border-hairline">
                    <td className={cn(TD, 'font-mono text-[13px] leading-none text-bone')}>{u.email}</td>
                    <td className={cn(TD, 'font-display text-[13px] leading-none text-chalk')}>
                      {u.displayName ?? <span className="text-mute">—</span>}
                    </td>
                    <td className={TD}>
                      {u.role === 'admin' ? (
                        <span className="inline-block bg-gold text-gold-ink font-mono text-[8px] leading-none font-extrabold tracking-[0.14em] uppercase px-[6px] py-[3px] rounded-[3px]">
                          ADMIN
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] leading-none font-bold tracking-[0.1em] uppercase text-mute">
                          {u.role}
                        </span>
                      )}
                    </td>
                    <td className={TD}><UserStatusBadge status={u.status}/></td>
                    <td className={cn(TD, 'font-mono text-[12px] leading-none text-mute text-center')}>{u.alertCount}</td>
                    <td className={cn(TD, 'font-mono text-[12px] leading-none text-mute whitespace-nowrap')}>
                      {new Date(u.createdAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                    </td>
                    <td className="p-[10px_16px]">
                      <div className="flex gap-[6px] flex-wrap">
                        {u.status === 'locked' ? (
                          <Button variant="outline" size="sm" onClick={() => unlock(u.id)} disabled={isMutating} className="px-[10px] py-[5px] h-auto border-up text-up hover:bg-[rgba(88,200,150,0.08)] hover:text-up font-mono text-[9px] font-bold tracking-[0.08em] uppercase">Unlock</Button>
                        ) : (u.status === 'active' || u.status === 'pending') ? (
                          <Button variant="outline" size="sm" onClick={() => lock(u.id)} disabled={isMutating} className="px-[10px] py-[5px] h-auto border-down text-down hover:bg-[rgba(229,72,77,0.08)] hover:text-down font-mono text-[9px] font-bold tracking-[0.08em] uppercase">Lock</Button>
                        ) : null}
                        {u.role === 'user' ? (
                          <Button variant="outline" size="sm" onClick={() => changeRole({ id: u.id, role: 'admin' })} disabled={isMutating} className="px-[10px] py-[5px] h-auto border-[rgba(212,175,55,0.5)] text-gold hover:bg-[rgba(212,175,55,0.08)] hover:text-gold font-mono text-[9px] font-bold tracking-[0.08em] uppercase">Promote</Button>
                        ) : u.role === 'admin' ? (
                          <Button variant="outline" size="sm" onClick={() => changeRole({ id: u.id, role: 'user' })} disabled={isMutating} className="px-[10px] py-[5px] h-auto border-line text-mute hover:bg-ink-3 hover:text-bone font-mono text-[9px] font-bold tracking-[0.08em] uppercase">Demote</Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="p-[16px_20px] border-t border-hairline flex items-center justify-between">
                <span className="font-mono text-[11px] leading-none text-mute">
                  Page {page} of {totalPages} · {total} total
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-[14px] border-line bg-transparent text-bone hover:bg-ink-3 font-mono text-[10px] font-bold tracking-[0.08em]">
                    ← Prev
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-[14px] border-line bg-transparent text-bone hover:bg-ink-3 font-mono text-[10px] font-bold tracking-[0.08em]">
                    Next →
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
