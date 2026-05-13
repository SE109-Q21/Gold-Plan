'use client';

import { useState } from 'react';
import { useCreateAlert } from '@/lib/alerts.api';
import type { GoldBrand, GoldType } from '@gpls/shared';

interface Props { open: boolean; onClose: () => void; }

const BRANDS: { label: string; value: GoldBrand }[] = [
  { label: 'SJC',     value: 'SJC'     },
  { label: 'DOJI',    value: 'DOJI'    },
  { label: 'PNJ',     value: 'PNJ'     },
  { label: 'BAO TIN', value: 'BAO_TIN' },
];

const GOLD_TYPES: { label: string; value: GoldType }[] = [
  { label: 'Mien SJC',  value: 'MIEN_SJC'  },
  { label: 'Nhan 9999', value: 'NHAN_9999' },
  { label: 'Vang 24K',  value: 'VANG_24K'  },
  { label: 'Vang 18K',  value: 'VANG_18K'  },
];

export function AddAlertModal({ open, onClose }: Props) {
  const [brand,      setBrand]      = useState<GoldBrand>('SJC');
  const [goldType,   setGoldType]   = useState<GoldType>('MIEN_SJC');
  const [cond,       setCond]       = useState<'gte' | 'lte'>('gte');
  const [threshold,  setThreshold]  = useState(80_000_000);
  const [repeatMode, setRepeatMode] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const createAlert = useCreateAlert();

  if (!open) return null;

  const Chip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${active ? 'var(--gold)' : 'var(--line)'}`,
        borderRadius: 0,
        background: active ? 'var(--gold)' : 'transparent',
        color: active ? '#0B0B0F' : 'var(--bone)',
        font: '700 11px/1 var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  const handleSubmit = () => {
    setError(null);
    createAlert.mutate(
      { brand, goldType, condition: cond, thresholdPrice: threshold, repeatMode },
      {
        onSuccess: () => {
          onClose();
          // reset
          setBrand('SJC'); setGoldType('MIEN_SJC'); setCond('gte');
          setThreshold(80_000_000); setRepeatMode(false);
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
          if (Array.isArray(msg)) setError(msg.join(', '));
          else setError(msg ?? 'Failed to create alert. Please try again.');
        },
      },
    );
  };

  const brandLabel    = BRANDS.find(b => b.value === brand)?.label ?? brand;
  const goldTypeLabel = GOLD_TYPES.find(g => g.value === goldType)?.label ?? goldType;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(11,11,15,0.65)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 520, background: 'var(--ink-2)', border: '1px solid var(--line)',
          borderRadius: 14, padding: 28, boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ font: '700 24px/1 var(--font-display)', margin: 0, letterSpacing: '-0.015em' }}>new price alert</h2>
          <div className="mono" style={{ fontSize: 11, color: 'var(--mute)', marginTop: 6 }}>email + push when threshold is crossed</div>
        </div>

        {/* Brand */}
        <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>brand</div>
        <div style={{ display: 'flex', gap: 0, marginBottom: 18, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)' }}>
          {BRANDS.map(b => <Chip key={b.value} label={b.label} active={brand === b.value} onClick={() => setBrand(b.value)}/>)}
        </div>

        {/* Gold type */}
        <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>gold type</div>
        <div style={{ display: 'flex', gap: 0, marginBottom: 18, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)' }}>
          {GOLD_TYPES.map(g => <Chip key={g.value} label={g.label} active={goldType === g.value} onClick={() => setGoldType(g.value)}/>)}
        </div>

        {/* Condition */}
        <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>condition</div>
        <div style={{ display: 'flex', gap: 0, marginBottom: 18, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)' }}>
          <Chip label="≥ rises above" active={cond === 'gte'} onClick={() => setCond('gte')}/>
          <Chip label="≤ drops below" active={cond === 'lte'} onClick={() => setCond('lte')}/>
        </div>

        {/* Threshold price */}
        <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>threshold price (VND)</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--ink-3)', border: '1px solid var(--line)',
          borderRadius: 10, padding: '4px 8px 4px 16px', marginBottom: 18,
        }}>
          <span style={{ font: '700 24px/1 var(--font-display)', color: 'var(--gold)' }}>₫</span>
          <input
            type="number"
            value={threshold}
            onChange={e => setThreshold(+e.target.value)}
            min={0}
            style={{
              flex: 1, height: 46, background: 'transparent', border: 0, outline: 0,
              font: '700 24px/1 var(--font-display)', color: 'var(--chalk)', fontVariantNumeric: 'tabular-nums',
            }}
          />
        </div>

        {/* Repeat */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
          <input
            id="repeatMode"
            type="checkbox"
            checked={repeatMode}
            onChange={e => setRepeatMode(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--gold)', cursor: 'pointer' }}
          />
          <label htmlFor="repeatMode" style={{ font: '500 13px/1 var(--font-display)', color: 'var(--bone)', cursor: 'pointer' }}>
            repeat (re-arm after each trigger)
          </label>
        </div>

        {/* Summary */}
        <div style={{
          padding: '12px 14px', background: 'var(--ink-3)', border: '1px solid var(--line)',
          borderRadius: 8, font: '500 11px/1.5 var(--font-mono)', color: 'var(--mute)', marginBottom: 18,
        }}>
          notify when{' '}
          <span style={{ color: 'var(--gold)' }}>
            {brandLabel} · {goldTypeLabel} {cond === 'gte' ? '≥' : '≤'} ₫{threshold.toLocaleString('en-US')}
          </span>
          . repeat: {repeatMode ? 'yes' : 'no'}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '10px 14px', background: 'rgba(229,72,77,0.12)', border: '1px solid rgba(229,72,77,0.35)',
            borderRadius: 8, font: '500 12px/1.5 var(--font-mono)', color: 'var(--down)', marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={createAlert.isPending}
            style={{
              flex: 1, height: 46, background: 'var(--ink-3)', border: '1px solid var(--line)',
              borderRadius: 10, cursor: 'pointer', font: '700 14px/1 var(--font-mono)',
              color: 'var(--chalk)', letterSpacing: '0.04em', textTransform: 'uppercase',
              opacity: createAlert.isPending ? 0.5 : 1,
            }}
          >
            cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createAlert.isPending}
            style={{
              flex: 2, height: 46,
              background: createAlert.isPending ? 'var(--ink-3)' : 'var(--gold)',
              border: `1px solid ${createAlert.isPending ? 'var(--line)' : 'var(--gold)'}`,
              borderRadius: 10, cursor: createAlert.isPending ? 'default' : 'pointer',
              font: '700 14px/1 var(--font-mono)',
              color: createAlert.isPending ? 'var(--mute)' : '#0B0B0F',
              letterSpacing: '0.04em', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {createAlert.isPending ? (
              <>
                <span style={{
                  width: 14, height: 14, border: '2px solid var(--mute)',
                  borderTopColor: 'var(--gold)', borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite', display: 'inline-block',
                }}/>
                creating…
              </>
            ) : 'create alert'}
          </button>
        </div>
      </div>
    </div>
  );
}
