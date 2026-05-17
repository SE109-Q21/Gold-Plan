'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useInternationalPrice, useComparison } from '@/lib/price.api';
import type { GoldType } from '@gpls/shared';

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
function IconConvert({ s = 20 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
      <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
      <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
      <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
      <path d="M9 12h6"/>
      <path d="M12 9l3 3-3 3"/>
    </svg>
  );
}
function IconPortfolio({ s = 20 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      <line x1="12" y1="12" x2="12" y2="16"/>
      <line x1="10" y1="14" x2="14" y2="14"/>
    </svg>
  );
}
function IconTrophy({ s = 20 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H3a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4"/>
      <path d="M18 9h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4"/>
      <path d="M12 17v4"/>
      <path d="M8 21h8"/>
      <path d="M7 4h10l1 9a5 5 0 0 1-5 5h0a5 5 0 0 1-5-5Z"/>
    </svg>
  );
}

export { IconHome, IconChart, IconBell, IconUser, IconSearch, IconPlus, IconConvert, IconPortfolio, IconTrophy };

const NAV_ITEMS = [
  { id: 'home',        label: 'Overview',       Icon: IconHome,      href: null,               requiresAuth: false },
  { id: 'chart',       label: 'Markets',        Icon: IconChart,     href: null,               requiresAuth: false },
  { id: 'alerts',      label: 'Alerts',         Icon: IconBell,      href: null,               requiresAuth: true  },
  { id: 'profile',     label: 'Account',        Icon: IconUser,      href: null,               requiresAuth: true  },
  { id: 'portfolio',   label: 'Portfolio',      Icon: IconPortfolio, href: '/portfolio',       requiresAuth: true  },
  { id: 'converter',   label: 'Converter',      Icon: IconConvert,   href: '/tools/converter', requiresAuth: true  },
  { id: 'leaderboard', label: 'Bảng xếp hạng', Icon: IconTrophy,    href: '/leaderboard',     requiresAuth: true  },
] as const;

type Tab = 'home' | 'chart' | 'alerts' | 'profile';

