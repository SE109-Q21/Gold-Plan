'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiForgotPassword } from '@/lib/auth.api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiForgotPassword(email);
    } catch {
      // Intentionally swallow — always show generic message to prevent email enumeration
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={iconStyle}>✉</div>
            <h1 style={headingStyle}>Check your inbox</h1>
            <p style={{ color: 'var(--mute)', marginTop: 10, fontSize: 14, lineHeight: 1.6 }}>
              If <strong style={{ color: 'var(--bone)' }}>{email}</strong> is registered,
              you&apos;ll receive a password reset link shortly.
            </p>
            <Link href="/auth/login" style={{ ...linkStyle, display: 'inline-block', marginTop: 24, padding: '10px 24px', background: 'var(--gold)', borderRadius: 8, color: '#0B0B0F', textDecoration: 'none', font: '700 13px/1 var(--font-display)' }}>
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#D4AF37,#8E7321)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', font: '800 18px/1 var(--font-display)', color: '#0B0B0F' }}>GT</div>
          <h1 style={headingStyle}>Reset password</h1>
          <p style={{ color: 'var(--mute)', fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={inputStyle}
              autoComplete="email"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ ...submitBtnStyle, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--mute)' }}>
          Remembered it?{' '}
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

const iconStyle: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 12,
  background: 'linear-gradient(135deg,#D4AF37,#8E7321)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 16px',
  font: '800 22px/1 var(--font-display)',
  color: '#0B0B0F',
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
