'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { apiChangePassword, apiDeleteAccount } from '@/lib/auth.api';
import { useClearHistory } from '@/lib/browsing-history.api';
import { useSubscribeDigest } from '@/lib/digest.api';

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button onClick={onChange} disabled={disabled} style={{ width: 42, height: 24, padding: 2, flexShrink: 0, background: on ? 'var(--gold)' : 'var(--ink-3)', border: `1px solid ${on ? 'var(--gold)' : 'var(--line)'}`, borderRadius: 99, cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', opacity: disabled ? 0.6 : 1 }}>
      <span style={{ width: 18, height: 18, borderRadius: 99, background: on ? '#0B0B0F' : '#5a5b65', transform: on ? 'translateX(18px)' : 'translateX(0)', transition: 'transform 180ms var(--ease)' }}/>
    </button>
  );
}

function Segmented({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 6, padding: 2, flexShrink: 0 }}>
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)} style={{ padding: '6px 12px', border: 0, cursor: 'pointer', background: value === o ? 'var(--gold)' : 'transparent', color: value === o ? '#0B0B0F' : 'var(--bone)', font: '700 10px/1 var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: 4 }}>{o}</button>
      ))}
    </div>
  );
}

function Row({ label, detail, right }: { label: string; detail?: string; right: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 22px', borderTop: '1px solid var(--hairline)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ font: '500 14px/1.2 var(--font-display)' }}>{label}</div>
        {detail && <div className="mono" style={{ fontSize: 11, color: 'var(--mute)', marginTop: 5 }}>{detail}</div>}
      </div>
      {right}
    </div>
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

  const inputS: React.CSSProperties = { width: '100%', height: 36, background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 6, padding: '0 10px', color: 'var(--chalk)', font: '500 13px/1 var(--font-display)', outline: 'none', boxSizing: 'border-box' };
  const labelS: React.CSSProperties = { display: 'block', font: '600 10px/1 var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mute)', marginBottom: 5 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ width: 360, background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 28 }}>
        <h3 style={{ font: '700 16px/1 var(--font-display)', margin: '0 0 20px' }}>Change password</h3>
        {success ? (
          <div>
            <p style={{ color: 'var(--up)', fontSize: 14 }}>Password updated successfully.</p>
            <button onClick={onClose} style={{ marginTop: 16, height: 36, padding: '0 16px', background: 'var(--gold)', border: 0, borderRadius: 6, cursor: 'pointer', font: '700 11px/1 var(--font-mono)', color: '#0B0B0F' }}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><label style={labelS}>Current password</label><input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} required style={inputS} autoComplete="current-password"/></div>
            <div><label style={labelS}>New password</label><input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required style={inputS} autoComplete="new-password"/></div>
            <div><label style={labelS}>Confirm new password</label><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={inputS} autoComplete="new-password"/></div>
            {error && <div style={{ color: 'var(--down)', fontSize: 12, padding: '8px 10px', background: 'rgba(229,72,77,0.1)', borderRadius: 6 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" onClick={onClose} style={{ height: 34, padding: '0 14px', background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 6, cursor: 'pointer', font: '700 10px/1 var(--font-mono)', color: 'var(--bone)' }}>Cancel</button>
              <button type="submit" disabled={loading} style={{ height: 34, padding: '0 14px', background: 'var(--gold)', border: 0, borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer', font: '700 10px/1 var(--font-mono)', color: '#0B0B0F', opacity: loading ? 0.7 : 1 }}>
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
  const [theme, setTheme] = useState('DARK');
  const [unit, setUnit] = useState('TAEL');
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
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
    <div style={{ padding: '24px 28px 40px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Profile card */}
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 28, clipPath: 'polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ width: 72, height: 72, borderRadius: 14, background: 'linear-gradient(135deg, #D4AF37, #8E7321)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 26px/1 var(--font-display)', color: '#0B0B0F' }}>{initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ font: '700 24px/1.1 var(--font-display)', letterSpacing: '-0.015em', marginBottom: 6 }}>{user?.displayName ?? user?.email ?? 'GoldTracker User'}</div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--mute)' }}>{user ? user.role : 'guest'}</div>
            </div>
            <span className="stamp" style={{ fontSize: 10 }}>GOLD MEMBER</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--hairline)' }}>
            {[{ l: 'portfolio', v: '$14,820', tint: null }, { l: 'P&L · 30d', v: '+$1,247', tint: 'var(--up)' }, { l: 'alerts', v: '4 / 10', tint: null }, { l: 'logins · 30d', v: '23', tint: null }].map(s => (
              <div key={s.l}>
                <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>{s.l}</div>
                <div style={{ font: '700 22px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums', color: s.tint ?? 'var(--chalk)' }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Preferences */}
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14 }}>
          <div style={{ padding: '16px 22px' }}><h3 style={{ font: '700 16px/1 var(--font-display)', margin: 0 }}>preferences</h3></div>
          <Row label="Display currency" detail="all prices render in this currency" right={<Segmented options={['USD', 'VND', 'EUR']} value="USD" onChange={() => {}}/>}/>
          <Row label="Theme" detail="dark by default" right={<Segmented options={['DARK', 'LIGHT', 'AUTO']} value={theme} onChange={setTheme}/>}/>
          <Row label="Unit of mass" detail="prices converted from troy oz" right={<Segmented options={['TROY OZ', 'TAEL', 'GRAM']} value={unit} onChange={setUnit}/>}/>
        </div>

        {/* Notifications */}
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14 }}>
          <div style={{ padding: '16px 22px' }}><h3 style={{ font: '700 16px/1 var(--font-display)', margin: 0 }}>notifications</h3></div>
          <Row label="Email alerts" detail="within 2 min of trigger" right={<Toggle on={notifEmail} onChange={() => setNotifEmail(!notifEmail)}/>}/>
          <Row label="Push alerts" detail="device push · iOS, Android" right={<Toggle on={notifPush} onChange={() => setNotifPush(!notifPush)}/>}/>
          <Row label="Morning digest" detail="market summary at 07:30 · opt-in" right={<Toggle on={notifDigest} disabled={subscribeDigest.isPending} onChange={() => { setNotifDigest(!notifDigest); subscribeDigest.mutate(!notifDigest); }} />}/>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14 }}>
          <div style={{ padding: '16px 22px' }}><h3 style={{ font: '700 16px/1 var(--font-display)', margin: 0 }}>security</h3></div>
          <Row label="Password" detail="click to update your password" right={<button onClick={() => setShowChangePw(true)} style={{ height: 32, padding: '0 12px', background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 6, cursor: 'pointer', font: '700 11px/1 var(--font-mono)', color: 'var(--bone)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>change</button>}/>
          <Row label="Two-factor auth" detail="TOTP authenticator" right={<span className="mono" style={{ fontSize: 11, color: 'var(--up)' }}>· enabled</span>}/>
        </div>

        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14 }}>
          <div style={{ padding: '16px 22px' }}><h3 style={{ font: '700 16px/1 var(--font-display)', margin: 0 }}>data & api</h3></div>
          <Row label="Export history" detail="CSV · last 12 months" right={<button style={{ height: 32, padding: '0 12px', background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 6, cursor: 'pointer', font: '700 11px/1 var(--font-mono)', color: 'var(--bone)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>export</button>}/>
          <Row label="API key" detail="read-only · 1 active" right={<span className="mono" style={{ fontSize: 11, color: 'var(--mute)' }}>gt_live_••••a31f</span>}/>
          <Row
            label="Browsing History"
            detail="View and clear your price viewing history"
            right={
              <button
                onClick={() => router.push('/profile/history')}
                style={{ height: 32, padding: '0 12px', background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 6, cursor: 'pointer', font: '700 11px/1 var(--font-mono)', color: 'var(--bone)', letterSpacing: '0.04em', textTransform: 'uppercase' }}
              >
                view →
              </button>
            }
          />
          <Row
            label="Clear Browsing History"
            detail="Remove all price viewing history"
            right={
              <button
                onClick={handleClearHistory}
                disabled={clearHistory.isPending}
                style={{
                  height: 32, padding: '0 12px',
                  background: 'transparent', border: '1px solid rgba(229,72,77,0.4)',
                  borderRadius: 6, cursor: clearHistory.isPending ? 'not-allowed' : 'pointer',
                  font: '700 11px/1 var(--font-mono)', color: 'var(--down)',
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                  opacity: clearHistory.isPending ? 0.6 : 1,
                }}
              >
                {clearHistory.isPending ? '…' : 'clear'}
              </button>
            }
          />
        </div>

        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, borderColor: 'rgba(229,72,77,0.3)' }}>
          <div style={{ padding: '16px 22px' }}><h3 style={{ font: '700 16px/1 var(--font-display)', margin: 0, color: 'var(--down)' }}>danger zone</h3></div>
          <Row label="Sign out" detail="end the session" right={<button onClick={handleSignOut} style={{ height: 32, padding: '0 12px', background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 6, cursor: 'pointer', font: '700 11px/1 var(--font-mono)', color: 'var(--bone)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>sign out</button>}/>
          <Row label="Delete account" detail="irreversible · all data purged" right={<button onClick={handleDeleteAccount} disabled={deletingAccount} style={{ height: 32, padding: '0 12px', background: 'transparent', border: '1px solid rgba(229,72,77,0.4)', borderRadius: 6, cursor: deletingAccount ? 'not-allowed' : 'pointer', font: '700 11px/1 var(--font-mono)', color: 'var(--down)', letterSpacing: '0.04em', textTransform: 'uppercase', opacity: deletingAccount ? 0.6 : 1 }}>{deletingAccount ? '…' : 'delete'}</button>}/>
        </div>

        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 22 }}>
          <div className="stamp" style={{ fontSize: 10, marginBottom: 8 }}>about</div>
          <div style={{ font: '700 16px/1.2 var(--font-display)', marginBottom: 6 }}>GoldTracker · v2.4.1</div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--mute)', lineHeight: 1.5 }}>
            data: kitco, gold-api, sjc, doji, pnj<br/>
            refresh · 5 min during 07:00–17:00 (ict)
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