function Sidebar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const { user } = useAuth();
  const { data: intl } = useInternationalPrice();
  const { data: comparison } = useComparison('MIEN_SJC' as GoldType);
  const compBrands = comparison?.[0]?.brands ?? [];
  const sjc = compBrands.find(b => b.brand === 'SJC');
  const doji = compBrands.find(b => b.brand === 'DOJI');
  const watchlist = [
    { code: 'XAU/USD', val: intl ? '$' + intl.spotPriceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—' },
    { code: 'XAU/VND', val: intl ? (intl.spotPriceVnd / 1_000_000).toFixed(2) + 'M₫' : '—' },
    { code: 'SJC',     val: sjc  ? (sjc.buyPrice  / 1_000_000).toFixed(2) + 'M₫' : '—' },
    { code: 'DOJI',    val: doji ? (doji.buyPrice / 1_000_000).toFixed(2) + 'M₫' : '—' },
  ];
  const router = useRouter();
  const initials = user
    ? (user.displayName ?? user.email)
        .split(/[\s@]/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p: string) => p[0].toUpperCase())
        .join('')
    : '';

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
        <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.16em', textTransform: 'uppercase', padding: '4px 12px 8px' }}>Workspace</div>
        {NAV_ITEMS.filter(it => !it.href && (!it.requiresAuth || !!user)).map(it => {
          const active = tab === it.id;
          const handleClick = () => onChange(it.id as Tab);
          return (
            <button key={it.id} onClick={handleClick} style={{
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
        {!!user && (
          <>
            <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.16em', textTransform: 'uppercase', padding: '20px 12px 8px' }}>Tools</div>
            {NAV_ITEMS.filter(it => !!it.href && (!it.requiresAuth || !!user)).map(it => {
              const handleClick = () => router.push(it.href as string);
              return (
                <button key={it.id} onClick={handleClick} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', border: 0,
                  background: 'transparent',
                  color: 'var(--bone)',
                  borderRadius: 6, cursor: 'pointer',
                  font: '500 13px/1 var(--font-display)',
                  position: 'relative',
                  transition: 'background 140ms var(--ease), color 140ms var(--ease)',
                }}>
                  <span style={{ color: 'var(--mute)' }}>
                    <it.Icon s={16}/>
                  </span>
                  <span>{it.label}</span>
                </button>
              );
            })}
          </>
        )}

        <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.16em', textTransform: 'uppercase', padding: '20px 12px 8px' }}>Watchlist</div>
        {watchlist.map(w => (
          <div key={w.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 6 }}>
            <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--bone)' }}>{w.code}</span>
            <div style={{ font: '600 11px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{w.val}</div>
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

      {/* User / Auth section */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--hairline)' }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#D4AF37,#8E7321)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 11px/1 var(--font-display)', color: '#0B0B0F', flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--bone)', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.displayName ?? user.email}
              </div>
              <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>
                {user.role}
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => router.push('/auth/login')}
            style={{ width: '100%', height: 34, background: 'var(--gold)', border: 0, borderRadius: 8, cursor: 'pointer', font: '700 11px/1 var(--font-display)', color: '#0B0B0F', letterSpacing: '0.04em' }}
          >
            Log in
          </button>
        )}
      </div>
    </aside>
  );
}

function TopBar({ currency, onCurrency, onTab }: { currency: string; onCurrency: (c: string) => void; onTab: (t: Tab) => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [bellOpen, setBellOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const bellRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  const initials = user
    ? (user.displayName ?? user.email)
        .split(/[\s@]/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p: string) => p[0].toUpperCase())
        .join('')
    : '';

  const SEARCH_ITEMS = [
    { label: 'Overview',    type: 'page',  action: () => { onTab('home');    setSearchOpen(false); setSearchQuery(''); } },
    { label: 'Markets',     type: 'page',  action: () => { onTab('chart');   setSearchOpen(false); setSearchQuery(''); } },
    { label: 'Alerts',      type: 'page',  action: () => { onTab('alerts');  setSearchOpen(false); setSearchQuery(''); } },
    { label: 'Account',     type: 'page',  action: () => { onTab('profile'); setSearchOpen(false); setSearchQuery(''); } },
    { label: 'Portfolio',   type: 'tool',  action: () => { router.push('/portfolio');       setSearchOpen(false); setSearchQuery(''); } },
    { label: 'Converter',   type: 'tool',  action: () => { router.push('/tools/converter'); setSearchOpen(false); setSearchQuery(''); } },
    { label: 'Leaderboard', type: 'tool',  action: () => { router.push('/leaderboard');     setSearchOpen(false); setSearchQuery(''); } },
    { label: 'SJC',         type: 'brand', action: () => { onTab('chart');   setSearchOpen(false); setSearchQuery(''); } },
    { label: 'DOJI',        type: 'brand', action: () => { onTab('chart');   setSearchOpen(false); setSearchQuery(''); } },
    { label: 'PNJ',         type: 'brand', action: () => { onTab('chart');   setSearchOpen(false); setSearchQuery(''); } },
    { label: 'BTMC',        type: 'brand', action: () => { onTab('chart');   setSearchOpen(false); setSearchQuery(''); } },
  ];

  const filteredItems = searchQuery.trim().length > 0
    ? SEARCH_ITEMS.filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : SEARCH_ITEMS.slice(0, 6);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    if (bellOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [bellOpen]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchQuery('');
      }
    }
    if (searchOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [searchOpen]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    }
    if (avatarOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [avatarOpen]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery('');
        setAvatarOpen(false);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  function handleBellClick() {
    const next = !bellOpen;
    setBellOpen(next);
    if (next) setHasUnread(false);
  }

  return (
    <header style={{
      height: 56, flexShrink: 0,
      background: 'var(--ink-2)', borderBottom: '1px solid var(--line)',
      display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px 0 28px',
    }}>
      {/* Search bar */}
      <div ref={searchRef} style={{ flex: 1, maxWidth: 420, position: 'relative' }}>
        <div
          onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 0); }}
          style={{ height: 34, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--ink-3)', border: `1px solid ${searchOpen ? 'var(--gold)' : 'var(--line)'}`, borderRadius: 6, padding: '0 12px', cursor: 'text' }}
        >
          <span style={{ color: 'var(--mute)', flexShrink: 0 }}><IconSearch s={14}/></span>
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            placeholder="search assets, brands, alerts…"
            style={{ flex: 1, background: 'transparent', border: 0, outline: 'none', font: '400 12px/1 var(--font-mono)', color: 'var(--chalk)', '::placeholder': { color: 'var(--mute)' } } as React.CSSProperties}
          />
          {!searchOpen && (
            <span className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.1em', border: '1px solid var(--line)', borderRadius: 3, padding: '2px 6px', flexShrink: 0 }}>⌘ K</span>
          )}
        </div>
        {searchOpen && filteredItems.length > 0 && (
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 10, zIndex: 300, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            {filteredItems.map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--chalk)', font: '500 13px/1 var(--font-display)', textAlign: 'left', transition: 'background 100ms' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--ink-3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span>{item.label}</span>
                <span className="mono" style={{ fontSize: 9, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{item.type}</span>
              </button>
            ))}
          </div>
        )}
        {searchOpen && filteredItems.length === 0 && (
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 10, zIndex: 300, padding: '20px 14px', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--mute)' }}>no results for &quot;{searchQuery}&quot;</span>
          </div>
        )}
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
        {/* Bell with dropdown */}
        <div ref={bellRef} style={{ position: 'relative' }}>
          <button
            onClick={handleBellClick}
            style={{ width: 34, height: 34, background: bellOpen ? 'var(--ink-3)' : 'transparent', border: '1px solid var(--line)', borderRadius: 6, cursor: 'pointer', color: 'var(--bone)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
          >
            <IconBell s={15}/>
            {!bellOpen && hasUnread && (
              <span style={{ position: 'absolute', top: 6, right: 7, width: 7, height: 7, borderRadius: 99, background: 'var(--gold)', boxShadow: '0 0 0 2px var(--ink-2)' }}/>
            )}
          </button>
          {bellOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 300, background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 12, zIndex: 200, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                <span style={{ font: '700 9px/1 var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mute)' }}>Notifications</span>
                <button
                  onClick={() => {}}
                  style={{ background: 'transparent', border: 0, cursor: 'pointer', font: '600 11px/1 var(--font-mono)', color: 'var(--gold)', padding: 0 }}
                >
                  all &rarr;
                </button>
              </div>
              {/* Empty state */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', gap: 10 }}>
                <span style={{ color: 'var(--gold)' }}><IconBell s={28}/></span>
                <span style={{ fontSize: 13, color: 'var(--chalk)', fontWeight: 600 }}>No notifications yet</span>
                <span style={{ fontSize: 11, color: 'var(--mute)', textAlign: 'center', lineHeight: 1.5 }}>Alerts you set up will appear here</span>
              </div>
            </div>
          )}
        </div>
        {/* Avatar / auth */}
        <div ref={avatarRef} style={{ position: 'relative' }}>
          {user ? (
            <button
              onClick={() => setAvatarOpen(v => !v)}
              style={{ width: 32, height: 32, borderRadius: 99, background: 'linear-gradient(135deg, #D4AF37, #8E7321)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 11px/1 var(--font-display)', color: '#0B0B0F', border: 0, cursor: 'pointer' }}
            >
              {initials || 'GT'}
            </button>
          ) : (
            <button
              onClick={() => router.push('/auth/login')}
              style={{ height: 32, padding: '0 14px', background: 'var(--gold)', border: 0, borderRadius: 99, cursor: 'pointer', font: '700 11px/1 var(--font-display)', color: '#0B0B0F', letterSpacing: '0.04em' }}
            >
              Log in
            </button>
          )}
          {avatarOpen && user && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 220, background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 12, zIndex: 200, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
              {/* User info */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#D4AF37,#8E7321)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 11px/1 var(--font-display)', color: '#0B0B0F', flexShrink: 0 }}>
                    {initials || 'GT'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--chalk)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.displayName ?? user.email}
                    </div>
                    <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>
                      {user.role}
                    </div>
                  </div>
                </div>
              </div>
              {/* Actions */}
              <div style={{ padding: '6px 0' }}>
                <button
                  onClick={() => { onTab('profile'); setAvatarOpen(false); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--chalk)', font: '500 13px/1 var(--font-display)', textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--ink-3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <IconUser s={14}/>
                  Profile & settings
                </button>
                <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }}/>
                <button
                  onClick={() => { logout(); setAvatarOpen(false); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--red, #e05252)', font: '500 13px/1 var(--font-display)', textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--ink-3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
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
        <TopBar currency={currency} onCurrency={onCurrency} onTab={onTab}/>
        <main style={{ flex: 1, overflow: 'auto', background: '#0a0a0d' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export type { Tab };
