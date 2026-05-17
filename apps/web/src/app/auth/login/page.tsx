'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { ApiError } from '@/lib/auth.api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push(from && from.startsWith('/') ? from : '/');
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 429) {
        setError('Too many failed attempts. Try again in 15 minutes.');
      } else {
        setError(err instanceof Error ? err.message : 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  }

  const googleHref = from && from.startsWith('/')
    ? `${API_BASE}/auth/google?from=${encodeURIComponent(from)}`
    : `${API_BASE}/auth/google`;

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#D4AF37,#8E7321)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', font: '800 18px/1 var(--font-display)', color: '#0B0B0F' }}>GT</div>
          <h1 style={headingStyle}>Sign in</h1>
          <p style={{ color: 'var(--mute)', fontSize: 13, marginTop: 6 }}>Welcome back to GoldTracker</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label htmlFor="email" style={labelStyle}>Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={inputStyle}
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password" style={labelStyle}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Your password"
              required
              style={inputStyle}
              autoComplete="current-password"
            />
          </div>

          <div style={{ textAlign: 'right', marginTop: -4 }}>
            <Link href="/auth/forgot-password" style={{ ...linkStyle, fontSize: 12 }}>Forgot password?</Link>
          </div>

          {error && (
            <div style={errorStyle}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ ...submitBtnStyle, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={dividerStyle}>
          <span style={dividerLineStyle} />
          <span style={dividerTextStyle}>hoặc</span>
          <span style={dividerLineStyle} />
        </div>

        <a href={googleHref} style={googleBtnStyle}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
            <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
            <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
            <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
          </svg>
          Đăng nhập với Google
        </a>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--mute)' }}>
          No account?{' '}
          <Link href="/auth/register" style={linkStyle}>Create one</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={pageStyle} />}>
      <LoginForm />
    </Suspense>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--ink)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 16px',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 400,
  background: 'var(--ink-2)',
  border: '1px solid var(--line)',
  borderRadius: 16,
  padding: '36px 32px',
  clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)',
};

const headingStyle: React.CSSProperties = {
  font: '800 24px/1.1 var(--font-display)',
  letterSpacing: '-0.02em',
  color: 'var(--chalk)',
  margin: 0,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  font: '600 11px/1 var(--font-mono)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--mute)',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 40,
  background: 'var(--ink-3)',
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: '0 12px',
  color: 'var(--chalk)',
  font: '500 14px/1 var(--font-display)',
  outline: 'none',
  boxSizing: 'border-box',
};

const errorStyle: React.CSSProperties = {
  background: 'rgba(229,72,77,0.12)',
  border: '1px solid rgba(229,72,77,0.3)',
  borderRadius: 8,
  padding: '10px 14px',
  font: '500 13px/1.4 var(--font-display)',
  color: 'var(--down)',
};

const submitBtnStyle: React.CSSProperties = {
  height: 42,
  background: 'var(--gold)',
  border: 0,
  borderRadius: 8,
  font: '700 13px/1 var(--font-display)',
  color: '#0B0B0F',
  letterSpacing: '0.02em',
  marginTop: 4,
};

const linkStyle: React.CSSProperties = {
  color: 'var(--gold)',
  textDecoration: 'none',
  fontWeight: 600,
};

const dividerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginTop: 20,
  marginBottom: 14,
};

const dividerLineStyle: React.CSSProperties = {
  flex: 1,
  height: 1,
  background: 'var(--line)',
};

const dividerTextStyle: React.CSSProperties = {
  font: '500 12px/1 var(--font-mono)',
  color: 'var(--mute)',
  letterSpacing: '0.05em',
  flexShrink: 0,
};

const googleBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  height: 42,
  background: 'var(--ink-3)',
  border: '1px solid var(--line)',
  borderRadius: 8,
  font: '600 13px/1 var(--font-display)',
  color: 'var(--chalk)',
  textDecoration: 'none',
  letterSpacing: '0.01em',
  cursor: 'pointer',
};
