'use client';

import { useState } from 'react';

interface Alert {
  id: number; asset: string; karat: string; condition: string;
  target: number; currency: string; enabled: boolean;
  triggered: string | null; repeat: string; created: string;
}

const INITIAL_ALERTS: Alert[] = [
  { id: 1, asset: 'XAU/USD',  karat: '24K', condition: '>=', target: 2400.00,   currency: 'USD', enabled: true,  triggered: null,        repeat: 'once',   created: '2026.04.18' },
  { id: 2, asset: 'XAU/USD',  karat: '24K', condition: '<=', target: 2280.00,   currency: 'USD', enabled: true,  triggered: null,        repeat: 'daily',  created: '2026.04.22' },
  { id: 3, asset: 'SJC tael', karat: '24K', condition: '>=', target: 80000000,  currency: 'VND', enabled: false, triggered: '3 days ago', repeat: 'once',  created: '2026.04.06' },
  { id: 4, asset: 'PNJ tael', karat: '22K', condition: '<=', target: 71500000,  currency: 'VND', enabled: true,  triggered: null,        repeat: 'weekly', created: '2026.05.02' },
];

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} style={{ width: 38, height: 22, padding: 2, background: on ? 'var(--gold)' : 'var(--ink-3)', border: `1px solid ${on ? 'var(--gold)' : 'var(--line)'}`, borderRadius: 99, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
      <span style={{ width: 16, height: 16, borderRadius: 99, background: on ? '#0B0B0F' : '#5a5b65', transform: on ? 'translateX(16px)' : 'translateX(0)', transition: 'transform 180ms var(--ease)' }}/>
    </button>
  );
}

export function AlertsPage({ onOpenAdd }: { onOpenAdd: () => void }) {
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);

  const toggle = (id: number) => setAlerts(a => a.map(x => x.id === id ? { ...x, enabled: !x.enabled } : x));
  const remove = (id: number) => setAlerts(a => a.filter(x => x.id !== id));

  const fmtTarget = (a: Alert) => a.currency === 'VND'
    ? a.target.toLocaleString('en-US') + '₫'
    : (a.currency === 'EUR' ? '€' : '$') + a.target.toFixed(2);

  return (
    <div style={{ padding: '24px 28px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ font: '800 36px/1 var(--font-display)', margin: 0, letterSpacing: '-0.025em' }}>price alerts</h1>
          <p style={{ font: '400 14px/1.5 var(--font-display)', color: 'var(--mute)', margin: '8px 0 0', maxWidth: 480 }}>
            notified when the price crosses your threshold. email within 2 min, push within 30 sec.
          </p>
        </div>
        <button onClick={onOpenAdd} style={{ height: 44, padding: '0 18px', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--gold)', color: '#0B0B0F', border: '1px solid var(--gold)', borderRadius: 10, cursor: 'pointer', font: '700 14px/1 var(--font-mono)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          + new alert
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { lbl: 'active',    val: alerts.filter(a => a.enabled).length, gold: true },
          { lbl: 'triggered', val: 12, gold: false },
          { lbl: 'slots',     val: `${alerts.length} / 10`, gold: false },
          { lbl: 'cooldown',  val: '30 min', gold: false },
        ].map(s => (
          <div key={s.lbl} style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 18 }}>
            <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>{s.lbl}</div>
            <div style={{ font: '800 30px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums', color: s.gold ? 'var(--gold)' : 'var(--chalk)' }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid var(--hairline)' }}>
          <h3 style={{ font: '700 16px/1 var(--font-display)', margin: 0 }}>active rules</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '64px 2fr 1.4fr 1fr 100px 130px', padding: '12px 22px', font: '700 10px/1 var(--font-mono)', color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', background: 'var(--ink-3)', borderBottom: '1px solid var(--hairline)' }}>
          <span>karat</span><span>asset / condition</span><span style={{ textAlign: 'right' }}>target</span><span>repeat</span><span>status</span><span style={{ textAlign: 'right' }}>actions</span>
        </div>

        {alerts.map((a, i) => (
          <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '64px 2fr 1.4fr 1fr 100px 130px', padding: '16px 22px', alignItems: 'center', borderTop: i === 0 ? 'none' : '1px solid var(--hairline)', opacity: a.enabled ? 1 : 0.55 }}>
            <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em' }}>{a.karat}</span>
            <div>
              <div style={{ font: '500 14px/1.1 var(--font-display)', marginBottom: 4 }}>{a.asset}</div>
              <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: a.condition === '>=' ? 'var(--up)' : 'var(--down)', padding: '3px 6px', borderRadius: 3, letterSpacing: '0.08em', textTransform: 'uppercase', background: a.condition === '>=' ? 'rgba(88,200,150,0.10)' : 'rgba(229,72,77,0.10)' }}>
                {a.condition === '>=' ? 'crosses ↑' : 'crosses ↓'}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ font: '700 16px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{fmtTarget(a)}</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--mute)', marginTop: 4 }}>created {a.created}</div>
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--bone)' }}>· {a.repeat}</span>
            <div>
              {a.triggered
                ? <span style={{ font: '700 9px/1 var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0B0B0F', background: 'var(--gold)', padding: '4px 7px', borderRadius: 3 }}>fired · {a.triggered}</span>
                : <span style={{ font: '700 9px/1 var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: a.enabled ? 'var(--live)' : 'var(--mute)', border: `1px solid ${a.enabled ? 'rgba(157,204,110,0.4)' : 'var(--line)'}`, padding: '4px 7px', borderRadius: 3 }}>
                    {a.enabled ? 'waiting' : 'paused'}
                  </span>
              }
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, alignItems: 'center' }}>
              <Toggle on={a.enabled} onChange={() => toggle(a.id)}/>
              <button onClick={() => remove(a.id)} style={{ width: 28, height: 32, background: 'transparent', border: '1px solid transparent', borderRadius: 6, cursor: 'pointer', color: 'var(--down)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
