'use client';

import { useState } from 'react';

// Icons (Lucide-style inline SVG)
function IconHome({ s = 20 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z"/></svg>;
}
function IconChart({ s = 20 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>;
}
function IconBell({ s = 20 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>;
}
function IconUser({ s = 20 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>;
}
function IconSearch({ s = 16 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
}
function IconPlus({ s = 16 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>;
}

export { IconHome, IconChart, IconBell, IconUser, IconSearch, IconPlus };

const NAV_ITEMS = [
  { id: 'home',    label: 'overview',  Icon: IconHome },
  { id: 'chart',   label: 'markets',   Icon: IconChart },
  { id: 'alerts',  label: 'alerts',    Icon: IconBell },
  { id: 'profile', label: 'account',   Icon: IconUser },
] as const;

type Tab = 'home' | 'chart' | 'alerts' | 'profile';

const WATCHLIST = [
  { code: 'XAU/USD', val: '$2,345.67', pct: '+1.21%', dir: 'up' },
  { code: 'XAU/VND', val: '78.92M₫',  pct: '+0.15%', dir: 'up' },
  { code: 'SJC',     val: '79.20M₫',  pct: '+0.18%', dir: 'up' },
  { code: 'DOJI',    val: '79.05M₫',  pct: '−0.04%', dir: 'down' },
];

function Sidebar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <aside style={{
      width: 232, flexShrink: 0, height: '100%',
      background: 'var(--ink-2)', borderRight: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column', padding: '20px 0',
    }}>
      {/* Wordmark */}
      <div style={{ padding: '0 20px 22px', borderBottom: '1px solid var(--hairline)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="24" height="24" viewBox="0 0 24 24">
            <rect x="3"  y="9"  width="3.5" height="11" rx="1" fill="#D4AF37"/>
            <rect x="9"  y="3"  width="3.5" height="17" rx="1" fill="#D4AF37"/>
            <rect x="15" y="11" width="3.5" height="9"  rx="1" fill="#D4AF37"/>
            <rect x="21" y="6"  width="2"   height="14" rx="1" fill="#D4AF37" opacity="0.6"/>
          </svg>
          <div>
            <div style={{ font: '800 16px/1 var(--font-display)', letterSpacing: '-0.02em' }}>goldtracker</div>
            <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.16em', marginTop: 4 }}>GT.2026.05</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '16px 12px', flex: 1 }}>
        <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.16em', textTransform: 'uppercase', padding: '4px 12px 8px' }}>workspace</div>
        {NAV_ITEMS.map(it => {
          const active = tab === it.id;
          return (
            <button key={it.id} onClick={() => onChange(it.id as Tab)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', border: 0,
              background: active ? 'var(--ink-3)' : 'transparent',
              color: active ? 'var(--chalk)' : 'var(--bone)',
              borderRadius: 6, cursor: 'pointer',
              font: '500 13px/1 var(--font-display)',
              position: 'relative',
              transition: 'background 140ms var(--ease), color 140ms var(--ease)',
            }}>
              {active && <span style={{ position: 'absolute', left: -12, top: 8, bottom: 8, width: 3, background: 'var(--gold)', borderRadius: '0 2px 2px 0' }}/>}
              <span style={{ color: active ? 'var(--gold)' : 'var(--mute)' }}>
                <it.Icon s={16}/>
              </span>
              <span>{it.label}</span>
            </button>
          );
        })}

        <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.16em', textTransform: 'uppercase', padding: '20px 12px 8px' }}>watchlist</div>
        {WATCHLIST.map(w => (
          <div key={w.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 6 }}>
            <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--bone)' }}>{w.code}</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ font: '600 11px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{w.val}</div>
              <div className="mono" style={{ fontSize: 9, color: w.dir === 'up' ? 'var(--up)' : 'var(--down)', marginTop: 3 }}>{w.pct}</div>
            </div>
          </div>
        ))}
      </nav>

      {/* Live status */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid var(--hairline)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--live)', boxShadow: '0 0 8px var(--live)', flexShrink: 0 }}/>
          <span className="mono" style={{ fontSize: 10, color: 'var(--bone)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>live · ict</span>
        </div>
        <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', marginTop: 8, lineHeight: 1.5 }}>
          next refresh in 04:48<br/>sjc · doji · pnj
        </div>
      </div>
    </aside>
  );
}

function TopBar({ currency, onCurrency }: { currency: string; onCurrency: (c: string) => void }) {
  return (
    <header style={{
      height: 56, flexShrink: 0,
      background: 'var(--ink-2)', borderBottom: '1px solid var(--line)',
      display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px 0 28px',
    }}>
      <div style={{ flex: 1, maxWidth: 420, height: 34, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 6, padding: '0 12px' }}>
        <span style={{ color: 'var(--mute)' }}><IconSearch s={14}/></span>
        <span className="mono" style={{ flex: 1, fontSize: 12, color: 'var(--mute)' }}>search assets, brands, alerts…</span>
        <span className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.1em', border: '1px solid var(--line)', borderRadius: 3, padding: '2px 6px' }}>⌘ K</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: '700 10px/1 var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--live)', border: '1px solid rgba(157,204,110,0.4)', padding: '6px 10px', borderRadius: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--live)' }}/>
          live
        </span>
        <div style={{ display: 'flex', background: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 6, padding: 2 }}>
          {['USD', 'VND', 'EUR'].map(c => (
            <button key={c} onClick={() => onCurrency(c)} style={{ padding: '5px 10px', border: 0, cursor: 'pointer', background: currency === c ? 'var(--gold)' : 'transparent', color: currency === c ? '#0B0B0F' : 'var(--bone)', font: '700 10px/1 var(--font-mono)', letterSpacing: '0.1em', borderRadius: 4 }}>{c}</button>
          ))}
        </div>
        <button style={{ width: 34, height: 34, background: 'transparent', border: '1px solid var(--line)', borderRadius: 6, cursor: 'pointer', color: 'var(--bone)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <IconBell s={15}/>
          <span style={{ position: 'absolute', top: 6, right: 7, width: 7, height: 7, borderRadius: 99, background: 'var(--gold)', boxShadow: '0 0 0 2px var(--ink-2)' }}/>
        </button>
        <div style={{ width: 32, height: 32, borderRadius: 99, background: 'linear-gradient(135deg, #D4AF37, #8E7321)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 11px/1 var(--font-display)', color: '#0B0B0F' }}>GT</div>
      </div>
    </header>
  );
}

interface DashboardShellProps {
  children?: React.ReactNode;
  tab: Tab;
  onTab: (t: Tab) => void;
  currency: string;
  onCurrency: (c: string) => void;
}

export function DashboardShell({ children, tab, onTab, currency, onCurrency }: DashboardShellProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', overflow: 'hidden', background: 'var(--ink)' }}>
      <Sidebar tab={tab} onChange={onTab}/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar currency={currency} onCurrency={onCurrency}/>
        <main style={{ flex: 1, overflow: 'auto', background: '#0a0a0d' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export type { Tab };
