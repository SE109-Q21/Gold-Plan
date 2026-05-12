'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { ApiError } from '@/lib/auth.api';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
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
      router.push('/');
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

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--mute)' }}>
          No account?{' '}
          <Link href="/auth/register" style={linkStyle}>Create one</Link>
        </p>
      </div>
    </div>
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
