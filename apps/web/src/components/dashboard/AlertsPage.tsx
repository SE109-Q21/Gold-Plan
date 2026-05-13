'use client';

import { useState } from 'react';
import { useAlerts, useToggleAlert, useDeleteAlert, useAlertHistory } from '@/lib/alerts.api';
import type { PriceAlertDto } from '@gpls/shared';

type TabId = 'rules' | 'history';

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      style={{
        width: 38, height: 22, padding: 2,
        background: on ? 'var(--gold)' : 'var(--ink-3)',
        border: `1px solid ${on ? 'var(--gold)' : 'var(--line)'}`,
        borderRadius: 99, cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        width: 16, height: 16, borderRadius: 99,
        background: on ? '#0B0B0F' : '#5a5b65',
        transform: on ? 'translateX(16px)' : 'translateX(0)',
        transition: 'transform 180ms var(--ease)',
      }}/>
    </button>
  );
}

function SkeletonRow() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '64px 2fr 1.4fr 1fr 100px 130px',
      padding: '16px 22px', alignItems: 'center', borderTop: '1px solid var(--hairline)',
    }}>
      {[64, 140, 90, 60, 80, 80].map((w, i) => (
        <div key={i} style={{
          height: 14, width: w, borderRadius: 4,
          background: 'var(--ink-3)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}/>
      ))}
    </div>
  );
}

function fmtTarget(a: PriceAlertDto) {
  const price = Number(a.thresholdPrice);
  return price.toLocaleString('en-US') + '₫';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.');
}

