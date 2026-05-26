'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

function OAuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { loginWithToken } = useAuth();

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      router.push('/auth/login?error=oauth_failed');
      return;
    }
    loginWithToken(token)
      .then(() => router.push('/'))
      .catch(() => router.push('/auth/login?error=oauth_failed'));
  }, [params, router, loginWithToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink text-gold font-mono text-[16px] tracking-[0.05em]">
      Đang đăng nhập…
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-ink text-gold font-mono text-[16px] tracking-[0.05em]">
          Đang đăng nhập…
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
