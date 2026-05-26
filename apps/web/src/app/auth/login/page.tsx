'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { ApiError } from '@/lib/auth.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
        setError('Quá nhiều lần thử thất bại. Vui lòng thử lại sau 15 phút.');
      } else {
        setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
      }
    } finally {
      setLoading(false);
    }
  }

  const googleHref = from && from.startsWith('/')
    ? `${API_BASE}/auth/google?from=${encodeURIComponent(from)}`
    : `${API_BASE}/auth/google`;

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-[400px] bg-ink-2 border border-line rounded-2xl px-8 py-9 [clip-path:polygon(0_0,calc(100%-20px)_0,100%_20px,100%_100%,0_100%)]">
        <div className="text-center mb-7">
          <div className="w-11 h-11 rounded-[10px] bg-[linear-gradient(135deg,#D4AF37,#8E7321)] flex items-center justify-center mx-auto mb-[14px] text-[18px] leading-none font-extrabold font-sans text-gold-ink">
            GT
          </div>
          <h1 className="text-[24px] leading-[1.1] font-extrabold font-sans tracking-[-0.02em] text-chalk m-0">Đăng nhập</h1>
          <p className="text-mute text-[13px] mt-[6px] m-0">Chào mừng trở lại GoldTracker</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
          <div>
            <Label htmlFor="email" className="block font-mono text-[11px] leading-none font-semibold tracking-[0.1em] uppercase text-mute mb-[6px]">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="bg-ink-3 border-line text-chalk text-[14px] font-medium placeholder:text-mute focus-visible:ring-gold"
            />
          </div>

          <div>
            <Label htmlFor="password" className="block font-mono text-[11px] leading-none font-semibold tracking-[0.1em] uppercase text-mute mb-[6px]">
              Mật khẩu
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mật khẩu của bạn"
              required
              autoComplete="current-password"
              className="bg-ink-3 border-line text-chalk text-[14px] font-medium placeholder:text-mute focus-visible:ring-gold"
            />
          </div>

          <div className="text-right -mt-1">
            <Link href="/auth/forgot-password" className="text-gold font-semibold text-[12px] no-underline">
              Quên mật khẩu?
            </Link>
          </div>

          {error && (
            <div className="bg-[rgba(229,72,77,0.12)] border border-[rgba(229,72,77,0.3)] rounded-lg px-[14px] py-[10px] text-[13px] leading-[1.4] font-medium font-sans text-down">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-[42px] mt-1 text-[13px] font-bold tracking-[0.02em]"
          >
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </Button>
        </form>

        <div className="flex items-center gap-[10px] mt-5 mb-[14px]">
          <span className="flex-1 h-px bg-line"/>
          <span className="font-mono text-[12px] leading-none font-medium text-mute tracking-[0.05em] shrink-0">hoặc</span>
          <span className="flex-1 h-px bg-line"/>
        </div>

        <a
          href={googleHref}
          className="flex items-center justify-center gap-[10px] h-[42px] bg-ink-3 border border-line rounded-lg text-[13px] leading-none font-semibold font-sans text-chalk no-underline tracking-[0.01em] cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0">
            <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
            <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
            <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
            <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
          </svg>
          Đăng nhập với Google
        </a>

        <p className="text-center mt-5 text-[13px] text-mute m-0">
          Chưa có tài khoản?{' '}
          <Link href="/auth/register" className="text-gold font-semibold no-underline">Tạo mới</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink"/>}>
      <LoginForm />
    </Suspense>
  );
}