export function AlertsPage({ onOpenAdd }: { onOpenAdd: () => void }) {
  const [tab, setTab] = useState<TabId>('rules');
  const { data: alerts = [], isLoading } = useAlerts();
  const { data: history = [], isLoading: histLoading } = useAlertHistory();
  const toggleAlert = useToggleAlert();
  const deleteAlert = useDeleteAlert();

  const handleToggle = (id: string) => {
    toggleAlert.mutate(id);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Delete this alert?')) return;
    deleteAlert.mutate(id);
  };

  const activeCount = alerts.filter(a => a.status === 'active').length;
  const triggeredCount = history.length;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    height: 34, padding: '0 16px',
    background: active ? 'var(--ink-3)' : 'transparent',
    border: `1px solid ${active ? 'var(--line)' : 'transparent'}`,
    borderRadius: 8, cursor: 'pointer',
    font: '700 11px/1 var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase',
    color: active ? 'var(--chalk)' : 'var(--mute)',
  });

  return (
    <div style={{ padding: '24px 28px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ font: '800 36px/1 var(--font-display)', margin: 0, letterSpacing: '-0.025em' }}>price alerts</h1>
          <p style={{ font: '400 14px/1.5 var(--font-display)', color: 'var(--mute)', margin: '8px 0 0', maxWidth: 480 }}>
            notified when the price crosses your threshold. email within 2 min, push within 30 sec.
          </p>
        </div>
        <button
          onClick={onOpenAdd}
          style={{
            height: 44, padding: '0 18px', display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--gold)', color: '#0B0B0F',
            border: '1px solid var(--gold)', borderRadius: 10, cursor: 'pointer',
            font: '700 14px/1 var(--font-mono)', letterSpacing: '0.04em', textTransform: 'uppercase',
          }}
        >
          + new alert
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { lbl: 'active',    val: activeCount,                   gold: true  },
          { lbl: 'triggered', val: triggeredCount,                 gold: false },
          { lbl: 'slots',     val: `${alerts.length} / 10`,        gold: false },
          { lbl: 'cooldown',  val: '30 min',                       gold: false },
        ].map(s => (
          <div key={s.lbl} style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 18 }}>
            <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>{s.lbl}</div>
            <div style={{ font: '800 30px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums', color: s.gold ? 'var(--gold)' : 'var(--chalk)' }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={tabStyle(tab === 'rules')}   onClick={() => setTab('rules')}>active rules</button>
        <button style={tabStyle(tab === 'history')} onClick={() => setTab('history')}>trigger history</button>
      </div>

      {/* ── Rules tab ── */}
      {tab === 'rules' && (
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid var(--hairline)' }}>
            <h3 style={{ font: '700 16px/1 var(--font-display)', margin: 0 }}>active rules</h3>
          </div>
          {/* Header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '80px 2fr 1.4fr 1fr 110px 130px',
            padding: '12px 22px', font: '700 10px/1 var(--font-mono)', color: 'var(--mute)',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            background: 'var(--ink-3)', borderBottom: '1px solid var(--hairline)',
          }}>
            <span>brand</span>
            <span>type / condition</span>
            <span style={{ textAlign: 'right' }}>threshold</span>
            <span>repeat</span>
            <span>status</span>
            <span style={{ textAlign: 'right' }}>actions</span>
          </div>

          {isLoading && [0, 1, 2].map(i => <SkeletonRow key={i}/>)}

          {!isLoading && alerts.length === 0 && (
            <div style={{ padding: '48px 22px', textAlign: 'center', color: 'var(--mute)', font: '500 14px/1.5 var(--font-display)' }}>
              no alerts yet — click <span style={{ color: 'var(--gold)' }}>+ new alert</span> to get started
            </div>
          )}

          {!isLoading && alerts.map((a, i) => {
            const isActive = a.status === 'active';
            const isFired  = a.status === 'triggered';
            return (
              <div
                key={a.id}
                style={{
                  display: 'grid', gridTemplateColumns: '80px 2fr 1.4fr 1fr 110px 130px',
                  padding: '16px 22px', alignItems: 'center',
                  borderTop: i === 0 ? 'none' : '1px solid var(--hairline)',
                  opacity: isActive ? 1 : 0.55,
                }}
              >
                {/* Brand */}
                <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em' }}>{a.brand}</span>

                {/* Type + condition */}
                <div>
                  <div style={{ font: '500 14px/1.1 var(--font-display)', marginBottom: 4 }}>{a.goldType}</div>
                  <span className="mono" style={{
                    fontSize: 10, fontWeight: 700,
                    color: a.condition === 'gte' ? 'var(--up)' : 'var(--down)',
                    padding: '3px 6px', borderRadius: 3, letterSpacing: '0.08em', textTransform: 'uppercase',
                    background: a.condition === 'gte' ? 'rgba(88,200,150,0.10)' : 'rgba(229,72,77,0.10)',
                  }}>
                    {a.condition === 'gte' ? 'crosses ↑' : 'crosses ↓'}
                  </span>
                </div>

                {/* Target */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ font: '700 16px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{fmtTarget(a)}</div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--mute)', marginTop: 4 }}>created {fmtDate(a.createdAt)}</div>
                </div>

                {/* Repeat */}
                <span className="mono" style={{ fontSize: 11, color: 'var(--bone)' }}>· {a.repeatMode ? 'repeat' : 'once'}</span>

                {/* Status */}
                <div>
                  {isFired
                    ? <span style={{ font: '700 9px/1 var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0B0B0F', background: 'var(--gold)', padding: '4px 7px', borderRadius: 3 }}>
                        fired · {a.lastTriggeredAt ? fmtDate(a.lastTriggeredAt) : '—'}
                      </span>
                    : <span style={{
                        font: '700 9px/1 var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase',
                        color: isActive ? 'var(--live)' : 'var(--mute)',
                        border: `1px solid ${isActive ? 'rgba(157,204,110,0.4)' : 'var(--line)'}`,
                        padding: '4px 7px', borderRadius: 3,
                      }}>
                        {isActive ? 'waiting' : 'paused'}
                      </span>
                  }
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, alignItems: 'center' }}>
                  <Toggle
                    on={isActive}
                    onChange={() => handleToggle(a.id)}
                    disabled={toggleAlert.isPending}
                  />
                  <button
                    onClick={() => handleDelete(a.id)}
                    disabled={deleteAlert.isPending}
                    style={{
                      width: 28, height: 32, background: 'transparent',
                      border: '1px solid transparent', borderRadius: 6,
                      cursor: 'pointer', color: 'var(--down)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: deleteAlert.isPending ? 0.5 : 1,
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── History tab ── */}
      {tab === 'history' && (
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 0 }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--hairline)' }}>
            <h3 style={{ font: '700 16px/1 var(--font-display)', margin: 0 }}>trigger history</h3>
          </div>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1.4fr 1.4fr 1.4fr',
            padding: '12px 22px', font: '700 10px/1 var(--font-mono)', color: 'var(--mute)',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            background: 'var(--ink-3)', borderBottom: '1px solid var(--hairline)',
          }}>
            <span>alert id</span>
            <span style={{ textAlign: 'right' }}>price at trigger</span>
            <span style={{ textAlign: 'right' }}>triggered at</span>
            <span style={{ textAlign: 'right' }}>email sent</span>
          </div>

          {histLoading && [0, 1, 2].map(i => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '2fr 1.4fr 1.4fr 1.4fr',
              padding: '16px 22px', borderTop: '1px solid var(--hairline)',
            }}>
              {[120, 80, 100, 100].map((w, j) => (
                <div key={j} style={{
                  height: 14, width: w, borderRadius: 4,
                  background: 'var(--ink-3)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                  justifySelf: j === 0 ? 'start' : 'end',
                }}/>
              ))}
            </div>
          ))}

          {!histLoading && history.length === 0 && (
            <div style={{ padding: '48px 22px', textAlign: 'center', color: 'var(--mute)', font: '500 14px/1.5 var(--font-display)' }}>
              no trigger history yet
            </div>
          )}

          {!histLoading && history.map((h, i) => (
            <div
              key={h.id}
              style={{
                display: 'grid', gridTemplateColumns: '2fr 1.4fr 1.4fr 1.4fr',
                padding: '16px 22px', alignItems: 'center',
                borderTop: i === 0 ? 'none' : '1px solid var(--hairline)',
              }}
            >
              <span className="mono" style={{ fontSize: 11, color: 'var(--mute)' }}>{h.alertId.slice(0, 8)}…</span>
              <div style={{ textAlign: 'right', font: '700 14px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
                {Number(h.priceAtTrigger).toLocaleString('en-US')}₫
              </div>
              <div className="mono" style={{ textAlign: 'right', fontSize: 11, color: 'var(--bone)' }}>
                {new Date(h.triggeredAt).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="mono" style={{ textAlign: 'right', fontSize: 11 }}>
                {h.emailSentAt
                  ? <span style={{ color: 'var(--live)' }}>sent</span>
                  : <span style={{ color: 'var(--mute)' }}>pending</span>
                }
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
