'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useInternationalPrice, useComparison } from '@/lib/price.api';
import { useAlerts, useAlertHistory } from '@/lib/alerts.api';
import type { GoldType } from '@gpls/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { toast } from 'sonner';

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
function IconNewspaper({ s = 20 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/>
      <path d="M4 8h16"/>
      <path d="M8 12h4"/>
      <path d="M8 16h8"/>
    </svg>
  );
}
function IconClock({ s = 20 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3 3"/>
    </svg>
  );
}
function IconShield({ s = 20 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}
function IconPieChart({ s = 20 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
      <path d="M22 12A10 10 0 0 0 12 2v10z"/>
    </svg>
  );
}
function IconFire({ s = 20 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c0 1.1-.9 2-2 2s-2-.9-2-2c0-2 2-5 2-5Z"/>
      <path d="M12 22c4.418 0 8-3.582 8-8 0-3-1.5-5.5-4-7.5 0 2-1 4-3 5 0-3-1.5-5-3-7-1.5 2-2 4-2 7-2-1-3-3-3-5-2 2-3 4.5-3 7.5 0 4.418 3.582 8 8 8Z"/>
    </svg>
  );
}
function IconTrendDown({ s = 20 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/>
      <polyline points="16 17 22 17 22 11"/>
    </svg>
  );
}
function IconPercent({ s = 20 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="5" x2="5" y2="19"/>
      <circle cx="6.5" cy="6.5" r="2.5"/>
      <circle cx="17.5" cy="17.5" r="2.5"/>
    </svg>
  );
}

export { IconHome, IconChart, IconBell, IconUser, IconSearch, IconPlus, IconConvert, IconPortfolio, IconTrophy, IconNewspaper, IconClock, IconShield, IconFire, IconTrendDown, IconPercent, IconPieChart };

const NAV_ITEMS = [
  { id: 'home',             label: 'Tổng quan',          Icon: IconHome,      href: null,                             requiresAuth: false, adminOnly: false },
  { id: 'chart',            label: 'Thị trường',         Icon: IconChart,     href: null,                             requiresAuth: false, adminOnly: false },
  { id: 'alerts',           label: 'Cảnh báo',           Icon: IconBell,      href: null,                             requiresAuth: true,  adminOnly: false },
  { id: 'profile',          label: 'Tài khoản',          Icon: IconUser,      href: null,                             requiresAuth: true,  adminOnly: false },
  { id: 'portfolio',        label: 'Danh mục',           Icon: IconPortfolio, href: '/portfolio',                     requiresAuth: true,  adminOnly: false },
  { id: 'assets',           label: 'Tổng tài sản',       Icon: IconPieChart,  href: '/assets',                        requiresAuth: true,  adminOnly: false },
  { id: 'converter',        label: 'Quy đổi',            Icon: IconConvert,   href: '/tools/converter',               requiresAuth: false, adminOnly: false },
  { id: 'fire-calculator',  label: 'FIRE Calculator',    Icon: IconFire,      href: '/tools/fire-calculator',         requiresAuth: false, adminOnly: false },
  { id: 'inflation',        label: 'Máy tính lạm phát',  Icon: IconTrendDown, href: '/tools/inflation-calculator',    requiresAuth: false, adminOnly: false },
  { id: 'compound',         label: 'Lãi kép',            Icon: IconPercent,   href: '/tools/compound-interest',       requiresAuth: false, adminOnly: false },
  { id: 'leaderboard',      label: 'Bảng xếp hạng',      Icon: IconTrophy,    href: '/leaderboard',                   requiresAuth: false, adminOnly: false },
  { id: 'spread',           label: 'Chênh lệch giá',     Icon: IconChart,     href: '/tools/spread',                  requiresAuth: false, adminOnly: false },
  { id: 'digest',           label: 'Kho bản tin',        Icon: IconNewspaper, href: '/digest/archive',                requiresAuth: false, adminOnly: false },
  { id: 'history',          label: 'Lịch sử giá',        Icon: IconClock,     href: '/profile/history',               requiresAuth: true,  adminOnly: false },
  { id: 'admin',            label: 'Quản trị',           Icon: IconShield,    href: '/admin',                         requiresAuth: true,  adminOnly: true  },
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
    <aside className="w-[232px] shrink-0 h-full bg-ink-2 border-r border-line flex flex-col py-5">
      {/* Wordmark */}
      <div className="px-5 pb-[22px] border-b border-hairline">
        <div className="flex items-center gap-[10px]">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <rect x="3"  y="9"  width="3.5" height="11" rx="1" fill="#D4AF37"/>
            <rect x="9"  y="3"  width="3.5" height="17" rx="1" fill="#D4AF37"/>
            <rect x="15" y="11" width="3.5" height="9"  rx="1" fill="#D4AF37"/>
            <rect x="21" y="6"  width="2"   height="14" rx="1" fill="#D4AF37" opacity="0.6"/>
          </svg>
          <div>
            <div className="text-[16px] leading-none font-extrabold font-sans tracking-[-0.02em]">goldtracker</div>
            <div className="font-mono text-[9px] text-mute tracking-[0.16em] mt-1">GT.2026.05</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-3 py-4 flex-1">
        <div className="font-mono text-[9px] text-mute tracking-[0.16em] uppercase px-3 pt-1 pb-2">Không gian làm việc</div>
        {NAV_ITEMS.filter(it => !it.href && !it.adminOnly && (!it.requiresAuth || !!user)).map(it => {
          const active = tab === it.id;
          const handleClick = () => onChange(it.id as Tab);
          return (
            <Button
              key={it.id}
              variant="ghost"
              onClick={handleClick}
              className={cn(
                'relative w-full justify-start gap-3 px-3 py-[10px] h-auto font-medium font-sans text-[13px] leading-none transition-colors duration-[140ms]',
                active ? 'bg-ink-3 text-chalk hover:bg-ink-3 hover:text-chalk' : 'text-bone hover:bg-ink-3/60 hover:text-chalk',
              )}
            >
              {active && (
                <span className="absolute -left-3 top-2 bottom-2 w-[3px] bg-gold [border-radius:0_2px_2px_0]"/>
              )}
              <span className={cn(active ? 'text-gold' : 'text-mute')}>
                <it.Icon s={16}/>
              </span>
              <span>{it.label}</span>
            </Button>
          );
        })}

        <>
          <div className="font-mono text-[9px] text-mute tracking-[0.16em] uppercase px-3 pt-5 pb-2">Công cụ</div>
          {NAV_ITEMS.filter(it => !!it.href && !it.adminOnly && (!it.requiresAuth || !!user)).map(it => {
            const handleClick = () => router.push(it.href as string);
            return (
              <Button
                key={it.id}
                variant="ghost"
                onClick={handleClick}
                className="relative w-full justify-start gap-3 px-3 py-[10px] h-auto text-bone hover:bg-ink-3/60 hover:text-chalk font-medium font-sans text-[13px] leading-none transition-colors duration-[140ms]"
              >
                <span className="text-mute">
                  <it.Icon s={16}/>
                </span>
                <span>{it.label}</span>
              </Button>
            );
          })}
        </>

        {user?.role === 'admin' && (
          <>
            <div className="font-mono text-[9px] text-mute tracking-[0.16em] uppercase px-3 pt-5 pb-2">Quản trị</div>
            {NAV_ITEMS.filter(it => it.adminOnly).map(it => {
              const handleClick = () => router.push(it.href as string);
              return (
                <Button
                  key={it.id}
                  variant="ghost"
                  onClick={handleClick}
                  className="relative w-full justify-start gap-3 px-3 py-[10px] h-auto text-bone hover:bg-ink-3/60 hover:text-chalk font-medium font-sans text-[13px] leading-none transition-colors duration-[140ms]"
                >
                  <span className="text-mute">
                    <it.Icon s={16}/>
                  </span>
                  <span>{it.label}</span>
                </Button>
              );
            })}
          </>
        )}

        <div className="font-mono text-[9px] text-mute tracking-[0.16em] uppercase px-3 pt-5 pb-2">Theo dõi</div>
        {watchlist.map(w => (
          <div key={w.code} className="flex justify-between items-center px-3 py-2 rounded-md">
            <span className="font-mono text-[11px] font-bold text-bone">{w.code}</span>
            <div className="text-[11px] leading-none font-semibold font-sans tabular-nums">{w.val}</div>
          </div>
        ))}
      </nav>

      {/* Live status */}
      <div className="px-4 py-[14px] border-t border-hairline">
        <div className="flex items-center gap-2">
          <span className="relative flex h-[7px] w-[7px] shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live opacity-60"/>
            <span className="relative inline-flex rounded-full h-[7px] w-[7px] bg-live shadow-[0_0_8px_var(--live)]"/>
          </span>
          <span className="font-mono text-[10px] text-bone tracking-[0.1em] uppercase">Trực tiếp · ICT</span>
        </div>
        <div className="font-mono text-[9px] text-mute mt-2 leading-[1.5]">
          {intl
            ? `cập nhật ${(() => {
                const m = Math.floor((Date.now() - new Date(intl.recordedAt).getTime()) / 60_000);
                return m < 1 ? 'vừa xong' : `${m} phút trước`;
              })()}`
            : 'cập nhật tự động'}
          <br/>sjc · doji · pnj · bảo tín
        </div>
      </div>

      {/* User / Auth section */}
      <div className="px-4 py-3 border-t border-hairline">
        {user ? (
          <div className="flex items-center gap-[10px]">
            <div className="w-[30px] h-[30px] rounded-lg bg-[linear-gradient(135deg,#D4AF37,#8E7321)] flex items-center justify-center text-[11px] leading-none font-extrabold font-sans text-gold-ink shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[10px] text-bone tracking-[0.04em] overflow-hidden text-ellipsis whitespace-nowrap">
                {user.displayName ?? user.email}
              </div>
              {user.role === 'admin' ? (
                <span className="inline-block bg-gold text-gold-ink font-mono text-[8px] leading-none font-extrabold tracking-[0.14em] px-[6px] py-[3px] rounded-[3px] uppercase mt-[3px]">
                  ADMIN
                </span>
              ) : (
                <div className="font-mono text-[9px] text-mute uppercase tracking-[0.1em] mt-0.5">
                  {user.role}
                </div>
              )}
            </div>
          </div>
        ) : (
          <Button
            onClick={() => router.push('/auth/login')}
            className="w-full h-[34px] bg-gold rounded-lg text-[11px] leading-none font-bold font-sans text-gold-ink tracking-[0.04em] hover:bg-gold/90 hover:text-gold-ink"
          >
            Đăng nhập
          </Button>
        )}
      </div>
    </aside>
  );
}

