'use client';

import { useState } from 'react';
import { useAlerts, useToggleAlert, useDeleteAlert, useAlertHistory } from '@/lib/alerts.api';
import { useSmartAlerts, useCreateSmartAlert, useToggleSmartAlert, useDeleteSmartAlert } from '@/lib/smart-alerts.api';
import type { PriceAlertDto, SmartAlertDto, CreateSmartAlertDto, SmartAlertCondition } from '@gpls/shared';

type TabId = 'rules' | 'history' | 'smart';

// ─── Confirm delete modal ──────────────────────────────────────────────────────

function ConfirmDeleteModal({ message, onConfirm, onClose }: {
  message: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(11,11,15,0.80)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 380,
        background: 'var(--ink-2)', border: '1px solid var(--line)',
        borderRadius: 14, padding: '28px 28px 24px',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {/* Icon + title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: 'rgba(229,72,77,0.12)', border: '1px solid rgba(229,72,77,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--down)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/>
            </svg>
          </div>
          <div>
            <div style={{ font: '700 16px/1 var(--font-display)', color: 'var(--chalk)', marginBottom: 6 }}>
              Xóa alert
            </div>
            <div style={{ font: '400 13px/1.5 var(--font-display)', color: 'var(--mute)' }}>
              {message}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              height: 36, padding: '0 16px',
              background: 'var(--ink-3)', border: '1px solid var(--line)',
              borderRadius: 8, cursor: 'pointer',
              font: '700 12px/1 var(--font-mono)', letterSpacing: '0.04em',
              color: 'var(--bone)',
            }}
          >
            Hủy
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            style={{
              height: 36, padding: '0 16px',
              background: 'rgba(229,72,77,0.15)', border: '1px solid rgba(229,72,77,0.4)',
              borderRadius: 8, cursor: 'pointer',
              font: '700 12px/1 var(--font-mono)', letterSpacing: '0.04em',
              color: 'var(--down)',
            }}
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

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

// ─── Natural language preview ──────────────────────────────────────────────────

function buildNaturalLanguage(
  brand: string,
  cond: SmartAlertCondition | null,
): string {
  if (!cond) return '';
  const b = brand || 'SJC';
  if (cond.type === 'TREND') {
    const p = cond.params as { n?: number; direction?: string };
    const n = p.n ?? 3;
    const dir = p.direction ?? 'up';
    return dir === 'up'
      ? `${b} tăng giá ${n} lần liên tiếp`
      : `${b} giảm giá ${n} lần liên tiếp`;
  }
  if (cond.type === 'SPREAD') {
    const p = cond.params as { thresholdVnd?: number };
    const t = p.thresholdVnd ?? 0;
    return `${b} chênh lệch mua/bán ≤ ${t.toLocaleString('en-US')}₫`;
  }
  if (cond.type === 'THRESHOLD') {
    const p = cond.params as { condition?: string; priceVnd?: number };
    const dir = p.condition === 'gte' ? '≥' : '≤';
    const price = p.priceVnd ?? 0;
    return `${b} mua ${dir} ${price.toLocaleString('en-US')}₫`;
  }
  return '';
}

function buildFullPreview(
  brand: string,
  cond1: SmartAlertCondition | null,
  cond2: SmartAlertCondition | null,
): string {
  const s1 = buildNaturalLanguage(brand, cond1);
  const s2 = buildNaturalLanguage(brand, cond2);
  if (!s1) return '';
  if (s2) return `${s1} VÀ ${s2}`;
  return s1;
}

// ─── Condition builder sub-form ────────────────────────────────────────────────

type ConditionDraft = {
  type: 'TREND' | 'SPREAD' | 'THRESHOLD';
  trendN: number;
  trendDir: 'up' | 'down';
  spreadThreshold: string;
  thresholdDir: 'lte' | 'gte';
  thresholdPrice: string;
};

const defaultCond = (): ConditionDraft => ({
  type: 'TREND',
  trendN: 3,
  trendDir: 'up',
  spreadThreshold: '',
  thresholdDir: 'lte',
  thresholdPrice: '',
});

function toSmartAlertCondition(draft: ConditionDraft): SmartAlertCondition {
  if (draft.type === 'TREND') {
    return { type: 'TREND', params: { n: draft.trendN, direction: draft.trendDir } };
  }
  if (draft.type === 'SPREAD') {
    return { type: 'SPREAD', params: { thresholdVnd: Number(draft.spreadThreshold) || 0 } };
  }
  return { type: 'THRESHOLD', params: { condition: draft.thresholdDir, priceVnd: Number(draft.thresholdPrice) || 0 } };
}

function ConditionForm({ value, onChange }: { value: ConditionDraft; onChange: (v: ConditionDraft) => void }) {
  const chipStyle = (active: boolean): React.CSSProperties => ({
    height: 28, padding: '0 12px',
    background: active ? 'var(--gold)' : 'var(--ink-3)',
    border: `1px solid ${active ? 'var(--gold)' : 'var(--line)'}`,
    borderRadius: 6, cursor: 'pointer',
    font: '700 11px/1 var(--font-mono)', letterSpacing: '0.08em',
    color: active ? '#0B0B0F' : 'var(--bone)',
  });

  const inputStyle: React.CSSProperties = {
    height: 36, padding: '0 12px',
    background: 'var(--ink-3)', border: '1px solid var(--line)',
    borderRadius: 6, color: 'var(--chalk)',
    font: '500 13px/1 var(--font-mono)', width: '100%',
    outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Type selector */}
      <div style={{ display: 'flex', gap: 6 }}>
        {(['TREND', 'SPREAD', 'THRESHOLD'] as const).map(t => (
          <button key={t} style={chipStyle(value.type === t)} onClick={() => onChange({ ...value, type: t })}>
            {t === 'TREND' ? 'Trend' : t === 'SPREAD' ? 'Spread' : 'Price Threshold'}
          </button>
        ))}
      </div>

      {/* TREND params */}
      {value.type === 'TREND' && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ font: '500 12px/1 var(--font-display)', color: 'var(--mute)' }}>N =</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[2, 3, 4, 5].map(n => (
              <button key={n} style={chipStyle(value.trendN === n)} onClick={() => onChange({ ...value, trendN: n })}>
                {n}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['up', 'down'] as const).map(d => (
              <button key={d} style={chipStyle(value.trendDir === d)} onClick={() => onChange({ ...value, trendDir: d })}>
                {d === 'up' ? '↑ Up' : '↓ Down'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SPREAD params */}
      {value.type === 'SPREAD' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ font: '500 12px/1 var(--font-display)', color: 'var(--mute)', whiteSpace: 'nowrap' }}>Threshold (VND)</span>
          <input
            type="number"
            placeholder="e.g. 200000"
            value={value.spreadThreshold}
            onChange={e => onChange({ ...value, spreadThreshold: e.target.value })}
            style={inputStyle}
          />
        </div>
      )}

      {/* THRESHOLD params */}
      {value.type === 'THRESHOLD' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {([['lte', '≤'], ['gte', '≥']] as const).map(([v, label]) => (
              <button key={v} style={chipStyle(value.thresholdDir === v)} onClick={() => onChange({ ...value, thresholdDir: v })}>
                {label}
              </button>
            ))}
          </div>
          <input
            type="number"
            placeholder="e.g. 79000000"
            value={value.thresholdPrice}
            onChange={e => onChange({ ...value, thresholdPrice: e.target.value })}
            style={inputStyle}
          />
        </div>
      )}
    </div>
  );
}

