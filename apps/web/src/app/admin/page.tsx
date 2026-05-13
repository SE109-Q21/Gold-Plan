'use client';

import { useAdminStats } from '@/lib/admin.api';

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div style={{
      background: 'var(--ink-2)',
      border: '1px solid var(--line)',
      borderRadius: 12,
      padding: '20px 24px',
    }}>
      <div style={{
        font: '700 10px/1 var(--font-mono)',
        color: 'var(--mute)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{
        font: '800 36px/1 var(--font-display)',
        fontVariantNumeric: 'tabular-nums',
        display: 'flex',
        alignItems: 'baseline',
        gap: 4,
      }}>
        {value}
        {unit && (
          <span style={{ font: '700 14px/1 var(--font-mono)', color: 'var(--mute)' }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 8px',
      borderRadius: 4,
      font: '700 9px/1 var(--font-mono)',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      background: active ? 'rgba(88,200,150,0.12)' : 'rgba(200,80,80,0.12)',
      color: active ? 'var(--up)' : 'var(--down)',
      border: `1px solid ${active ? 'rgba(88,200,150,0.3)' : 'rgba(200,80,80,0.3)'}`,
    }}>
      {active ? 'active' : 'inactive'}
    </span>
  );
}

// ─── Overview Page ────────────────────────────────────────────────────────────

export default function AdminOverviewPage() {
  const { data: stats, isLoading, isError } = useAdminStats();

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          font: '800 28px/1 var(--font-display)',
          margin: '0 0 6px',
          letterSpacing: '-0.02em',
        }}>
          Overview
        </h1>
        <div style={{ font: '500 12px/1 var(--font-mono)', color: 'var(--mute)' }}>
          System health and key metrics
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        marginBottom: 36,
      }}>
        <StatCard
          label="Total Users"
          value={isLoading ? '—' : (stats?.totalUsers ?? '—')}
        />
        <StatCard
          label="Active Users"
          value={isLoading ? '—' : (stats?.activeUsers ?? '—')}
        />
        <StatCard
          label="Alerts Sent Today"
          value={isLoading ? '—' : (stats?.alertsSentToday ?? '—')}
        />
        <StatCard
          label="Crawl Success Rate"
          value={isLoading ? '—' : (stats?.crawlSuccessRate ?? '—')}
          unit="%"
        />
      </div>

      {/* Data Sources Table */}
      <div style={{
        background: 'var(--ink-2)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{
            font: '700 16px/1 var(--font-display)',
            margin: 0,
            letterSpacing: '-0.01em',
          }}>
            Data Sources
          </h2>
          <span style={{
            font: '700 10px/1 var(--font-mono)',
            color: 'var(--mute)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            {stats?.dataSources?.length ?? 0} sources
          </span>
        </div>

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
                {['Name', 'Brand', 'Status', 'Last Crawled', 'Latest Status'].map(col => (
                  <th key={col} style={{
                    textAlign: 'left',
                    padding: '10px 16px',
                    font: '700 10px/1 var(--font-mono)',
                    color: 'var(--mute)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(stats?.dataSources ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} style={{
                    padding: '24px 16px',
                    font: '500 13px/1 var(--font-mono)',
                    color: 'var(--mute)',
                    textAlign: 'center',
                  }}>
                    No data sources found.
                  </td>
                </tr>
              ) : (stats?.dataSources ?? []).map(ds => (
                <tr key={ds.id} style={{ borderTop: '1px solid var(--hairline)' }}>
                  <td style={{ padding: '14px 16px', font: '600 13px/1 var(--font-display)' }}>
                    {ds.name}
                  </td>
                  <td style={{ padding: '14px 16px', font: '700 11px/1 var(--font-mono)', color: 'var(--gold)', letterSpacing: '0.06em' }}>
                    {ds.brand}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <StatusBadge active={ds.isActive} />
                  </td>
                  <td style={{ padding: '14px 16px', font: '500 12px/1 var(--font-mono)', color: 'var(--mute)' }}>
                    {ds.lastCrawledAt
                      ? new Date(ds.lastCrawledAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
                      : '—'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {ds.lastStatus ? (
                      <span style={{
                        font: '700 9px/1 var(--font-mono)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: ds.lastStatus === 'completed' ? 'var(--up)' : ds.lastStatus === 'failed' ? 'var(--down)' : 'var(--gold)',
                      }}>
                        {ds.lastStatus}
                      </span>
                    ) : (
                      <span style={{ font: '500 12px/1 var(--font-mono)', color: 'var(--mute)' }}>—</span>
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
