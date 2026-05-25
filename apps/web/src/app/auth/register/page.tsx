'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

const PAGE = 'min-h-screen bg-ink flex items-center justify-center px-4 py-6';
const CARD = 'w-full max-w-[400px] bg-ink-2 border border-line rounded-2xl px-8 py-9 [clip-path:polygon(0_0,calc(100%-20px)_0,100%_20px,100%_100%,0_100%)]';
const LABEL = 'block font-mono text-[11px] leading-none font-semibold tracking-[0.1em] uppercase text-mute mb-[6px]';
const INPUT = 'w-full h-10 bg-ink-3 border border-line rounded-lg px-3 text-chalk text-[14px] leading-none font-medium font-sans outline-none box-border';

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
      <div className={PAGE}>
        <div className={CARD}>
          <div className="text-center mb-7">
            <div className="w-[52px] h-[52px] rounded-[12px] bg-[linear-gradient(135deg,#D4AF37,#8E7321)] flex items-center justify-center mx-auto mb-4 font-display text-[20px] leading-none font-extrabold text-gold-ink">✓</div>
            <h1 className="font-display text-[24px] leading-[1.1] font-extrabold tracking-[-0.02em] text-chalk m-0">Check your email</h1>
            <p className="text-mute text-[14px] mt-2 leading-[1.6] m-0">
              We sent a verification link to <strong className="text-bone">{email}</strong>.<br/>
              Click the link to activate your account.
            </p>
          </div>
          <Link href="/auth/login" className="text-gold font-semibold no-underline">Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={PAGE}>
      <div className={CARD}>
        <div className="text-center mb-7">
          <div className="w-11 h-11 rounded-[10px] bg-[linear-gradient(135deg,#D4AF37,#8E7321)] flex items-center justify-center mx-auto mb-[14px] font-display text-[18px] leading-none font-extrabold text-gold-ink">GT</div>
          <h1 className="font-display text-[24px] leading-[1.1] font-extrabold tracking-[-0.02em] text-chalk m-0">Create account</h1>
          <p className="text-mute text-[13px] mt-[6px] m-0">Start tracking gold prices</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
          <div>
            <label htmlFor="email" className={LABEL}>Email</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className={INPUT} autoComplete="email"/>
          </div>
          <div>
            <label htmlFor="password" className={LABEL}>Password</label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 chars, 1 uppercase, 1 digit" required className={INPUT} autoComplete="new-password"/>
          </div>
          <div>
            <label htmlFor="confirm-password" className={LABEL}>Confirm password</label>
            <input id="confirm-password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" required className={INPUT} autoComplete="new-password"/>
          </div>

          {error && (
            <div className="bg-[rgba(229,72,77,0.12)] border border-[rgba(229,72,77,0.3)] rounded-lg px-[14px] py-[10px] font-sans text-[13px] leading-[1.4] font-medium text-down">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              'h-[42px] bg-gold border-0 rounded-lg font-display text-[13px] leading-none font-bold text-gold-ink tracking-[0.02em] mt-1 transition-opacity',
              loading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer opacity-100',
            )}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center mt-5 text-[13px] text-mute m-0">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-gold font-semibold no-underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
