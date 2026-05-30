'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useLatestDigest } from '@/lib/digest.api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

function todayKey(): string {
  return `digest_dismissed_${new Date().toISOString().slice(0, 10)}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function isToday(iso: string): boolean {
  const ICT = 7 * 60 * 60 * 1000;
  const digestDay = new Date(new Date(iso).getTime() + ICT).toISOString().slice(0, 10);
  const todayDay  = new Date(Date.now() + ICT).toISOString().slice(0, 10);
  return digestDay === todayDay;
}

function fmtVnd(n: number): string {
  return (n / 1_000_000).toFixed(2) + 'M₫';
}

export function DigestCard() {
  const { user } = useAuth();
  const { data: digest } = useLatestDigest();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!sessionStorage.getItem(todayKey());
  });

  if (!user || !digest) return null;
  if (dismissed) return null;

  function handleDismiss() {
    sessionStorage.setItem(todayKey(), '1');
    setDismissed(true);
  }

  const isUp = digest.pctChangeSjc >= 0;
  const pctSign = isUp ? '+' : '';

  return (
    <div className="bg-ink-2 border border-line rounded-lg p-[16px_20px] mb-5">
      {/* Collapsed row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-display text-[13px] leading-none font-semibold text-chalk">
          <span>📊</span>
          <span>
            {isToday(digest.date) ? 'Bản tin hôm nay' : 'Bản tin mới nhất'}
            <span className="text-mute ml-[6px]">·</span>
            <span className="font-mono text-[11px] text-mute ml-[6px]">{fmtDate(digest.date)}</span>
          </span>
          <span className={cn(
            'font-mono text-[10px] font-bold border rounded px-[6px] py-[2px]',
            isUp
              ? 'text-up bg-[rgba(88,200,150,0.10)] border-up'
              : 'text-down bg-[rgba(229,72,77,0.10)] border-down',
          )}>
            {pctSign}{digest.pctChangeSjc.toFixed(2)}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setExpanded(e => !e)} className="px-[10px] py-1 h-auto border-line bg-transparent text-bone hover:bg-ink-3 hover:text-chalk font-mono text-[11px] font-semibold tracking-[0.04em]">
            {expanded ? '▲ thu gọn' : '▼ mở rộng'}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDismiss} aria-label="Dismiss digest" className="w-auto h-auto px-1 py-[2px] text-mute hover:bg-transparent hover:text-bone font-mono text-[14px] font-medium">
            ✕
          </Button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-hairline">
          <div className="font-display text-[15px] leading-none font-bold text-chalk mb-[14px]">
            {isToday(digest.date) ? 'Bản tin hôm nay' : 'Bản tin mới nhất'} — {fmtDate(digest.date)}
          </div>

          {/* 3-column price row */}
          <div className="grid grid-cols-3 gap-3 mb-[14px]">
            {[
              { label: 'SJC Mua',  value: fmtVnd(digest.sjcBuyVnd) },
              { label: 'SJC Bán', value: fmtVnd(digest.sjcSellVnd) },
              { label: 'XAU/USD',  value: `$${digest.xauUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-ink-3 border border-line rounded-lg p-[10px_14px]">
                <div className="font-mono text-[9px] text-mute tracking-[0.14em] uppercase mb-[6px]">{label}</div>
                <div className="font-display text-[16px] leading-none font-bold [font-variant-numeric:tabular-nums]">{value}</div>
              </div>
            ))}
          </div>

          {/* % change badge */}
          <div className="mb-3">
            <span className={cn(
              'font-mono text-[11px] font-bold border rounded px-[10px] py-1',
              isUp
                ? 'text-up bg-[rgba(88,200,150,0.10)] border-up'
                : 'text-down bg-[rgba(229,72,77,0.10)] border-down',
            )}>
              SJC {pctSign}{digest.pctChangeSjc.toFixed(2)}% so với hôm qua
            </span>
          </div>

          {/* Highlight */}
          <div className={cn(
            'font-display text-[13px] leading-[1.5] font-semibold text-chalk',
            digest.aiSummary && 'mb-[10px]',
          )}>
            {digest.highlight}
          </div>

          {/* AI Summary */}
          {digest.aiSummary && (
            <div className="italic font-display text-[12px] leading-[1.6] font-medium text-mute pt-[10px] border-t border-hairline">
              {digest.aiSummary}
            </div>
          )}

          <div className="mt-[14px] text-center">
            <Button variant="outline" onClick={() => setExpanded(false)} className="px-4 py-[5px] h-auto border-line bg-transparent text-mute hover:bg-ink-3 hover:text-bone font-mono text-[11px] font-semibold tracking-[0.04em]">
              ▲ thu gọn
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
