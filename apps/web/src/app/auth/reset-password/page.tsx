'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiResetPassword } from '@/lib/auth.api';

function validate(password: string, confirm: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least 1 uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least 1 digit';
  if (password !== confirm) return 'Passwords do not match';
  return null;
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={iconErr}>×</div>
            <h1 style={headingStyle}>Invalid link</h1>
            <p style={{ color: 'var(--mute)', marginTop: 8, fontSize: 14 }}>
              This reset link is missing or malformed.
            </p>
            <Link href="/auth/forgot-password" style={{ ...btnLink, marginTop: 24, display: 'inline-block' }}>
              Request a new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={iconSuccess}>✓</div>
            <h1 style={headingStyle}>Password updated</h1>
            <p style={{ color: 'var(--mute)', marginTop: 8, fontSize: 14 }}>
              Your password has been reset successfully.
            </p>
            <Link href="/auth/login" style={{ ...btnLink, marginTop: 24, display: 'inline-block' }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const validationError = validate(password, confirm);
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    try {
      await apiResetPassword(token!, password);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#D4AF37,#8E7321)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', font: '800 18px/1 var(--font-display)', color: '#0B0B0F' }}>GT</div>
          <h1 style={headingStyle}>New password</h1>
          <p style={{ color: 'var(--mute)', fontSize: 13, marginTop: 6 }}>Choose a strong new password</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>New password</label>
            <input
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
            <label style={labelStyle}>Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat password"
              required
              style={inputStyle}
              autoComplete="new-password"
            />
          </div>

          {error && <div style={errorStyle}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{ ...submitBtnStyle, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--mute)' }}>
          <Link href="/auth/login" style={linkStyle}>Back to login</Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={spinnerStyle}/>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordContent />
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
  margin: '12px 0 0',
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

const btnLink: React.CSSProperties = {
  height: 42,
  padding: '0 24px',
  background: 'var(--gold)',
  border: 0,
  borderRadius: 8,
  font: '700 13px/42px var(--font-display)',
  color: '#0B0B0F',
  letterSpacing: '0.02em',
  textDecoration: 'none',
  cursor: 'pointer',
};

const iconBase: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto',
  font: '800 22px/1 var(--font-display)',
};
const iconSuccess: React.CSSProperties = { ...iconBase, background: 'linear-gradient(135deg,#D4AF37,#8E7321)', color: '#0B0B0F' };
const iconErr: React.CSSProperties = { ...iconBase, background: 'rgba(229,72,77,0.12)', border: '1px solid rgba(229,72,77,0.3)', color: 'var(--down)' };

const spinnerStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  border: '3px solid var(--line)',
  borderTopColor: 'var(--gold)',
  animation: 'spin 0.8s linear infinite',
  margin: '0 auto',
};
