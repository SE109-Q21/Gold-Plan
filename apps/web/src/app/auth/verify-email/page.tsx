'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiVerifyEmail } from '@/lib/auth.api';

const PAGE = 'min-h-screen bg-ink flex items-center justify-center px-4 py-6';
const CARD = 'w-full max-w-[400px] bg-ink-2 border border-line rounded-2xl px-8 py-[40px] [clip-path:polygon(0_0,calc(100%-20px)_0,100%_20px,100%_100%,0_100%)]';
const HEADING = 'font-display text-[24px] leading-[1.1] font-extrabold tracking-[-0.02em] text-chalk mt-3 m-0';
const BTN = 'inline-block mt-6 h-[42px] px-6 bg-gold rounded-lg font-display text-[13px] leading-[42px] font-bold text-gold-ink tracking-[0.02em] no-underline cursor-pointer';

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
    <div className={PAGE}>
      <div className={CARD}>
        {status === 'loading' && (
          <div className="text-center">
            <div className="w-9 h-9 rounded-full border-[3px] border-line border-t-gold animate-spin mx-auto"/>
            <p className="text-mute mt-4">Đang xác minh email…</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-[52px] h-[52px] rounded-[12px] bg-[linear-gradient(135deg,#D4AF37,#8E7321)] flex items-center justify-center mx-auto font-display text-[22px] leading-none font-extrabold text-gold-ink">✓</div>
            <h1 className={HEADING}>Email đã xác minh!</h1>
            <p className="text-mute mt-2 text-[14px] leading-[1.6]">Tài khoản của bạn đã được kích hoạt. Bạn có thể đăng nhập.</p>
            <Link href="/auth/login" className={BTN}>Đăng nhập</Link>
          </div>
        )}

        {status === 'expired' && (
          <div className="text-center">
            <div className="w-[52px] h-[52px] rounded-[12px] bg-[rgba(212,175,55,0.15)] border border-[rgba(212,175,55,0.3)] flex items-center justify-center mx-auto font-display text-[22px] leading-none font-extrabold text-gold">!</div>
            <h1 className={HEADING}>Liên kết đã hết hạn</h1>
            <p className="text-mute mt-2 text-[14px] leading-[1.6]">
              Liên kết xác minh này đã hết hạn hoặc đã được sử dụng.
            </p>
            <Link href="/auth/login" className={BTN}>Quay lại đăng nhập</Link>
          </div>
        )}

        {status === 'invalid' && (
          <div className="text-center">
            <div className="w-[52px] h-[52px] rounded-[12px] bg-[rgba(229,72,77,0.12)] border border-[rgba(229,72,77,0.3)] flex items-center justify-center mx-auto font-display text-[22px] leading-none font-extrabold text-down">×</div>
            <h1 className={HEADING}>Liên kết không hợp lệ</h1>
            <p className="text-mute mt-2 text-[14px]">Liên kết xác minh này bị thiếu hoặc không hợp lệ.</p>
            <Link href="/auth/login" className={BTN}>Quay lại đăng nhập</Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className={PAGE}>
        <div className={CARD}>
          <div className="text-center">
            <div className="w-9 h-9 rounded-full border-[3px] border-line border-t-gold animate-spin mx-auto"/>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
