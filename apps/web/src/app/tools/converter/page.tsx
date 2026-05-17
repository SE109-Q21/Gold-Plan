'use client';
import { ProtectedRoute } from '@/components/ProtectedRoute';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDomesticPrices } from '@/lib/price.api';
import { useExchangeRates } from '@/lib/exchange-rate.api';
import { calculateConversion, WEIGHT_TO_GRAMS } from '@/lib/converter.api';
import type { GoldBrand, GoldType } from '@gpls/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

type WeightUnit = 'TAEL' | 'CHI' | 'PHAN' | 'TROY_OZ' | 'GRAM' | 'KILOGRAM';
type Purity = '24K' | '22K' | '18K' | '14K';
type Brand = 'SJC' | 'DOJI';

// ─── Constants ────────────────────────────────────────────────────────────────

const WEIGHT_UNITS: { id: WeightUnit; label: string; sub: string }[] = [
  { id: 'TAEL',    label: 'TAEL',    sub: 'Lượng'   },
  { id: 'CHI',     label: 'CHI',     sub: 'Chỉ'     },
  { id: 'PHAN',    label: 'PHAN',    sub: 'Phân'    },
  { id: 'TROY_OZ', label: 'TROY_OZ', sub: 'Troy oz' },
  { id: 'GRAM',    label: 'GRAM',    sub: 'Gram'    },
  { id: 'KILOGRAM', label: 'KG',     sub: 'Kilogram'},
];

const PURITIES: Purity[] = ['24K', '22K', '18K', '14K'];

const BRANDS: { id: Brand; label: string }[] = [
  { id: 'SJC',  label: 'SJC'  },
  { id: 'DOJI', label: 'DOJI' },
];

const BRAND_GOLD_TYPE: Record<Brand, GoldType> = {
  SJC:  'MIEN_SJC',
  DOJI: 'NHAN_9999',
};

const UNIT_DISPLAY: Record<WeightUnit, string> = {
  TAEL:     'Tael',
  CHI:      'Chi',
  PHAN:     'Phân',
  TROY_OZ:  'Troy oz',
  GRAM:     'Gram',
  KILOGRAM: 'Kg',
};

// ─── Chip button ──────────────────────────────────────────────────────────────

