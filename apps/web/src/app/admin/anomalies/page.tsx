'use client';

import { useAdminAnomalies, useReviewAnomaly } from '@/lib/admin.api';
import { cn } from '@/lib/utils';

const TH = 'text-left p-[10px_16px] font-mono text-[10px] leading-none font-bold text-mute tracking-[0.14em] uppercase whitespace-nowrap';
const TD = 'p-[14px_16px]';

function ReviewBadge({ review }: { review: { action: string } | null }) {
  if (!review) {
    return (
      <span className="inline-block px-2 py-[3px] rounded font-mono text-[9px] leading-none font-bold tracking-[0.12em] uppercase bg-[rgba(100,100,120,0.18)] text-mute border border-line">
        pending
      </span>
    );
  }
  const isApproved = review.action === 'approved';
  return (
    <span className={cn(
      'inline-block px-2 py-[3px] rounded font-mono text-[9px] leading-none font-bold tracking-[0.12em] uppercase border',
      isApproved
        ? 'bg-[rgba(88,200,150,0.12)] text-up border-[rgba(88,200,150,0.3)]'
        : 'bg-[rgba(200,80,80,0.12)] text-down border-[rgba(200,80,80,0.3)]',
    )}>
      {review.action}
    </span>
  );
}

function fmtPrice(raw: string): string {
  const n = parseFloat(raw);
  if (isNaN(n)) return raw;
  return (n / 1_000_000).toFixed(2) + 'M₫';
}

export default function AdminAnomaliesPage() {
  const { data: anomalies, isLoading, isError } = useAdminAnomalies();
  const { mutate: review, isPending: isReviewing } = useReviewAnomaly();

  return (
    <div className="p-[32px_36px]">
      <div className="mb-8">
        <h1 className="font-display text-[28px] leading-none font-extrabold m-0 mb-[6px] tracking-[-0.02em]">
          Anomalies
        </h1>
        <div className="font-mono text-[12px] leading-none text-mute">
          Flagged price records requiring manual review
        </div>
      </div>

      <div className="bg-ink-2 border border-line rounded-[12px] overflow-hidden">
        {isLoading && <div className="p-6 font-mono text-[13px] leading-none text-mute">Loading…</div>}
        {isError  && <div className="p-6 font-mono text-[13px] leading-none text-down">Failed to load anomalies.</div>}

        {!isLoading && !isError && (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-ink-3">
                {['Brand', 'Gold Type', 'Buy Price', 'Sell Price', 'Date', 'Reason', 'Review Status', 'Actions'].map(col => (
                  <th key={col} className={TH}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(anomalies ?? []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-[24px_16px] font-mono text-[13px] text-mute text-center">
                    No anomalies found.
                  </td>
                </tr>
              ) : (anomalies ?? []).map(record => (
                <tr key={record.id} className="border-t border-hairline">
                  <td className={cn(TD, 'font-mono text-[11px] leading-none font-bold text-gold tracking-[0.06em]')}>{record.brand}</td>
                  <td className={cn(TD, 'font-mono text-[12px] leading-none text-bone')}>{record.goldType}</td>
                  <td className={cn(TD, 'font-display text-[13px] leading-none font-bold [font-variant-numeric:tabular-nums]')}>{fmtPrice(record.buyPrice)}</td>
                  <td className={cn(TD, 'font-display text-[13px] leading-none font-bold [font-variant-numeric:tabular-nums]')}>{fmtPrice(record.sellPrice)}</td>
                  <td className={cn(TD, 'font-mono text-[12px] leading-none text-mute whitespace-nowrap')}>
                    {new Date(record.recordedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                  </td>
                  <td className={cn(TD, 'max-w-[200px]')}>
                    <span title={record.anomalyReason ?? undefined} className="font-mono text-[11px] leading-[1.4] text-mute block overflow-hidden text-ellipsis whitespace-nowrap max-w-[180px]">
                      {record.anomalyReason ?? '—'}
                    </span>
                  </td>
                  <td className={TD}>
                    <ReviewBadge review={record.anomalyReview}/>
                  </td>
                  <td className={TD}>
                    {!record.anomalyReview ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => review({ id: record.id, action: 'approved' })}
                          disabled={isReviewing}
                          className={cn('px-[10px] py-[6px] bg-transparent border border-up rounded-md font-mono text-[9px] leading-none font-bold tracking-[0.08em] uppercase text-up', isReviewing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer')}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => review({ id: record.id, action: 'rejected' })}
                          disabled={isReviewing}
                          className={cn('px-[10px] py-[6px] bg-transparent border border-down rounded-md font-mono text-[9px] leading-none font-bold tracking-[0.08em] uppercase text-down', isReviewing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer')}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="font-mono text-[11px] leading-none text-mute">Reviewed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
