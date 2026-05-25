'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDigestArchive } from '@/lib/digest.api';
import type { DigestDto } from '@gpls/shared';
import { cn } from '@/lib/utils';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
}

function fmtVnd(n: number) {
  return n.toLocaleString('en-US') + '₫';
}

function PctBadge({ pct }: { pct: number }) {
  const isUp = pct >= 0;
  return (
    <span className={cn(
      'font-mono text-[11px] leading-none font-bold tracking-[0.06em] px-2 py-[3px] rounded border',
      isUp
        ? 'text-up bg-[rgba(88,200,150,0.12)] border-[rgba(88,200,150,0.3)]'
        : 'text-down bg-[rgba(229,72,77,0.12)] border-[rgba(229,72,77,0.3)]',
    )}>
      {isUp ? '+' : ''}{pct.toFixed(2)}%
    </span>
  );
}

function DigestCard({ item }: { item: DigestDto }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      onClick={() => setExpanded(p => !p)}
      className="bg-ink-2 border border-line hover:border-mute rounded-lg p-[16px_20px] mb-2 cursor-pointer transition-[border-color] duration-[120ms]"
    >
      {/* Header row */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-display text-[15px] leading-none font-bold text-chalk flex-[1_1_auto]">
          {fmtDate(item.date)}
        </span>
        <PctBadge pct={item.pctChangeSjc} />
        <span className="font-display text-[14px] leading-none font-bold text-chalk [font-variant-numeric:tabular-nums]">
          {fmtVnd(item.sjcBuyVnd)}
        </span>
        <span className={cn('font-mono text-[14px] leading-none font-bold ml-1', expanded ? 'text-gold' : 'text-mute')}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div onClick={e => e.stopPropagation()} className="mt-4 flex flex-col gap-[14px]">
          {/* Price grid */}
          <div className="grid grid-cols-3 gap-[10px]">
            {[
              { lbl: 'SJC Buy',  val: fmtVnd(item.sjcBuyVnd)  },
              { lbl: 'SJC Sell', val: fmtVnd(item.sjcSellVnd) },
              { lbl: 'XAU/USD',  val: `$${item.xauUsd.toFixed(2)}` },
            ].map(cell => (
              <div key={cell.lbl} className="bg-ink-3 rounded-md p-[10px_12px] border border-hairline">
                <div className="font-mono text-[9px] leading-none font-bold tracking-[0.14em] uppercase text-mute mb-[6px]">
                  {cell.lbl}
                </div>
                <div className="font-display text-[15px] leading-none font-bold text-chalk [font-variant-numeric:tabular-nums]">
                  {cell.val}
                </div>
              </div>
            ))}
          </div>

          {/* Highlight */}
          {item.highlight && (
            <div className="bg-[rgba(212,175,55,0.07)] border border-[rgba(212,175,55,0.2)] rounded-md p-[10px_14px]">
              <div className="font-mono text-[9px] leading-none font-bold tracking-[0.14em] uppercase text-gold mb-[6px]">Highlight</div>
              <div className="font-sans text-[13px] leading-[1.5] font-medium text-chalk">{item.highlight}</div>
            </div>
          )}

          {/* AI Analysis */}
          {item.aiSummary && (
            <div className="bg-ink-3 border border-line rounded-md p-[10px_14px]">
              <div className="font-mono text-[9px] leading-none font-bold tracking-[0.14em] uppercase text-mute mb-[6px]">AI Analysis</div>
              <div className="font-sans text-[13px] leading-[1.6] text-bone">{item.aiSummary}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-ink-2 border border-line rounded-lg p-[16px_20px] mb-2">
      <div className="flex items-center gap-3">
        <div className="h-[15px] w-[180px] rounded bg-ink-3 animate-pulse"/>
        <div className="h-5 w-[60px] rounded bg-ink-3 animate-pulse"/>
        <div className="h-[14px] w-[100px] rounded bg-ink-3 animate-pulse ml-auto"/>
      </div>
    </div>
  );
}

function PaginationBtn({ disabled, onClick, children }: {
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'h-[34px] px-4 rounded-lg font-mono text-[11px] leading-none font-bold tracking-[0.1em] uppercase border transition-opacity',
        disabled
          ? 'bg-ink-3 border-hairline text-mute cursor-default opacity-50'
          : 'bg-ink-2 border-line text-chalk cursor-pointer',
      )}
    >
      {children}
    </button>
  );
}

function DigestArchiveContent() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useDigestArchive(page);

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div className="bg-ink min-h-screen text-chalk">
      <div className="p-[32px_40px] max-w-[860px] mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="bg-transparent border-0 cursor-pointer text-mute font-sans text-[13px] leading-none font-medium inline-flex items-center gap-[6px] pb-6"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          back
        </button>

        {/* Header */}
        <div className="mb-7">
          <h1 className="font-display text-[36px] leading-none font-extrabold m-0 mb-[10px] tracking-[-0.025em]">
            Digest Archive
          </h1>
          <p className="font-sans text-[14px] leading-[1.5] text-mute m-0">
            Morning gold market digests, weekdays at 7:30 AM ICT
          </p>
        </div>

        {isLoading && [0, 1, 2, 3, 4].map(i => <SkeletonCard key={i}/>)}

        {!isLoading && items.length === 0 && (
          <div className="py-16 text-center font-sans text-[15px] leading-[1.5] text-mute">
            No digests available yet.
          </div>
        )}

        {!isLoading && items.map(item => <DigestCard key={item.id} item={item}/>)}

        {/* Pagination */}
        {!isLoading && total > 0 && (
          <div className="flex items-center justify-between mt-6">
            <PaginationBtn disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>← Prev</PaginationBtn>
            <span className="font-sans text-[13px] leading-none text-mute">Page {page} of {totalPages}</span>
            <PaginationBtn disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next →</PaginationBtn>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DigestArchivePage() {
  return <DigestArchiveContent />;
}