function Chip({
  label,
  sub,
  selected,
  onClick,
}: {
  label: string;
  sub?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1px solid ${selected ? 'var(--gold)' : 'var(--line)'}`,
        background: selected ? 'rgba(212,175,55,0.12)' : 'transparent',
        color: selected ? 'var(--gold)' : 'var(--bone)',
        font: '700 12px/1 var(--font-mono)',
        letterSpacing: '0.08em',
        padding: sub ? '8px 16px 10px' : '8px 16px',
        borderRadius: 6,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        transition: 'border-color 140ms, background 140ms, color 140ms',
      }}
    >
      <span>{label}</span>
      {sub && (
        <span style={{ font: '400 9px/1 var(--font-mono)', letterSpacing: '0.06em', opacity: 0.65 }}>
          {sub}
        </span>
      )}
    </button>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      font: '700 9px/1 var(--font-mono)',
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--mute)',
      marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ w, h }: { w: number | string; h: number }) {
  return (
    <div style={{
      width: w,
      height: h,
      borderRadius: 4,
      background: 'linear-gradient(90deg, var(--ink-3) 25%, rgba(212,175,55,0.06) 50%, var(--ink-3) 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-shimmer 1.4s infinite',
    }}/>
  );
}

// ─── Copy button with "Copied!" feedback ─────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      style={{
        background: 'transparent',
        border: `1px solid ${copied ? 'var(--gold)' : 'var(--line)'}`,
        borderRadius: 4,
        padding: '4px 10px',
        cursor: 'pointer',
        font: '700 10px/1 var(--font-mono)',
        color: copied ? 'var(--up)' : 'var(--gold)',
        letterSpacing: '0.08em',
        transition: 'color 140ms, border-color 140ms',
        flexShrink: 0,
      }}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

// ─── Back arrow ───────────────────────────────────────────────────────────────

function IconArrowLeft({ s = 16 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
    </svg>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function ConverterContent() {
  const router = useRouter();

  // Controls state
  const [unit, setUnit] = useState<WeightUnit>('TAEL');
  const [qtyStr, setQtyStr] = useState('1');
  const [purity, setPurity] = useState<Purity>('24K');
  const [brand, setBrand] = useState<Brand>('SJC');

  const goldType = BRAND_GOLD_TYPE[brand];
  const qty = parseFloat(qtyStr) || 0;

  // Data
  const { data: prices, isLoading: pricesLoading } = useDomesticPrices(brand as GoldBrand);
  const { data: rates, isLoading: ratesLoading } = useExchangeRates();

  const isLoading = pricesLoading || ratesLoading;

  // Find matching price entry
  const priceEntry = useMemo(() => {
    if (!prices) return null;
    return prices.find(p => p.goldType === goldType) ?? null;
  }, [prices, goldType]);

  const pricePerTaelVnd = priceEntry?.buyPrice ?? 0;

  // Calculate result
  const result = useMemo(() => {
    if (!rates || pricePerTaelVnd === 0 || qty <= 0) return null;
    return calculateConversion(unit, qty, purity, pricePerTaelVnd, rates);
  }, [unit, qty, purity, pricePerTaelVnd, rates]);

  // Format helpers
  const fmtVnd = (v: number) => v.toLocaleString('vi-VN') + ' ₫';
  const fmtUsd = (v: number) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtEur = (v: number) => '€' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Time string for copy
  const timeStr = useMemo(() => {
    const d = priceEntry ? new Date(priceEntry.recordedAt) : new Date();
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }, [priceEntry]);

  const copyText = useCallback((currency: 'VND' | 'USD' | 'EUR') => {
    if (!result) return '';
    const unitLabel = UNIT_DISPLAY[unit];
    const valMap = {
      VND: fmtVnd(result.valuations.VND),
      USD: fmtUsd(result.valuations.USD),
      EUR: fmtEur(result.valuations.EUR),
    };
    return `${qty} ${unitLabel} ${purity} = ${valMap[currency]} (${brand} at ${timeStr})`;
  }, [result, unit, qty, purity, brand, timeStr]); // eslint-disable-line react-hooks/exhaustive-deps

  // Result rows
  const resultRows: { id: 'VND' | 'USD' | 'EUR'; label: string; value: string; skeleton: boolean }[] = [
    {
      id: 'VND',
      label: 'VND',
      value: result ? fmtVnd(result.valuations.VND) : '—',
      skeleton: isLoading,
    },
    {
      id: 'USD',
      label: 'USD',
      value: result ? fmtUsd(result.valuations.USD) : '—',
      skeleton: isLoading,
    },
    {
      id: 'EUR',
      label: 'EUR',
      value: result ? fmtEur(result.valuations.EUR) : '—',
      skeleton: isLoading,
    },
  ];

  const weightInGrams = qty * (WEIGHT_TO_GRAMS[unit] ?? 1);
  const weightInTael = weightInGrams / 37.5;

  return (
    <>
      {/* Skeleton shimmer animation */}
      <style>{`
        @keyframes skeleton-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div style={{
        minHeight: '100%',
        background: '#0a0a0d',
        padding: '32px 24px 60px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {/* Inner container */}
        <div style={{ width: '100%', maxWidth: 800 }}>

          {/* Back button */}
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              color: 'var(--mute)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              font: '600 12px/1 var(--font-mono)',
              letterSpacing: '0.08em',
              padding: '0 0 24px',
            }}
          >
            <IconArrowLeft s={14}/> back to dashboard
          </button>

          {/* Page header */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{
              font: '800 40px/1 var(--font-display)',
              letterSpacing: '-0.03em',
              color: 'var(--chalk)',
              margin: 0,
            }}>
              gold converter
            </h1>
            <p style={{
              font: '400 14px/1.5 var(--font-display)',
              color: 'var(--mute)',
              margin: '8px 0 0',
            }}>
              Real-time conversion across units, purities, and currencies
            </p>
          </div>

          {/* Controls card */}
          <div style={{
            background: 'var(--ink-2)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            padding: '24px 28px',
          }}>

            {/* Weight unit */}
            <div style={{ marginBottom: 24 }}>
              <SectionLabel>Weight unit</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {WEIGHT_UNITS.map(u => (
                  <Chip
                    key={u.id}
                    label={u.label}
                    sub={u.sub}
                    selected={unit === u.id}
                    onClick={() => setUnit(u.id)}
                  />
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div style={{ marginBottom: 24 }}>
              <SectionLabel>Quantity</SectionLabel>
              <input
                type="number"
                min="0"
                step="any"
                value={qtyStr}
                onChange={e => setQtyStr(e.target.value)}
                style={{
                  background: 'var(--ink-3)',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  color: 'var(--chalk)',
                  font: '700 28px/1 var(--font-display)',
                  padding: '12px 16px',
                  width: '160px',
                  textAlign: 'right',
                  outline: 'none',
                }}
              />
            </div>

            {/* Purity */}
            <div style={{ marginBottom: 24 }}>
              <SectionLabel>Purity</SectionLabel>
              <div style={{ display: 'flex', gap: 8 }}>
                {PURITIES.map(p => (
                  <Chip
                    key={p}
                    label={p}
                    selected={purity === p}
                    onClick={() => setPurity(p)}
                  />
                ))}
              </div>
            </div>

            {/* Brand + Gold type */}
            <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
              <div>
                <SectionLabel>Brand (price reference)</SectionLabel>
                <div style={{ display: 'flex', gap: 8 }}>
                  {BRANDS.map(b => (
                    <Chip
                      key={b.id}
                      label={b.label}
                      selected={brand === b.id}
                      onClick={() => setBrand(b.id)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <SectionLabel>Gold type</SectionLabel>
                <div style={{
                  border: '1px solid var(--line)',
                  background: 'var(--ink-3)',
                  color: 'var(--mute)',
                  font: '700 12px/1 var(--font-mono)',
                  letterSpacing: '0.08em',
                  padding: '8px 16px',
                  borderRadius: 6,
                  alignSelf: 'flex-start',
                }}>
                  {goldType}
                </div>
              </div>
            </div>
          </div>

          {/* Arrow divider */}
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--gold)', opacity: 0.5 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 16l7 7 7-7"/>
            </svg>
          </div>

          {/* Results card */}
          <div style={{
            background: 'var(--ink-2)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            padding: '24px 28px',
          }}>
            <SectionLabel>Conversion results</SectionLabel>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {resultRows.map((row, idx) => (
                <div
                  key={row.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                    padding: '18px 0',
                    borderBottom: idx < resultRows.length - 1 ? '1px solid var(--line)' : 'none',
                  }}
                >
                  {/* Currency label */}
                  <div style={{
                    width: 48,
                    flexShrink: 0,
                    font: '700 11px/1 var(--font-mono)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--mute)',
                  }}>
                    {row.label}
                  </div>

                  {/* Value */}
                  <div style={{ flex: 1 }}>
                    {row.skeleton ? (
                      <Skeleton w={220} h={32}/>
                    ) : (
                      <div style={{
                        font: '800 32px/1 var(--font-display)',
                        fontVariantNumeric: 'tabular-nums',
                        color: 'var(--chalk)',
                        letterSpacing: '-0.02em',
                      }}>
                        {row.value}
                      </div>
                    )}
                  </div>

                  {/* Copy button */}
                  {!row.skeleton && result && (
                    <CopyButton text={copyText(row.id)}/>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Weight info section */}
          <div style={{
            marginTop: 20,
            padding: '16px 20px',
            background: 'rgba(212,175,55,0.04)',
            border: '1px solid rgba(212,175,55,0.12)',
            borderRadius: 10,
          }}>
            <SectionLabel>Weight & rate details</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 32px' }}>
              <InfoItem label="Weight (g)" value={`${weightInGrams.toFixed(2)} g`} loading={false}/>
              <InfoItem label="Weight (tael)" value={`${weightInTael.toFixed(3)} lượng`} loading={false}/>
              <InfoItem
                label="Price used"
                value={isLoading ? '—' : pricePerTaelVnd > 0 ? `${pricePerTaelVnd.toLocaleString('vi-VN')} ₫/tael (${brand} · ${goldType})` : 'No price data'}
                loading={isLoading}
              />
              <InfoItem
                label="Rates used"
                value={
                  ratesLoading || !rates
                    ? '—'
                    : `1 USD = ${rates.usdVnd.toLocaleString('vi-VN')} ₫ · 1 EUR = ${rates.eurVnd.toLocaleString('vi-VN')} ₫`
                }
                loading={ratesLoading}
              />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

function InfoItem({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div>
      <div style={{ font: '600 9px/1 var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mute)', marginBottom: 4 }}>
        {label}
      </div>
      {loading ? (
        <Skeleton w={120} h={14}/>
      ) : (
        <div style={{ font: '600 12px/1.4 var(--font-mono)', color: 'var(--bone)', fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </div>
      )}
    </div>
  );
}

export default function ConverterPage() {
  return <ProtectedRoute><ConverterContent /></ProtectedRoute>;
}
