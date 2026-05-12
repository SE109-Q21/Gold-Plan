'use client';

import { useState } from 'react';

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} style={{ width: 42, height: 24, padding: 2, flexShrink: 0, background: on ? 'var(--gold)' : 'var(--ink-3)', border: `1px solid ${on ? 'var(--gold)' : 'var(--line)'}`, borderRadius: 99, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
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

export function AccountPage() {
  const [theme, setTheme] = useState('DARK');
  const [unit, setUnit] = useState('TAEL');
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifDigest, setNotifDigest] = useState(false);

  return (
    <div style={{ padding: '24px 28px 40px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Profile card */}
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 28, clipPath: 'polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ width: 72, height: 72, borderRadius: 14, background: 'linear-gradient(135deg, #D4AF37, #8E7321)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 26px/1 var(--font-display)', color: '#0B0B0F' }}>GT</div>
            <div style={{ flex: 1 }}>
              <div style={{ font: '700 24px/1.1 var(--font-display)', letterSpacing: '-0.015em', marginBottom: 6 }}>GoldTracker User</div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--mute)' }}>member since 2024</div>
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
          <Row label="Morning digest" detail="market summary at 07:30 · opt-in" right={<Toggle on={notifDigest} onChange={() => setNotifDigest(!notifDigest)}/>}/>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14 }}>
          <div style={{ padding: '16px 22px' }}><h3 style={{ font: '700 16px/1 var(--font-display)', margin: 0 }}>security</h3></div>
          <Row label="Password" detail="last changed 2026.03.14" right={<button style={{ height: 32, padding: '0 12px', background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 6, cursor: 'pointer', font: '700 11px/1 var(--font-mono)', color: 'var(--bone)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>change</button>}/>
          <Row label="Two-factor auth" detail="TOTP authenticator" right={<span className="mono" style={{ fontSize: 11, color: 'var(--up)' }}>· enabled</span>}/>
        </div>

        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14 }}>
          <div style={{ padding: '16px 22px' }}><h3 style={{ font: '700 16px/1 var(--font-display)', margin: 0 }}>data & api</h3></div>
          <Row label="Export history" detail="CSV · last 12 months" right={<button style={{ height: 32, padding: '0 12px', background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 6, cursor: 'pointer', font: '700 11px/1 var(--font-mono)', color: 'var(--bone)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>export</button>}/>
          <Row label="API key" detail="read-only · 1 active" right={<span className="mono" style={{ fontSize: 11, color: 'var(--mute)' }}>gt_live_••••a31f</span>}/>
        </div>

        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, borderColor: 'rgba(229,72,77,0.3)' }}>
          <div style={{ padding: '16px 22px' }}><h3 style={{ font: '700 16px/1 var(--font-display)', margin: 0, color: 'var(--down)' }}>danger zone</h3></div>
          <Row label="Sign out" detail="end the session" right={<button style={{ height: 32, padding: '0 12px', background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 6, cursor: 'pointer', font: '700 11px/1 var(--font-mono)', color: 'var(--bone)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>sign out</button>}/>
          <Row label="Delete account" detail="irreversible · all data purged" right={<button style={{ height: 32, padding: '0 12px', background: 'transparent', border: '1px solid rgba(229,72,77,0.4)', borderRadius: 6, cursor: 'pointer', font: '700 11px/1 var(--font-mono)', color: 'var(--down)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>delete</button>}/>
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
  );
}
