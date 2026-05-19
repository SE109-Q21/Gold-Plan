'use client';

import { useAdminAnomalies, useReviewAnomaly } from '@/lib/admin.api';

// ─── Review Status Badge ──────────────────────────────────────────────────────

function ReviewBadge({ review }: { review: { action: string } | null }) {
  if (!review) {
    return (
      <span style={{
        display: 'inline-block',
        padding: '3px 8px',
        borderRadius: 4,
        font: '700 9px/1 var(--font-mono)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        background: 'rgba(100,100,120,0.18)',
        color: 'var(--mute)',
        border: '1px solid var(--line)',
      }}>
        pending
      </span>
    );
  }

  const isApproved = review.action === 'approved';
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 8px',
      borderRadius: 4,
      font: '700 9px/1 var(--font-mono)',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      background: isApproved ? 'rgba(88,200,150,0.12)' : 'rgba(200,80,80,0.12)',
      color: isApproved ? 'var(--up)' : 'var(--down)',
      border: `1px solid ${isApproved ? 'rgba(88,200,150,0.3)' : 'rgba(200,80,80,0.3)'}`,
    }}>
      {review.action}
    </span>
  );
}

// ─── Format price ─────────────────────────────────────────────────────────────

function fmtPrice(raw: string): string {
  const n = parseFloat(raw);
  if (isNaN(n)) return raw;
  return (n / 1_000_000).toFixed(2) + 'M₫';
}

// ─── Anomalies Page ───────────────────────────────────────────────────────────

export default function AdminAnomaliesPage() {
  const { data: anomalies, isLoading, isError } = useAdminAnomalies();
  const { mutate: review, isPending: isReviewing } = useReviewAnomaly();

  return (
    <div style={{ padding: '32px 36px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          font: '800 28px/1 var(--font-display)',
          margin: '0 0 6px',
          letterSpacing: '-0.02em',
        }}>
          Anomalies
        </h1>
        <div style={{ font: '500 12px/1 var(--font-mono)', color: 'var(--mute)' }}>
          Flagged price records requiring manual review
        </div>
      </div>

      {/* Table card */}
      <div style={{
        background: 'var(--ink-2)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {isLoading && (
          <div style={{ padding: '24px', font: '500 13px/1 var(--font-mono)', color: 'var(--mute)' }}>
            Loading…
          </div>
        )}

        {isError && (
          <div style={{ padding: '24px', font: '500 13px/1 var(--font-mono)', color: 'var(--down)' }}>
            Failed to load anomalies.
          </div>
        )}

        {!isLoading && !isError && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--ink-3)' }}>
                {['Brand', 'Gold Type', 'Buy Price', 'Sell Price', 'Date', 'Reason', 'Review Status', 'Actions'].map(col => (
                  <th key={col} style={{
                    textAlign: 'left',
                    padding: '10px 16px',
                    font: '700 10px/1 var(--font-mono)',
                    color: 'var(--mute)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(anomalies ?? []).length === 0 ? (
                <tr>
                  <td colSpan={8} style={{
                    padding: '24px 16px',
                    font: '500 13px/1 var(--font-mono)',
                    color: 'var(--mute)',
                    textAlign: 'center',
                  }}>
                    No anomalies found.
                  </td>
                </tr>
              ) : (anomalies ?? []).map(record => (
                <tr key={record.id} style={{ borderTop: '1px solid var(--hairline)' }}>
                  <td style={{ padding: '14px 16px', font: '700 11px/1 var(--font-mono)', color: 'var(--gold)', letterSpacing: '0.06em' }}>
                    {record.brand}
                  </td>
                  <td style={{ padding: '14px 16px', font: '500 12px/1 var(--font-mono)', color: 'var(--bone)' }}>
                    {record.goldType}
                  </td>
                  <td style={{ padding: '14px 16px', font: '700 13px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtPrice(record.buyPrice)}
                  </td>
                  <td style={{ padding: '14px 16px', font: '700 13px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtPrice(record.sellPrice)}
                  </td>
                  <td style={{ padding: '14px 16px', font: '500 12px/1 var(--font-mono)', color: 'var(--mute)', whiteSpace: 'nowrap' }}>
                    {new Date(record.recordedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                  </td>
                  <td style={{ padding: '14px 16px', maxWidth: 200 }}>
                    <span
                      title={record.anomalyReason ?? undefined}
                      style={{
                        font: '400 11px/1.4 var(--font-mono)',
                        color: 'var(--mute)',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 180,
                      }}
                    >
                      {record.anomalyReason ?? '—'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <ReviewBadge review={record.anomalyReview} />
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {!record.anomalyReview ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => review({ id: record.id, action: 'approved' })}
                          disabled={isReviewing}
                          style={{
                            padding: '6px 10px',
                            background: 'transparent',
                            border: '1px solid var(--up)',
                            borderRadius: 6,
                            cursor: isReviewing ? 'not-allowed' : 'pointer',
                            font: '700 9px/1 var(--font-mono)',
                            color: 'var(--up)',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            opacity: isReviewing ? 0.5 : 1,
                          }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => review({ id: record.id, action: 'rejected' })}
                          disabled={isReviewing}
                          style={{
                            padding: '6px 10px',
                            background: 'transparent',
                            border: '1px solid var(--down)',
                            borderRadius: 6,
                            cursor: isReviewing ? 'not-allowed' : 'pointer',
                            font: '700 9px/1 var(--font-mono)',
                            color: 'var(--down)',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            opacity: isReviewing ? 0.5 : 1,
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ font: '500 11px/1 var(--font-mono)', color: 'var(--mute)' }}>
                        Reviewed
                      </span>
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
