'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export default function OAuthCallbackPage() {
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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0B0B0F',
        color: '#D4AF37',
        fontFamily: 'monospace',
        fontSize: 16,
        letterSpacing: '0.05em',
      }}
    >
      Đang đăng nhập…
    </div>
  );
}
