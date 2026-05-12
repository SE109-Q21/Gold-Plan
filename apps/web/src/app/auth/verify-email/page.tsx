'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiVerifyEmail } from '@/lib/auth.api';

type Status = 'loading' | 'success' | 'expired' | 'invalid';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>(token ? 'loading' : 'invalid');

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    (async () => {
      try {
        await apiVerifyEmail(token);
        setStatus('success');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message.toLowerCase() : '';
        if (msg.includes('expired') || msg.includes('invalid token')) {
          setStatus('expired');
        } else {
          setStatus('invalid');
        }
      }
    })();
  }, [token]);

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {status === 'loading' && (
          <div style={{ textAlign: 'center' }}>
            <div style={spinnerStyle}/>
            <p style={{ color: 'var(--mute)', marginTop: 16 }}>Verifying your email…</p>
          </div>
        )}

        {status === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div style={iconSuccess}>✓</div>
            <h1 style={headingStyle}>Email verified!</h1>
            <p style={{ color: 'var(--mute)', marginTop: 8, fontSize: 14, lineHeight: 1.6 }}>
              Your account is now active. You can sign in.
            </p>
            <Link href="/auth/login" style={{ ...btnStyle, marginTop: 24, display: 'inline-block' }}>Sign in</Link>
          </div>
        )}

        {status === 'expired' && (
          <div style={{ textAlign: 'center' }}>
            <div style={iconWarn}>!</div>
            <h1 style={headingStyle}>Link expired</h1>
            <p style={{ color: 'var(--mute)', marginTop: 8, fontSize: 14, lineHeight: 1.6 }}>
              This verification link has expired or already been used.
            </p>
            <Link href="/auth/login" style={{ ...btnStyle, marginTop: 24, display: 'inline-block' }}>
              Back to login
            </Link>
          </div>
        )}

        {status === 'invalid' && (
          <div style={{ textAlign: 'center' }}>
            <div style={iconErr}>×</div>
            <h1 style={headingStyle}>Invalid link</h1>
            <p style={{ color: 'var(--mute)', marginTop: 8, fontSize: 14 }}>
              This verification link is missing or malformed.
            </p>
            <Link href="/auth/login" style={{ ...btnStyle, marginTop: 24, display: 'inline-block' }}>Back to login</Link>
          </div>
        )}

      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
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
      <VerifyEmailContent />
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
  padding: '40px 32px',
  clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)',
};

const headingStyle: React.CSSProperties = {
  font: '800 24px/1.1 var(--font-display)',
  letterSpacing: '-0.02em',
  color: 'var(--chalk)',
  margin: '12px 0 0',
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
const iconWarn: React.CSSProperties = { ...iconBase, background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: 'var(--gold)' };
const iconErr: React.CSSProperties = { ...iconBase, background: 'rgba(229,72,77,0.12)', border: '1px solid rgba(229,72,77,0.3)', color: 'var(--down)' };

const btnStyle: React.CSSProperties = {
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

const spinnerStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  border: '3px solid var(--line)',
  borderTopColor: 'var(--gold)',
  animation: 'spin 0.8s linear infinite',
  margin: '0 auto',
};