function TopBar({ currency, onCurrency, onTab }: { currency: string; onCurrency: (c: string) => void; onTab: (t: Tab) => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const { data: alerts = [] } = useAlerts();
  const { data: alertHistory = [] } = useAlertHistory();
  const alertsMap = new Map(alerts.map(a => [a.id, a]));

  const [lastSeenCount, setLastSeenCount] = useState(() =>
    typeof window !== 'undefined' ? Number(localStorage.getItem('bell_last_seen') ?? '0') : 0,
  );
  const hasUnread = !!user && alertHistory.length > lastSeenCount;

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
    { label: 'Tổng quan',       type: 'trang', action: () => { onTab('home');    setSearchOpen(false); setSearchQuery(''); } },
    { label: 'Thị trường',     type: 'trang', action: () => { onTab('chart');   setSearchOpen(false); setSearchQuery(''); } },
    { label: 'Cảnh báo',       type: 'trang', action: () => { onTab('alerts');  setSearchOpen(false); setSearchQuery(''); } },
    { label: 'Tài khoản',      type: 'trang', action: () => { onTab('profile'); setSearchOpen(false); setSearchQuery(''); } },
    { label: 'Danh mục',       type: 'công cụ', action: () => { router.push('/portfolio');       setSearchOpen(false); setSearchQuery(''); } },
    { label: 'Quy đổi',        type: 'công cụ', action: () => { router.push('/tools/converter'); setSearchOpen(false); setSearchQuery(''); } },
    { label: 'Bảng xếp hạng', type: 'công cụ', action: () => { router.push('/leaderboard');     setSearchOpen(false); setSearchQuery(''); } },
    { label: 'Chênh lệch giá',  type: 'công cụ', action: () => { router.push('/tools/spread');    setSearchOpen(false); setSearchQuery(''); } },
    { label: 'Kho bản tin',    type: 'công cụ', action: () => { router.push('/digest/archive');  setSearchOpen(false); setSearchQuery(''); } },
    { label: 'Lịch sử giá',   type: 'công cụ', action: () => { router.push('/profile/history'); setSearchOpen(false); setSearchQuery(''); } },
    { label: 'SJC',            type: 'brand', action: () => { onTab('chart');   setSearchOpen(false); setSearchQuery(''); } },
    { label: 'DOJI',           type: 'brand', action: () => { onTab('chart');   setSearchOpen(false); setSearchQuery(''); } },
    { label: 'PNJ',            type: 'brand', action: () => { onTab('chart');   setSearchOpen(false); setSearchQuery(''); } },
    { label: 'BTMC',           type: 'brand', action: () => { onTab('chart');   setSearchOpen(false); setSearchQuery(''); } },
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
    if (next && user) {
      setLastSeenCount(alertHistory.length);
      localStorage.setItem('bell_last_seen', String(alertHistory.length));
    }
  }

  return (
    <header className="h-14 shrink-0 bg-ink-2 border-b border-line flex items-center gap-4 pr-5 pl-7">
      {/* Search bar */}
      <div ref={searchRef} className="flex-1 relative">
        <div
          onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 0); }}
          className={cn(
            'h-[34px] flex items-center gap-[10px] bg-ink-3 rounded-md px-3 cursor-text border',
            searchOpen ? 'border-gold' : 'border-line',
          )}
        >
          <span className="text-mute shrink-0"><IconSearch s={14}/></span>
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            placeholder="tìm kiếm tài sản, thương hiệu, cảnh báo…"
            className="flex-1 bg-transparent border-0 shadow-none text-[12px] leading-none font-normal font-mono text-chalk placeholder:text-mute h-auto p-0 focus-visible:ring-0"
          />
          {!searchOpen && (
            <span className="font-mono text-[9px] text-mute tracking-[0.1em] border border-line rounded-[3px] px-1.5 py-0.5 shrink-0">⌘ K</span>
          )}
        </div>
        {searchOpen && filteredItems.length > 0 && (
          <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-ink-2 border border-line rounded-[10px] z-[300] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            {filteredItems.map((item, i) => (
              <Button
                key={i}
                variant="ghost"
                onClick={item.action}
                className="w-full justify-between px-[14px] py-[10px] h-auto text-chalk text-[13px] leading-none font-medium font-sans hover:bg-ink-3 transition-colors duration-100"
              >
                <span>{item.label}</span>
                <span className="font-mono text-[9px] text-mute uppercase tracking-[0.1em]">{item.type}</span>
              </Button>
            ))}
          </div>
        )}
        {searchOpen && filteredItems.length === 0 && (
          <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-ink-2 border border-line rounded-[10px] z-[300] px-[14px] py-5 text-center shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <span className="font-mono text-[11px] text-mute">không tìm thấy kết quả cho &quot;{searchQuery}&quot;</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        {/* Live badge */}
        <span className="inline-flex items-center gap-[6px] text-[10px] leading-none font-bold font-mono tracking-[0.12em] uppercase text-live border border-[rgba(157,204,110,0.4)] px-[10px] py-[6px] rounded">
          <span className="relative flex h-[6px] w-[6px] shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live opacity-60"/>
            <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-live"/>
          </span>
          live
        </span>

        {/* Currency switcher */}
        <div className="flex bg-ink-3 border border-line rounded-md p-0.5">
          {['USD', 'VND', 'EUR'].map(c => (
            <Button
              key={c}
              variant="ghost"
              onClick={() => onCurrency(c)}
              className={cn(
                'px-[10px] py-[5px] h-auto font-bold font-mono text-[10px] leading-none tracking-[0.1em] rounded',
                currency === c ? 'bg-gold text-gold-ink hover:bg-gold hover:text-gold-ink' : 'bg-transparent text-bone hover:bg-ink-3/60',
              )}
            >{c}</Button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-line shrink-0" />

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Bell with dropdown */}
        <div ref={bellRef} className="relative">
          <Button
            variant="outline"
            size="icon"
            onClick={handleBellClick}
            className={cn(
              'w-[34px] h-[34px] border-line rounded-md text-bone relative',
              bellOpen ? 'bg-ink-3 hover:bg-ink-3' : 'bg-transparent hover:bg-ink-3',
            )}
          >
            <IconBell s={15}/>
            {!bellOpen && hasUnread && (
              <span className="absolute top-[6px] right-[7px] w-[7px] h-[7px] rounded-full bg-gold shadow-[0_0_0_2px_var(--ink-2)]"/>
            )}
          </Button>
          {bellOpen && (
            <div className="absolute top-[calc(100%+8px)] right-0 w-[300px] bg-ink-2 border border-line rounded-xl z-[200] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] leading-none font-bold tracking-[0.12em] uppercase text-mute">Thông báo</span>
                  {alertHistory.length > 0 && (
                    <span className="font-mono text-[9px] font-bold leading-none bg-gold text-gold-ink px-[5px] py-[2px] rounded-full">{alertHistory.length}</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  onClick={() => { setBellOpen(false); onTab('alerts'); }}
                  className="h-auto px-0 py-0 font-mono text-[11px] leading-none font-semibold text-gold hover:bg-transparent hover:text-gold"
                >
                  tất cả →
                </Button>
              </div>

              {!user && (
                <div className="flex flex-col items-center justify-center px-5 py-8 gap-[6px]">
                  <span className="text-gold"><IconBell s={24}/></span>
                  <span className="font-mono text-[11px] text-mute text-center leading-[1.5]">Đăng nhập để xem thông báo</span>
                </div>
              )}

              {user && alertHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center px-5 py-8 gap-[10px]">
                  <span className="text-gold"><IconBell s={28}/></span>
                  <span className="font-mono text-[12px] text-chalk font-bold leading-none">Chưa có thông báo</span>
                  <span className="font-mono text-[11px] text-mute text-center leading-[1.5]">Sẽ hiển thị khi cảnh báo được kích hoạt</span>
                </div>
              )}

              {user && alertHistory.length > 0 && (
                <div>
                  {alertHistory.slice(0, 4).map((h, i) => {
                    const alert = alertsMap.get(h.alertId);
                    const price = Number(h.priceAtTrigger);
                    const timeStr = new Date(h.triggeredAt).toLocaleString('vi-VN', {
                      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                    });
                    return (
                      <div key={h.id} className={cn('px-4 py-3 flex flex-col gap-[6px]', i !== 0 && 'border-t border-hairline')}>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-gold tracking-[0.08em]">
                            {alert?.brand ?? '—'} {alert ? (alert.condition === 'gte' ? '↑' : '↓') : ''}
                          </span>
                          <span className="font-mono text-[9px] text-mute">{timeStr}</span>
                        </div>
                        <span className="font-sans text-[15px] leading-none font-bold tabular-nums text-chalk">
                          {price.toLocaleString('vi-VN')}₫
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Avatar / auth */}
        <div ref={avatarRef} className="relative">
          {user ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAvatarOpen(v => !v)}
              className="w-8 h-8 rounded-full bg-[linear-gradient(135deg,#D4AF37,#8E7321)] text-[11px] leading-none font-extrabold font-sans text-gold-ink hover:bg-[linear-gradient(135deg,#b8922d,#6b5519)] hover:text-gold-ink p-0"
            >
              {initials || 'GT'}
            </Button>
          ) : (
            <Button
              onClick={() => router.push('/auth/login')}
              className="h-8 px-[14px] bg-gold rounded-full text-[11px] leading-none font-bold font-sans text-gold-ink tracking-[0.04em] hover:bg-gold/90 hover:text-gold-ink"
            >
              Đăng nhập
            </Button>
          )}
          {avatarOpen && user && (
            <div className="absolute top-[calc(100%+8px)] right-0 w-[220px] bg-ink-2 border border-line rounded-xl z-[200] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
              <div className="px-4 py-[14px] border-b border-line">
                <div className="flex items-center gap-[10px]">
                  <div className="w-[30px] h-[30px] rounded-lg bg-[linear-gradient(135deg,#D4AF37,#8E7321)] flex items-center justify-center text-[11px] leading-none font-extrabold font-sans text-gold-ink shrink-0">
                    {initials || 'GT'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] text-chalk font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                      {user.displayName ?? user.email}
                    </div>
                    {user.role === 'admin' ? (
                      <span className="inline-block bg-gold text-gold-ink font-mono text-[8px] leading-none font-extrabold tracking-[0.14em] px-[6px] py-[3px] rounded-[3px] uppercase mt-[3px]">
                        ADMIN
                      </span>
                    ) : (
                      <div className="font-mono text-[9px] text-mute uppercase tracking-[0.1em] mt-0.5">
                        {user.role}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="py-[6px]">
                <Button
                  variant="ghost"
                  onClick={() => { onTab('profile'); setAvatarOpen(false); }}
                  className="w-full justify-start gap-[10px] px-4 py-[10px] h-auto text-chalk text-[13px] leading-none font-medium font-sans hover:bg-ink-3 hover:text-chalk transition-colors"
                >
                  <IconUser s={14}/>
                  Hồ sơ &amp; cài đặt
                </Button>
                <div className="h-px bg-line my-1"/>
                <Button
                  variant="ghost"
                  onClick={() => { logout().then(() => toast.success('Đã đăng xuất')); setAvatarOpen(false); }}
                  className="w-full justify-start gap-[10px] px-4 py-[10px] h-auto text-[#e05252] text-[13px] leading-none font-medium font-sans hover:bg-ink-3 hover:text-[#e05252] transition-colors"
                >
                  Đăng xuất
                </Button>
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
    <div className="fixed inset-0 flex overflow-hidden bg-ink">
      <Sidebar tab={tab} onChange={onTab}/>
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar currency={currency} onCurrency={onCurrency} onTab={onTab}/>
        <main className="flex-1 overflow-auto bg-ink">
          {children}
        </main>
      </div>
    </div>
  );
}

export type { Tab };