// ─── Builder modal ─────────────────────────────────────────────────────────────

const BRANDS = ['SJC', 'DOJI', 'PNJ', 'BAO_TIN'] as const;
const GOLD_TYPES = ['MIEN_SJC', 'NHAN_9999', 'VANG_24K', 'VANG_18K'] as const;

function BuilderModal({ onClose }: { onClose: () => void }) {
  const [brand, setBrand] = useState<string>('SJC');
  const [goldType, setGoldType] = useState<string>('MIEN_SJC');
  const [cond1, setCond1] = useState<ConditionDraft>(defaultCond());
  const [hasCond2, setHasCond2] = useState(false);
  const [cond2, setCond2] = useState<ConditionDraft>(defaultCond());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAlert = useCreateSmartAlert();

  const preview = buildFullPreview(
    brand,
    toSmartAlertCondition(cond1),
    hasCond2 ? toSmartAlertCondition(cond2) : null,
  );

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const dto: CreateSmartAlertDto = {
        brand,
        goldType,
        condition1: toSmartAlertCondition(cond1),
        ...(hasCond2 ? { condition2: toSmartAlertCondition(cond2) } : {}),
      };
      await createAlert.mutateAsync(dto);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create smart alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
    height: 28, padding: '0 12px',
    background: active ? 'var(--gold)' : 'var(--ink-3)',
    border: `1px solid ${active ? 'var(--gold)' : 'var(--line)'}`,
    borderRadius: 6, cursor: 'pointer',
    font: '700 11px/1 var(--font-mono)', letterSpacing: '0.08em',
    color: active ? '#0B0B0F' : 'var(--bone)',
  });

  const labelStyle: React.CSSProperties = {
    font: '700 10px/1 var(--font-mono)', letterSpacing: '0.14em',
    textTransform: 'uppercase', color: 'var(--mute)', marginBottom: 8,
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(11,11,15,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 500, maxHeight: '90vh', overflowY: 'auto',
        background: 'var(--ink-2)', border: '1px solid var(--line)',
        borderRadius: 14, padding: '24px 28px',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ font: '800 20px/1 var(--font-display)', margin: 0 }}>New Smart Alert</h2>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--mute)', font: '700 18px/1 var(--font-mono)' }}
          >
            ×
          </button>
        </div>

        {/* Brand */}
        <div>
          <div style={labelStyle}>Brand</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {BRANDS.map(b => (
              <button key={b} style={chipStyle(brand === b)} onClick={() => setBrand(b)}>{b}</button>
            ))}
          </div>
        </div>

        {/* Gold Type */}
        <div>
          <div style={labelStyle}>Gold Type</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {GOLD_TYPES.map(g => (
              <button key={g} style={chipStyle(goldType === g)} onClick={() => setGoldType(g)}>{g}</button>
            ))}
          </div>
        </div>

        {/* Condition 1 */}
        <div>
          <div style={labelStyle}>Condition 1</div>
          <ConditionForm value={cond1} onChange={setCond1} />
        </div>

        {/* AND condition 2 toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={hasCond2}
            onChange={e => setHasCond2(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--gold)' }}
          />
          <span style={{ font: '500 13px/1 var(--font-display)', color: 'var(--bone)' }}>Add condition 2 (AND)</span>
        </label>

        {/* Condition 2 */}
        {hasCond2 && (
          <div>
            <div style={labelStyle}>Condition 2</div>
            <ConditionForm value={cond2} onChange={setCond2} />
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div style={{
            background: 'var(--ink-3)', border: '1px solid var(--line)',
            borderRadius: 8, padding: '12px 16px',
          }}>
            <div style={{ font: '700 10px/1 var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mute)', marginBottom: 6 }}>Preview</div>
            <div style={{ font: '500 14px/1.4 var(--font-display)', color: 'var(--gold)' }}>{preview}</div>
          </div>
        )}

        {error && (
          <div style={{ font: '500 13px/1.4 var(--font-display)', color: 'var(--down)' }}>{error}</div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          style={{
            height: 44, background: 'var(--gold)', color: '#0B0B0F',
            border: '1px solid var(--gold)', borderRadius: 10, cursor: isSubmitting ? 'default' : 'pointer',
            font: '700 14px/1 var(--font-mono)', letterSpacing: '0.04em', textTransform: 'uppercase',
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting ? 'Creating…' : 'Create Smart Alert'}
        </button>
      </div>
    </div>
  );
}

// ─── Smart Alerts panel ────────────────────────────────────────────────────────

function SmartAlertsPanel() {
  const { data: alerts = [], isLoading } = useSmartAlerts();
  const toggleAlert = useToggleSmartAlert();
  const deleteAlert = useDeleteSmartAlert();
  const [showModal, setShowModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleToggle = (id: string) => toggleAlert.mutate(id);
  const handleDelete = (id: string) => setPendingDeleteId(id);

  const statusChip = (status: SmartAlertDto['status']): React.CSSProperties => {
    if (status === 'active') return {
      background: 'rgba(212,175,55,0.15)', color: 'var(--gold)',
      border: '1px solid rgba(212,175,55,0.4)',
    };
    if (status === 'triggered') return {
      background: 'rgba(88,200,150,0.12)', color: 'var(--up)',
      border: '1px solid rgba(88,200,150,0.4)',
    };
    return {
      background: 'var(--ink-3)', color: 'var(--mute)',
      border: '1px solid var(--line)',
    };
  };

  return (
    <>
      {showModal && <BuilderModal onClose={() => setShowModal(false)} />}
      {pendingDeleteId && (
        <ConfirmDeleteModal
          message="Bạn có chắc muốn xóa smart alert này không? Hành động này không thể hoàn tác."
          onConfirm={() => deleteAlert.mutate(pendingDeleteId)}
          onClose={() => setPendingDeleteId(null)}
        />
      )}

      <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid var(--hairline)' }}>
          <h3 style={{ font: '700 16px/1 var(--font-display)', margin: 0 }}>smart alerts</h3>
          <button
            onClick={() => setShowModal(true)}
            style={{
              height: 34, padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--gold)', color: '#0B0B0F',
              border: '1px solid var(--gold)', borderRadius: 8, cursor: 'pointer',
              font: '700 11px/1 var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase',
            }}
          >
            + New Smart Alert
          </button>
        </div>

        {/* Header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr auto auto',
          padding: '12px 22px', font: '700 10px/1 var(--font-mono)', color: 'var(--mute)',
          letterSpacing: '0.14em', textTransform: 'uppercase',
          background: 'var(--ink-3)', borderBottom: '1px solid var(--hairline)',
        }}>
          <span>description</span>
          <span style={{ marginRight: 48 }}>status</span>
          <span>actions</span>
        </div>

        {isLoading && [0, 1, 2].map(i => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr auto auto',
            padding: '16px 22px', borderTop: '1px solid var(--hairline)', alignItems: 'center', gap: 12,
          }}>
            <div style={{ height: 14, borderRadius: 4, background: 'var(--ink-3)', animation: 'pulse 1.5s ease-in-out infinite', width: '60%' }}/>
            <div style={{ height: 22, width: 60, borderRadius: 4, background: 'var(--ink-3)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
            <div style={{ height: 22, width: 80, borderRadius: 4, background: 'var(--ink-3)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
          </div>
        ))}

        {!isLoading && alerts.length === 0 && (
          <div style={{ padding: '48px 22px', textAlign: 'center', color: 'var(--mute)', font: '500 14px/1.5 var(--font-display)' }}>
            No smart alerts yet — click <span style={{ color: 'var(--gold)' }}>+ New Smart Alert</span> to get started
          </div>
        )}

        {!isLoading && alerts.map((a, i) => (
          <div
            key={a.id}
            style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto',
              padding: '14px 22px', alignItems: 'center', gap: 12,
              borderTop: i === 0 ? 'none' : '1px solid var(--hairline)',
              opacity: a.status === 'inactive' ? 0.55 : 1,
            }}
          >
            {/* Description */}
            <div style={{ font: '500 14px/1.4 var(--font-display)', color: 'var(--chalk)' }}>
              {a.naturalLanguage}
            </div>

            {/* Status chip */}
            <span style={{
              font: '700 9px/1 var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase',
              padding: '4px 8px', borderRadius: 4,
              ...statusChip(a.status),
            }}>
              {a.status}
            </span>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Toggle
                on={a.status === 'active'}
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
        ))}
      </div>
    </>
  );
}

