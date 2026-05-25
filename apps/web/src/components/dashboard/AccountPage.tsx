'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { apiChangePassword, apiDeleteAccount } from '@/lib/auth.api';
import { useClearHistory } from '@/lib/browsing-history.api';
import { useSubscribeDigest } from '@/lib/digest.api';
import { useResetPreferences } from '@/lib/personalisation.api';
import { usePortfolio } from '@/lib/portfolio.api';
import { useAlerts } from '@/lib/alerts.api';
import { PushNotificationButton } from '@/components/PushNotificationButton';
import { cn } from '@/lib/utils';
import type { PortfolioTransactionDto, PaginatedDto } from '@gpls/shared';

function downloadCsv(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  const keys = Object.keys(data[0]);
  const rows = [keys.join(','), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={cn(
        'w-[42px] h-6 p-[2px] shrink-0 rounded-full flex items-center border transition-colors duration-180',
        on ? 'bg-gold border-gold' : 'bg-ink-3 border-line',
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
      )}
    >
      <span className={cn(
        'w-[18px] h-[18px] rounded-full transition-transform duration-[180ms]',
        on ? 'translate-x-[18px] bg-gold-ink' : 'translate-x-0 bg-[#5a5b65]',
      )}/>
    </button>
  );
}

function Segmented({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex bg-ink-3 border border-line rounded-md p-[2px] shrink-0">
      {options.map(o => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            'px-3 py-[6px] border-0 cursor-pointer rounded font-mono text-[10px] leading-none font-bold tracking-[0.1em] uppercase',
            value === o ? 'bg-gold text-gold-ink' : 'bg-transparent text-bone',
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Row({ label, detail, right }: { label: string; detail?: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-[22px] py-4 border-t border-hairline">
      <div className="flex-1">
        <div className="font-sans text-[14px] leading-[1.2] font-medium">{label}</div>
        {detail && <div className="font-mono text-[11px] text-mute mt-[5px]">{detail}</div>}
      </div>
      {right}
    </div>
  );
}

function SmallBtn({ onClick, disabled, danger, children }: {
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-8 px-3 rounded-md cursor-pointer font-mono text-[11px] leading-none font-bold tracking-[0.04em] uppercase',
        danger
          ? 'bg-transparent border border-[rgba(229,72,77,0.4)] text-down'
          : 'bg-ink-3 border border-line text-bone',
        disabled && 'opacity-60 cursor-not-allowed',
      )}
    >
      {children}
    </button>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { getAccessToken } = useAuth();
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPw.length < 8) { setError('New password must be at least 8 characters'); return; }
    if (!/[A-Z]/.test(newPw)) { setError('New password needs at least 1 uppercase letter'); return; }
    if (!/[0-9]/.test(newPw)) { setError('New password needs at least 1 digit'); return; }
    if (newPw !== confirm) { setError('Passwords do not match'); return; }
    if (!getAccessToken()) { setError('Not authenticated'); return; }
    setLoading(true);
    try {
      await apiChangePassword(getAccessToken() ?? '', oldPw, newPw);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Change failed');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full h-9 bg-ink-3 border border-line rounded-md px-[10px] text-chalk font-sans text-[13px] leading-none font-medium outline-none box-border';
  const labelCls = 'block font-mono text-[10px] leading-none font-semibold tracking-[0.1em] uppercase text-mute mb-[5px]';

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex items-center justify-center z-[200]">
      <div className="w-[360px] bg-ink-2 border border-line rounded-[14px] p-7">
        <h3 className="font-display text-[16px] leading-none font-bold m-0 mb-5">Change password</h3>
        {success ? (
          <div>
            <p className="text-up text-[14px]">Password updated successfully.</p>
            <button
              onClick={onClose}
              className="mt-4 h-9 px-4 bg-gold border-0 rounded-md cursor-pointer font-mono text-[11px] leading-none font-bold text-gold-ink"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div><label className={labelCls}>Current password</label><input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} required className={inputCls} autoComplete="current-password"/></div>
            <div><label className={labelCls}>New password</label><input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required className={inputCls} autoComplete="new-password"/></div>
            <div><label className={labelCls}>Confirm new password</label><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className={inputCls} autoComplete="new-password"/></div>
            {error && (
              <div className="text-down text-[12px] px-[10px] py-2 bg-[rgba(229,72,77,0.1)] rounded-md">{error}</div>
            )}
            <div className="flex gap-2 justify-end mt-1">
              <button
                type="button"
                onClick={onClose}
                className="h-[34px] px-[14px] bg-ink-3 border border-line rounded-md cursor-pointer font-mono text-[10px] leading-none font-bold text-bone"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'h-[34px] px-[14px] bg-gold border-0 rounded-md font-mono text-[10px] leading-none font-bold text-gold-ink',
                  loading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer',
                )}
              >
                {loading ? 'Saving…' : 'Update'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function AccountPage() {
  const { user, getAccessToken, logout } = useAuth();
  const router = useRouter();
  const clearHistory = useClearHistory();
  const subscribeDigest = useSubscribeDigest();
  const resetPrefs = useResetPreferences();
  const portfolioQuery = usePortfolio();
  const alertsQuery = useAlerts();
  const [theme, setTheme] = useState('DARK');
  const [unit, setUnit] = useState('TAEL');
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifDigest, setNotifDigest] = useState(user?.digestOptIn ?? false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  async function handleDeleteAccount() {
    if (!confirm('Delete your account? This is irreversible and all data will be purged.')) return;
    if (!getAccessToken()) return;
    setDeletingAccount(true);
    try {
      await apiDeleteAccount(getAccessToken() ?? '');
      await logout();
      router.push('/auth/login');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
      setDeletingAccount(false);
    }
  }

  async function handleSignOut() {
    await logout();
    router.push('/auth/login');
  }

  async function handleClearHistory() {
    if (!window.confirm('Clear all browsing history? This cannot be undone.')) return;
    await clearHistory.mutateAsync();
  }

  const initials = user
    ? (user.displayName ?? user.email)
        .split(/[\s@]/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p: string) => p[0].toUpperCase())
        .join('')
    : 'GT';

  return (
    <>
      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)}/>}
      <div
        className="p-[24px_28px_40px] grid gap-5"
        style={{ gridTemplateColumns: '1.4fr 1fr' }}
      >
        {/* Left column */}
        <div className="flex flex-col gap-5">
          {/* Profile card */}
          <div className="bg-ink-2 border border-line rounded-[14px] p-7 [clip-path:polygon(0_0,calc(100%-22px)_0,100%_22px,100%_100%,0_100%)]">
            <div className="flex items-center gap-[18px]">
              <div className="w-[72px] h-[72px] rounded-[14px] bg-[linear-gradient(135deg,#D4AF37,#8E7321)] flex items-center justify-center font-display text-[26px] leading-none font-extrabold text-gold-ink">
                {initials}
              </div>
              <div className="flex-1">
                <div className="font-display text-[24px] leading-[1.1] font-bold tracking-[-0.015em] mb-[6px]">
                  {user?.displayName ?? user?.email ?? 'GoldTracker User'}
                </div>
                <div className="font-mono text-[12px] text-mute">{user ? user.role : 'guest'}</div>
              </div>
              <span className="stamp text-[10px]">GOLD MEMBER</span>
            </div>
            {(() => {
              const portfolio = portfolioQuery.data;
              const alerts = alertsQuery.data ?? [];
              const totalValue = portfolio ? (portfolio.totalValueVnd / 1_000_000).toFixed(1) + 'M ₫' : '—';
              const pnl = portfolio
                ? ((portfolio.totalPnlVnd >= 0 ? '+' : '') + (portfolio.totalPnlVnd / 1_000_000).toFixed(1) + 'M ₫')
                : '—';
              const pnlColor = portfolio
                ? (portfolio.totalPnlVnd >= 0 ? 'text-up' : 'text-down')
                : 'text-chalk';
              const stats = [
                { l: 'Portfolio', v: totalValue, color: 'text-chalk' },
                { l: 'P&L · 30d', v: pnl, color: pnlColor },
                { l: 'Alerts', v: `${alerts.length} / 10`, color: 'text-chalk' },
              ];
              return (
                <div className="grid grid-cols-3 mt-[22px] pt-[18px] border-t border-hairline">
                  {stats.map(s => (
                    <div key={s.l}>
                      <div className="font-mono text-[9px] text-mute tracking-[0.14em] uppercase mb-[6px]">{s.l}</div>
                      <div className={cn('font-display text-[22px] leading-none font-bold [font-variant-numeric:tabular-nums]', s.color)}>{s.v}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Preferences */}
          <div className="bg-ink-2 border border-line rounded-[14px]">
            <div className="px-[22px] py-4">
              <h3 className="font-display text-[16px] leading-none font-bold m-0">preferences</h3>
            </div>
            <Row label="Display currency" detail="all prices render in this currency" right={<Segmented options={['USD', 'VND', 'EUR']} value="USD" onChange={() => {}}/>}/>
            <Row label="Theme" detail="dark by default" right={<Segmented options={['DARK', 'LIGHT', 'AUTO']} value={theme} onChange={setTheme}/>}/>
            <Row label="Unit of mass" detail="prices converted from troy oz" right={<Segmented options={['TROY OZ', 'TAEL', 'GRAM']} value={unit} onChange={setUnit}/>}/>
            <Row
              label="Khôi phục mặc định"
              detail="đặt lại tất cả tuỳ chọn và vị trí ghim"
              right={
                <SmallBtn
                  danger
                  disabled={resetPrefs.isPending}
                  onClick={() => {
                    if (window.confirm('Xoá tất cả tuỳ chọn cá nhân và vị trí ghim?')) {
                      resetPrefs.mutate();
                    }
                  }}
                >
                  {resetPrefs.isPending ? '…' : 'reset'}
                </SmallBtn>
              }
            />
          </div>

          {/* Notifications */}
          <div className="bg-ink-2 border border-line rounded-[14px]">
            <div className="px-[22px] py-4">
              <h3 className="font-display text-[16px] leading-none font-bold m-0">notifications</h3>
            </div>
            <Row label="Email alerts" detail="within 2 min of trigger" right={<Toggle on={notifEmail} onChange={() => setNotifEmail(!notifEmail)}/>}/>
            <Row label="Push alerts" detail="browser push notifications" right={<PushNotificationButton />}/>
            <Row
              label="Morning digest"
              detail="market summary at 07:30 · opt-in"
              right={
                <Toggle
                  on={notifDigest}
                  disabled={subscribeDigest.isPending}
                  onChange={() => { setNotifDigest(!notifDigest); subscribeDigest.mutate(!notifDigest); }}
                />
              }
            />
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          <div className="bg-ink-2 border border-line rounded-[14px]">
            <div className="px-[22px] py-4">
              <h3 className="font-display text-[16px] leading-none font-bold m-0">security</h3>
            </div>
            <Row label="Password" detail="click to update your password" right={<SmallBtn onClick={() => setShowChangePw(true)}>change</SmallBtn>}/>
            <Row label="Two-factor auth" detail="TOTP authenticator" right={<span className="font-mono text-[11px] text-up">· enabled</span>}/>
          </div>

          <div className="bg-ink-2 border border-line rounded-[14px]">
            <div className="px-[22px] py-4">
              <h3 className="font-display text-[16px] leading-none font-bold m-0">data & api</h3>
            </div>
            <Row label="Export history" detail="CSV · last 12 months" right={<SmallBtn>export</SmallBtn>}/>
            <Row label="API key" detail="read-only · 1 active" right={<span className="font-mono text-[11px] text-mute">gt_live_••••a31f</span>}/>
            <Row
              label="Browsing History"
              detail="View and clear your price viewing history"
              right={<SmallBtn onClick={() => router.push('/profile/history')}>view →</SmallBtn>}
            />
            <Row
              label="Clear Browsing History"
              detail="Remove all price viewing history"
              right={
                <SmallBtn danger disabled={clearHistory.isPending} onClick={handleClearHistory}>
                  {clearHistory.isPending ? '…' : 'clear'}
                </SmallBtn>
              }
            />
          </div>

          <div className="bg-ink-2 border border-[rgba(229,72,77,0.3)] rounded-[14px]">
            <div className="px-[22px] py-4">
              <h3 className="font-display text-[16px] leading-none font-bold m-0 text-down">danger zone</h3>
            </div>
            <Row label="Sign out" detail="end the session" right={<SmallBtn onClick={handleSignOut}>sign out</SmallBtn>}/>
            <Row
              label="Delete account"
              detail="irreversible · all data purged"
              right={
                <SmallBtn danger disabled={deletingAccount} onClick={handleDeleteAccount}>
                  {deletingAccount ? '…' : 'delete'}
                </SmallBtn>
              }
            />
          </div>

          <div className="bg-ink-2 border border-line rounded-[14px] p-[22px]">
            <div className="stamp text-[10px] mb-2">about</div>
            <div className="font-display text-[16px] leading-[1.2] font-bold mb-[6px]">GoldTracker · v2.4.1</div>
            <div className="font-mono text-[11px] text-mute leading-[1.5]">
              data: kitco, gold-api, sjc, doji, pnj<br/>
              refresh · 5 min during 07:00–17:00 (ict)
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
