'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';

function validate(email: string, password: string, confirm: string): string | null {
  if (!email) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least 1 uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least 1 digit';
  if (password !== confirm) return 'Passwords do not match';
  return null;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const validationError = validate(email, password, confirm);
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    try {
      await register(email, password);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: 'linear-gradient(135deg,#D4AF37,#8E7321)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', font: '800 20px/1 var(--font-display)', color: '#0B0B0F' }}>✓</div>
            <h1 style={headingStyle}>Check your email</h1>
            <p style={{ color: 'var(--mute)', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
              We sent a verification link to <strong style={{ color: 'var(--bone)' }}>{email}</strong>.<br/>
              Click the link to activate your account.
            </p>
          </div>
          <Link href="/auth/login" style={linkStyle}>Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#D4AF37,#8E7321)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', font: '800 18px/1 var(--font-display)', color: '#0B0B0F' }}>GT</div>
          <h1 style={headingStyle}>Create account</h1>
          <p style={{ color: 'var(--mute)', fontSize: 13, marginTop: 6 }}>Start tracking gold prices</p>
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
              placeholder="Min. 8 chars, 1 uppercase, 1 digit"
              required
              style={inputStyle}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" style={labelStyle}>Confirm password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat password"
              required
              style={inputStyle}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div style={errorStyle}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ ...submitBtnStyle, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--mute)' }}>
          Already have an account?{' '}
          <Link href="/auth/login" style={linkStyle}>Sign in</Link>
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
