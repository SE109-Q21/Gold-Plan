'use client';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const NAV_LINKS = [
  { href: '/admin',             label: 'Overview' },
  { href: '/admin/data-sources', label: 'Data Sources' },
  { href: '/admin/users',        label: 'Users' },
  { href: '/admin/anomalies',    label: 'Anomalies' },
  { href: '/admin/forecast',    label: 'Forecast' },
  { href: '/admin/audit',       label: 'Audit Log' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== 'admin') return null;

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--ink)',
      color: 'var(--chalk)',
      fontFamily: 'var(--font-display)',
    }}>
      {/* Sidebar */}
      <aside style={{
        width: 200,
        background: 'var(--ink-2)',
        borderRight: '1px solid var(--line)',
        padding: '24px 0',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        {/* Brand header */}
        <div style={{
          padding: '0 20px 20px',
          borderBottom: '1px solid var(--hairline)',
        }}>
          <div style={{
            font: '800 14px/1 var(--font-display)',
            color: 'var(--gold)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 4,
          }}>
            ADMIN
          </div>
          <div style={{
            font: '500 10px/1 var(--font-mono)',
            color: 'var(--mute)',
            letterSpacing: '0.1em',
          }}>
            goldtracker
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ padding: '16px 0', flex: 1 }}>
          {NAV_LINKS.map(link => (
            <button
              key={link.href}
              onClick={() => router.push(link.href)}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 20px',
                background: 'transparent',
                border: 0,
                cursor: 'pointer',
                font: '500 13px/1 var(--font-display)',
                color: 'var(--bone)',
                textAlign: 'left',
                letterSpacing: '0.01em',
                transition: 'color 120ms ease, background 120ms ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--ink-3)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--chalk)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--bone)';
              }}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* User info */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--hairline)',
        }}>
          <div style={{
            font: '500 10px/1 var(--font-mono)',
            color: 'var(--mute)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {user.email}
          </div>
          <button
            onClick={() => router.push('/')}
            style={{
              marginTop: 10,
              width: '100%',
              padding: '7px 0',
              background: 'transparent',
              border: '1px solid var(--line)',
              borderRadius: 6,
              cursor: 'pointer',
              font: '600 10px/1 var(--font-mono)',
              color: 'var(--mute)',
              letterSpacing: '0.08em',
            }}
          >
            ← Dashboard
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
