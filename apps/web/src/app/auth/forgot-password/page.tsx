'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiForgotPassword } from '@/lib/auth.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PAGE = 'min-h-screen bg-ink flex items-center justify-center px-4 py-6';
const CARD = 'w-full max-w-[400px] bg-ink-2 border border-line rounded-2xl px-8 py-9 [clip-path:polygon(0_0,calc(100%-20px)_0,100%_20px,100%_100%,0_100%)]';

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
            <h1 className="font-display text-[24px] leading-[1.1] font-extrabold tracking-[-0.02em] text-chalk m-0">Kiểm tra hộp thư</h1>
            <p className="text-mute mt-[10px] text-[14px] leading-[1.6]">
              Nếu <strong className="text-bone">{email}</strong> đã đăng ký,
              bạn sẽ nhận được liên kết đặt lại mật khẩu trong thời gian ngắn.
            </p>
            <Button asChild className="mt-6 h-[42px] px-6 text-[13px] font-bold tracking-[0.02em]">
              <Link href="/auth/login">Quay lại đăng nhập</Link>
            </Button>
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
          <h1 className="font-display text-[24px] leading-[1.1] font-extrabold tracking-[-0.02em] text-chalk m-0">Đặt lại mật khẩu</h1>
          <p className="text-mute text-[13px] mt-[6px] leading-[1.5] m-0">
            Nhập email và chúng tôi sẽ gửi cho bạn liên kết đặt lại.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
          <div>
            <Label className="block font-mono text-[11px] leading-none font-semibold tracking-[0.1em] uppercase text-mute mb-[6px]">
              Email
            </Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="bg-ink-3 border-line text-chalk text-[14px] font-medium placeholder:text-mute focus-visible:ring-gold"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-[42px] mt-1 text-[13px] font-bold tracking-[0.02em]"
          >
            {loading ? 'Đang gửi…' : 'Gửi liên kết đặt lại'}
          </Button>
        </form>

        <p className="text-center mt-5 text-[13px] text-mute m-0">
          Đã nhớ rồi?{' '}
          <Link href="/auth/login" className="text-gold font-semibold no-underline">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
