'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiForgotPassword } from '@/lib/auth.api';
import { cn } from '@/lib/utils';

const PAGE = 'min-h-screen bg-ink flex items-center justify-center px-4 py-6';
const CARD = 'w-full max-w-[400px] bg-ink-2 border border-line rounded-2xl px-8 py-9 [clip-path:polygon(0_0,calc(100%-20px)_0,100%_20px,100%_100%,0_100%)]';
const LABEL = 'block font-mono text-[11px] leading-none font-semibold tracking-[0.1em] uppercase text-mute mb-[6px]';
const INPUT = 'w-full h-10 bg-ink-3 border border-line rounded-lg px-3 text-chalk text-[14px] leading-none font-medium font-sans outline-none box-border';

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
      <div className={PAGE}>
        <div className={CARD}>
          <div className="text-center">
            <div className="w-[52px] h-[52px] rounded-[12px] bg-[linear-gradient(135deg,#D4AF37,#8E7321)] flex items-center justify-center mx-auto mb-4 font-display text-[22px] leading-none font-extrabold text-gold-ink">✉</div>
            <h1 className="font-display text-[24px] leading-[1.1] font-extrabold tracking-[-0.02em] text-chalk m-0">Check your inbox</h1>
            <p className="text-mute mt-[10px] text-[14px] leading-[1.6]">
              If <strong className="text-bone">{email}</strong> is registered,
              you&apos;ll receive a password reset link shortly.
            </p>
            <Link
              href="/auth/login"
              className="inline-block mt-6 h-[42px] px-6 bg-gold rounded-lg font-display text-[13px] leading-[42px] font-bold text-gold-ink tracking-[0.02em] no-underline cursor-pointer"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={PAGE}>
      <div className={CARD}>
        <div className="text-center mb-7">
          <div className="w-11 h-11 rounded-[10px] bg-[linear-gradient(135deg,#D4AF37,#8E7321)] flex items-center justify-center mx-auto mb-[14px] font-display text-[18px] leading-none font-extrabold text-gold-ink">GT</div>
          <h1 className="font-display text-[24px] leading-[1.1] font-extrabold tracking-[-0.02em] text-chalk m-0">Reset password</h1>
          <p className="text-mute text-[13px] mt-[6px] leading-[1.5] m-0">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
          <div>
            <label className={LABEL}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className={INPUT}
              autoComplete="email"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={cn(
              'h-[42px] bg-gold border-0 rounded-lg font-display text-[13px] leading-none font-bold text-gold-ink tracking-[0.02em] mt-1 transition-opacity',
              loading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer opacity-100',
            )}
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="text-center mt-5 text-[13px] text-mute m-0">
          Remembered it?{' '}
          <Link href="/auth/login" className="text-gold font-semibold no-underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
