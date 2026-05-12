'use client';

import { useState } from 'react';

interface Props { open: boolean; onClose: () => void; }

export function AddAlertModal({ open, onClose }: Props) {
  const [karat, setKarat] = useState('24K');
  const [cond, setCond] = useState('>=');
  const [currency, setCurrency] = useState('USD');
  const [target, setTarget] = useState(2400);
  const [repeat, setRepeat] = useState('ONCE');
  if (!open) return null;

  const Chip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button onClick={onClick} style={{ flex: 1, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${active ? 'var(--gold)' : 'var(--line)'}`, borderRadius: 0, background: active ? 'var(--gold)' : 'transparent', color: active ? '#0B0B0F' : 'var(--bone)', font: '700 11px/1 var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>{label}</button>
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(11,11,15,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 480, background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 28, boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ font: '700 24px/1 var(--font-display)', margin: 0, letterSpacing: '-0.015em' }}>new price alert</h2>
          <div className="mono" style={{ fontSize: 11, color: 'var(--mute)', marginTop: 6 }}>email + push when threshold is crossed</div>
        </div>

        <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>karat</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          {['24K', '22K', '18K'].map(k => <Chip key={k} label={k} active={karat === k} onClick={() => setKarat(k)}/>)}
        </div>

        <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>condition</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          <Chip label="≥ rises above" active={cond === '>='} onClick={() => setCond('>=')}/>
          <Chip label="≤ drops below" active={cond === '<='} onClick={() => setCond('<=')}/>
        </div>

        <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>target price</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 10, padding: '4px 8px 4px 16px', marginBottom: 18 }}>
          <span style={{ font: '700 24px/1 var(--font-display)', color: 'var(--gold)' }}>{currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₫'}</span>
          <input type="number" value={target} onChange={e => setTarget(+e.target.value)} style={{ flex: 1, height: 46, background: 'transparent', border: 0, outline: 0, font: '700 24px/1 var(--font-display)', color: 'var(--chalk)', fontVariantNumeric: 'tabular-nums' }}/>
          <div style={{ display: 'flex', gap: 4 }}>
            {['USD', 'VND', 'EUR'].map(c => <Chip key={c} label={c} active={currency === c} onClick={() => setCurrency(c)}/>)}
          </div>
        </div>

        <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>repeat</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
          {['ONCE', 'DAILY', 'WEEKLY'].map(r => <Chip key={r} label={r} active={repeat === r} onClick={() => setRepeat(r)}/>)}
        </div>

        <div style={{ padding: '12px 14px', background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 8, font: '500 11px/1.5 var(--font-mono)', color: 'var(--mute)', marginBottom: 18 }}>
          you&apos;ll be notified when <span style={{ color: 'var(--gold)' }}>{karat} {cond === '>=' ? '≥' : '≤'} {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₫'}{target.toLocaleString()}</span>. repeat: {repeat.toLowerCase()}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, height: 46, background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 10, cursor: 'pointer', font: '700 14px/1 var(--font-mono)', color: 'var(--chalk)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>cancel</button>
          <button onClick={onClose} style={{ flex: 2, height: 46, background: 'var(--gold)', border: '1px solid var(--gold)', borderRadius: 10, cursor: 'pointer', font: '700 14px/1 var(--font-mono)', color: '#0B0B0F', letterSpacing: '0.04em', textTransform: 'uppercase' }}>create alert</button>
        </div>
      </div>
    </div>
  );
}
