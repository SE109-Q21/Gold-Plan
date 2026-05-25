'use client';

import { useState } from 'react';
import { useCreateAlert } from '@/lib/alerts.api';
import { cn } from '@/lib/utils';
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

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 h-9 inline-flex items-center justify-center border cursor-pointer',
        'font-mono text-[11px] leading-none font-bold tracking-[0.1em] uppercase rounded-none',
        active ? 'bg-gold border-gold text-gold-ink' : 'bg-transparent border-line text-bone',
      )}
    >
      {label}
    </button>
  );
}

export function AddAlertModal({ open, onClose }: Props) {
  const [brand,      setBrand]      = useState<GoldBrand>('SJC');
  const [goldType,   setGoldType]   = useState<GoldType>('MIEN_SJC');
  const [cond,       setCond]       = useState<'gte' | 'lte'>('gte');
  const [threshold,  setThreshold]  = useState(80_000_000);
  const [repeatMode, setRepeatMode] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const createAlert = useCreateAlert();

  if (!open) return null;

  const handleSubmit = () => {
    setError(null);
    createAlert.mutate(
      { brand, goldType, condition: cond, thresholdPrice: threshold, repeatMode },
      {
        onSuccess: () => {
          onClose();
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
      className="fixed inset-0 z-[100] bg-[rgba(11,11,15,0.65)] backdrop-blur-[6px] flex items-center justify-center"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-[520px] bg-ink-2 border border-line rounded-[14px] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
      >
        <div className="mb-5">
          <h2 className="font-display text-[24px] leading-none font-bold m-0 tracking-[-0.015em]">new price alert</h2>
          <div className="font-mono text-[11px] text-mute mt-[6px]">email + push when threshold is crossed</div>
        </div>

        {/* Brand */}
        <div className="font-mono text-[9px] text-mute tracking-[0.14em] uppercase mb-2">brand</div>
        <div className="flex mb-[18px] rounded-lg overflow-hidden border border-line">
          {BRANDS.map(b => <Chip key={b.value} label={b.label} active={brand === b.value} onClick={() => setBrand(b.value)}/>)}
        </div>

        {/* Gold type */}
        <div className="font-mono text-[9px] text-mute tracking-[0.14em] uppercase mb-2">gold type</div>
        <div className="flex mb-[18px] rounded-lg overflow-hidden border border-line">
          {GOLD_TYPES.map(g => <Chip key={g.value} label={g.label} active={goldType === g.value} onClick={() => setGoldType(g.value)}/>)}
        </div>

        {/* Condition */}
        <div className="font-mono text-[9px] text-mute tracking-[0.14em] uppercase mb-2">condition</div>
        <div className="flex mb-[18px] rounded-lg overflow-hidden border border-line">
          <Chip label="≥ rises above" active={cond === 'gte'} onClick={() => setCond('gte')}/>
          <Chip label="≤ drops below" active={cond === 'lte'} onClick={() => setCond('lte')}/>
        </div>

        {/* Threshold price */}
        <div className="font-mono text-[9px] text-mute tracking-[0.14em] uppercase mb-2">threshold price (VND)</div>
        <div className="flex items-center gap-[10px] bg-ink-3 border border-line rounded-[10px] py-1 px-2 pl-4 mb-[18px]">
          <span className="font-display text-[24px] leading-none font-bold text-gold">₫</span>
          <input
            type="number"
            value={threshold}
            onChange={e => setThreshold(+e.target.value)}
            min={0}
            className="flex-1 h-[46px] bg-transparent border-0 outline-none font-display text-[24px] leading-none font-bold text-chalk [font-variant-numeric:tabular-nums]"
          />
        </div>

        {/* Repeat */}
        <div className="flex items-center gap-[10px] mb-[22px]">
          <input
            id="repeatMode"
            type="checkbox"
            checked={repeatMode}
            onChange={e => setRepeatMode(e.target.checked)}
            className="w-4 h-4 cursor-pointer [accent-color:var(--gold)]"
          />
          <label htmlFor="repeatMode" className="font-sans text-[13px] leading-none font-medium text-bone cursor-pointer">
            repeat (re-arm after each trigger)
          </label>
        </div>

        {/* Summary */}
        <div className="p-[12px_14px] bg-ink-3 border border-line rounded-lg font-mono text-[11px] leading-[1.5] text-mute mb-[18px]">
          notify when{' '}
          <span className="text-gold">
            {brandLabel} · {goldTypeLabel} {cond === 'gte' ? '≥' : '≤'} ₫{threshold.toLocaleString('en-US')}
          </span>
          . repeat: {repeatMode ? 'yes' : 'no'}
        </div>

        {/* Error */}
        {error && (
          <div className="p-[10px_14px] bg-[rgba(229,72,77,0.12)] border border-[rgba(229,72,77,0.35)] rounded-lg font-mono text-[12px] leading-[1.5] text-down mb-4">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-[10px]">
          <button
            type="button"
            onClick={onClose}
            disabled={createAlert.isPending}
            className={cn(
              'flex-1 h-[46px] bg-ink-3 border border-line rounded-[10px] cursor-pointer',
              'font-mono text-[14px] leading-none font-bold text-chalk tracking-[0.04em] uppercase',
              createAlert.isPending && 'opacity-50',
            )}
          >
            cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createAlert.isPending}
            className={cn(
              'flex-[2] h-[46px] rounded-[10px] font-mono text-[14px] leading-none font-bold tracking-[0.04em] uppercase',
              'flex items-center justify-center gap-2',
              createAlert.isPending
                ? 'bg-ink-3 border border-line text-mute cursor-default'
                : 'bg-gold border border-gold text-gold-ink cursor-pointer',
            )}
          >
            {createAlert.isPending ? (
              <>
                <span className="w-[14px] h-[14px] border-2 border-mute border-t-gold rounded-full animate-spin inline-block"/>
                creating…
              </>
            ) : 'create alert'}
          </button>
        </div>
      </div>
    </div>
  );
}
