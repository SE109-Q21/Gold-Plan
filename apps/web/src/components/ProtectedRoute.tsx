'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--ink)' }}>
        <div style={{ color: 'var(--mute)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Loading…</div>
      </div>
    );
  }

  if (!user) {
    router.replace(`/auth/login?from=${encodeURIComponent(pathname)}`);
    return null;
  }

  return <>{children}</>;
}