// ─── Main AlertsPage ───────────────────────────────────────────────────────────

export function AlertsPage({ onOpenAdd }: { onOpenAdd: () => void }) {
  const [tab, setTab] = useState<TabId>('rules');
  const { data: alerts = [], isLoading } = useAlerts();
  const { data: history = [], isLoading: histLoading } = useAlertHistory();
  const toggleAlert = useToggleAlert();
  const deleteAlert = useDeleteAlert();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleToggle = (id: string) => toggleAlert.mutate(id);
  const handleDelete = (id: string) => setPendingDeleteId(id);

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
    <>
    {pendingDeleteId && (
      <ConfirmDeleteModal
        message="Bạn có chắc muốn xóa alert này không? Hành động này không thể hoàn tác."
        onConfirm={() => deleteAlert.mutate(pendingDeleteId)}
        onClose={() => setPendingDeleteId(null)}
      />
    )}
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
          { lbl: 'Active',    val: activeCount,                   gold: true  },
          { lbl: 'Triggered', val: triggeredCount,                 gold: false },
          { lbl: 'Slots',     val: `${alerts.length} / 10`,        gold: false },
          { lbl: 'Cooldown',  val: '30 min',                       gold: false },
        ].map(s => (
          <div key={s.lbl} style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 18 }}>
            <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>{s.lbl}</div>
            <div style={{ font: '800 30px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums', color: s.gold ? 'var(--gold)' : 'var(--chalk)' }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={tabStyle(tab === 'rules')}   onClick={() => setTab('rules')}>Active rules</button>
        <button style={tabStyle(tab === 'history')} onClick={() => setTab('history')}>Trigger history</button>
        <button style={tabStyle(tab === 'smart')}   onClick={() => setTab('smart')}>Smart alerts</button>
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

      {/* ── Smart Alerts tab ── */}
      {tab === 'smart' && <SmartAlertsPanel />}
    </div>
    </>
  );
}
