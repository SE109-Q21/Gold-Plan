'use client';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/admin',              label: 'Overview'     },
  { href: '/admin/data-sources', label: 'Data Sources' },
  { href: '/admin/users',        label: 'Users'        },
  { href: '/admin/anomalies',    label: 'Anomalies'    },
  { href: '/admin/forecast',     label: 'Forecast'     },
  { href: '/admin/audit',        label: 'Audit Log'    },
  { href: '/admin/benchmarks',   label: 'Benchmarks'   },
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
    <div className="flex min-h-screen bg-ink text-chalk font-display">
      {/* Sidebar */}
      <aside className="w-[200px] bg-ink-2 border-r border-line py-6 flex flex-col shrink-0">
        <div className="px-5 pb-5 border-b border-hairline">
          <div className="font-display text-[14px] leading-none font-extrabold text-gold tracking-[0.06em] uppercase mb-1">
            ADMIN
          </div>
          <div className="font-mono text-[10px] leading-none text-mute tracking-[0.1em]">
            goldtracker
          </div>
        </div>

        <nav className="py-4 flex-1">
          {NAV_LINKS.map(link => (
            <button
              key={link.href}
              onClick={() => router.push(link.href)}
              className={cn(
                'block w-full px-5 py-[10px] bg-transparent border-0 cursor-pointer',
                'font-display text-[13px] leading-none font-medium text-bone text-left tracking-[0.01em]',
                'transition-[color,background] duration-[120ms] hover:bg-ink-3 hover:text-chalk',
              )}
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="px-5 pt-3 border-t border-hairline">
          <div className="font-mono text-[10px] leading-none text-mute overflow-hidden text-ellipsis whitespace-nowrap">
            {user.email}
          </div>
          <button
            onClick={() => router.push('/')}
            className="mt-[10px] w-full py-[7px] bg-transparent border border-line rounded-md cursor-pointer font-mono text-[10px] leading-none font-semibold text-mute tracking-[0.08em]"
          >
            ← Dashboard
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
