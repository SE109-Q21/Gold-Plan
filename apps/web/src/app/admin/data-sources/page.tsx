'use client';

import { useAdminDataSources, useDisableDataSource } from '@/lib/admin.api';

// ─── Status Badge ─────────────────────────────────────────────────────────────

function EnabledBadge({ active }: { active: boolean }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 8px',
      borderRadius: 4,
      font: '700 9px/1 var(--font-mono)',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      background: active ? 'rgba(88,200,150,0.12)' : 'rgba(100,100,120,0.18)',
      color: active ? 'var(--up)' : 'var(--mute)',
      border: `1px solid ${active ? 'rgba(88,200,150,0.3)' : 'var(--line)'}`,
    }}>
      {active ? 'enabled' : 'disabled'}
    </span>
  );
}

// ─── Data Sources Page ────────────────────────────────────────────────────────

export default function AdminDataSourcesPage() {
  const { data: sources, isLoading, isError } = useAdminDataSources();
  const { mutate: disable, isPending: isDisabling } = useDisableDataSource();

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          font: '800 28px/1 var(--font-display)',
          margin: '0 0 6px',
          letterSpacing: '-0.02em',
        }}>
          Data Sources
        </h1>
        <div style={{ font: '500 12px/1 var(--font-mono)', color: 'var(--mute)' }}>
          Manage crawl sources for all gold brands
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
            Failed to load data sources.
          </div>
        )}

        {!isLoading && !isError && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--ink-3)' }}>
                {['Name', 'Brand', 'URL', 'Crawl Type', 'Freq (min)', 'Status', 'Last Crawled', 'Actions'].map(col => (
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
              {(sources ?? []).length === 0 ? (
                <tr>
                  <td colSpan={8} style={{
                    padding: '24px 16px',
                    font: '500 13px/1 var(--font-mono)',
                    color: 'var(--mute)',
                    textAlign: 'center',
                  }}>
                    No data sources found.
                  </td>
                </tr>
              ) : (sources ?? []).map(ds => (
                <tr key={ds.id} style={{ borderTop: '1px solid var(--hairline)' }}>
                  <td style={{ padding: '14px 16px', font: '600 13px/1 var(--font-display)' }}>
                    {ds.name}
                  </td>
                  <td style={{ padding: '14px 16px', font: '700 11px/1 var(--font-mono)', color: 'var(--gold)', letterSpacing: '0.06em' }}>
                    {ds.brand}
                  </td>
                  <td style={{ padding: '14px 16px', maxWidth: 200 }}>
                    <span
                      title={ds.url}
                      style={{
                        font: '400 11px/1 var(--font-mono)',
                        color: 'var(--mute)',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 180,
                      }}
                    >
                      {ds.url}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', font: '500 12px/1 var(--font-mono)', color: 'var(--bone)' }}>
                    {ds.crawlType}
                  </td>
                  <td style={{ padding: '14px 16px', font: '500 12px/1 var(--font-mono)', color: 'var(--mute)', textAlign: 'center' }}>
                    {ds.frequencyMin}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <EnabledBadge active={ds.isActive} />
                  </td>
                  <td style={{ padding: '14px 16px', font: '500 12px/1 var(--font-mono)', color: 'var(--mute)', whiteSpace: 'nowrap' }}>
                    {ds.lastCrawledAt
                      ? new Date(ds.lastCrawledAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
                      : '—'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {ds.isActive ? (
                      <button
                        onClick={() => disable(ds.id)}
                        disabled={isDisabling}
                        style={{
                          padding: '6px 12px',
                          background: 'transparent',
                          border: '1px solid var(--down)',
                          borderRadius: 6,
                          cursor: isDisabling ? 'not-allowed' : 'pointer',
                          font: '700 10px/1 var(--font-mono)',
                          color: 'var(--down)',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          opacity: isDisabling ? 0.5 : 1,
                        }}
                      >
                        Disable
                      </button>
                    ) : (
                      <span style={{
                        font: '500 11px/1 var(--font-mono)',
                        color: 'var(--mute)',
                      }}>
                        —
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
