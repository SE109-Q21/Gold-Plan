'use client';
import { ProtectedRoute } from '@/components/ProtectedRoute';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  usePortfolio,
  usePortfolioChart,
  usePortfolioAllocation,
  useTransactions,
  useAddTransaction,
  useEditTransaction,
  useDeleteTransaction,
} from '@/lib/portfolio.api';
import type { AddTransactionPayload } from '@/lib/portfolio.api';

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconArrowLeft({ s = 16 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
    </svg>
  );
}

function IconPlus({ s = 14 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  );
}

function IconTrash({ s = 14 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

function IconX({ s = 16 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  );
}

function IconPencil({ s = 14 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function fmtM(v: number): string {
  if (Math.abs(v) >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + 'B₫';
  return (v / 1_000_000).toFixed(2) + 'M₫';
}

function fmtVnd(v: number): string {
  return v.toLocaleString('vi-VN') + '₫';
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      font: '700 9px/1 var(--font-mono)',
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: 'var(--mute)',
      marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

function Skeleton({ w, h, radius = 4 }: { w: number | string; h: number; radius?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: 'linear-gradient(90deg, var(--ink-3) 25%, rgba(212,175,55,0.05) 50%, var(--ink-3) 75%)',
      backgroundSize: '200% 100%',
      animation: 'skshimmer 1.5s infinite',
    }}/>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, subLabel, color, loading,
}: {
  label: string;
  value: string;
  subLabel?: string;
  color?: string;
  loading: boolean;
}) {
  return (
    <div style={{
      background: 'var(--ink-2)',
      border: '1px solid var(--line)',
      borderRadius: 12,
      padding: '20px 22px',
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{
        font: '700 9px/1 var(--font-mono)',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--mute)',
        marginBottom: 10,
      }}>
        {label}
      </div>
      {loading ? (
        <Skeleton w={140} h={30}/>
      ) : (
        <div style={{
          font: '800 28px/1 var(--font-display)',
          letterSpacing: '-0.03em',
          color: color ?? 'var(--chalk)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {value}
        </div>
      )}
      {subLabel && !loading && (
        <div style={{
          font: '500 11px/1 var(--font-mono)',
          color: 'var(--mute)',
          marginTop: 6,
          letterSpacing: '0.04em',
        }}>
          {subLabel}
        </div>
      )}
    </div>
  );
}

// ─── P&L Chart ────────────────────────────────────────────────────────────────

function PnlChart({ data, loading }: { data: { date: string; valueVnd: number }[]; loading: boolean }) {
  const W = 600, H = 180;
  const PAD = { top: 16, right: 20, bottom: 32, left: 56 };

  const points = data.slice(-30);

  const chartData = useMemo(() => {
    if (!points.length) return null;
    const minV = Math.min(...points.map(p => p.valueVnd));
    const maxV = Math.max(...points.map(p => p.valueVnd));
    const range = maxV - minV || 1;
    const xs = points.map((_, i) => PAD.left + (i / Math.max(points.length - 1, 1)) * (W - PAD.left - PAD.right));
    const ys = points.map(p => PAD.top + (1 - (p.valueVnd - minV) / range) * (H - PAD.top - PAD.bottom));

    const linePath = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L${xs[xs.length - 1].toFixed(1)},${(H - PAD.bottom).toFixed(1)} L${PAD.left.toFixed(1)},${(H - PAD.bottom).toFixed(1)} Z`;

    const tickIdxs = [0, Math.floor(points.length * 0.25), Math.floor(points.length * 0.5), Math.floor(points.length * 0.75), points.length - 1];
    const uniqueIdxs = [...new Set(tickIdxs)].filter(i => i < points.length);

    const yTickCount = 4;
    const yTicks = Array.from({ length: yTickCount }, (_, i) => {
      const frac = i / (yTickCount - 1);
      const v = minV + frac * range;
      const y = PAD.top + (1 - frac) * (H - PAD.top - PAD.bottom);
      return { v, y };
    });

    return { linePath, areaPath, xs, ys, xTicks: uniqueIdxs, yTicks, minV, maxV };
  }, [points]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Skeleton w="100%" h={H - 20}/>
      </div>
    );
  }

  if (!chartData || !points.length) {
    return (
      <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ font: '500 13px/1 var(--font-mono)', color: 'var(--mute)', letterSpacing: '0.06em' }}>
          no history yet
        </span>
      </div>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.22"/>
          <stop offset="100%" stopColor="#60A5FA" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* Y grid lines */}
      {chartData.yTicks.map((t: { v: number; y: number }, i: number) => (
        <g key={i}>
          <line
            x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y}
            stroke="var(--line)" strokeWidth="0.5" strokeDasharray="3 3"
          />
          <text
            x={PAD.left - 6} y={t.y + 4}
            textAnchor="end"
            style={{ font: '400 9px var(--font-mono)', fill: 'var(--mute)' }}
          >
            {(t.v / 1_000_000).toFixed(1)}M
          </text>
        </g>
      ))}
      {/* Area fill */}
      <path d={chartData.areaPath} fill="url(#chartGrad)"/>
      {/* Line */}
      <path d={chartData.linePath} fill="none" stroke="#60A5FA" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round"/>
      {/* X axis ticks */}
      {chartData.xTicks.map((i: number) => {
        const d = new Date(points[i].date);
        const label = `${d.getDate()}/${d.getMonth() + 1}`;
        return (
          <text key={i} x={chartData.xs[i]} y={H - PAD.bottom + 14} textAnchor="middle"
            style={{ font: '400 9px var(--font-mono)', fill: 'var(--mute)' }}>
            {label}
          </text>
        );
      })}
      {/* Last point dot */}
      <circle
        cx={chartData.xs[chartData.xs.length - 1]}
        cy={chartData.ys[chartData.ys.length - 1]}
        r={3.5} fill="#60A5FA" stroke="var(--ink-2)" strokeWidth="2"
      />
    </svg>
  );
}

// ─── Allocation donut chart ───────────────────────────────────────────────────

const BRAND_COLOR: Record<string, string> = {
  SJC:     '#D4AF37',
  DOJI:    '#C0C0C0',
  PNJ:     '#CD7F32',
  BAO_TIN: '#8B7355',
};

const ALLOC_PALETTE = ['#D4AF37', '#C0C0C0', '#CD7F32', '#8B7355', '#6B8E23', '#4682B4'];

function allocColor(label: string, idx: number): string {
  return BRAND_COLOR[label] ?? ALLOC_PALETTE[idx % ALLOC_PALETTE.length];
}

function DonutChart({ items }: { items: { label: string; pct: number }[] }) {
  const CX = 80, CY = 80, OR = 70, IR = 45;

  function describeArc(startDeg: number, endDeg: number): string {
    const toRad = (d: number) => (d - 90) * (Math.PI / 180);
    const x1 = CX + OR * Math.cos(toRad(startDeg));
    const y1 = CY + OR * Math.sin(toRad(startDeg));
    const x2 = CX + OR * Math.cos(toRad(endDeg));
    const y2 = CY + OR * Math.sin(toRad(endDeg));
    const ix1 = CX + IR * Math.cos(toRad(endDeg));
    const iy1 = CY + IR * Math.sin(toRad(endDeg));
    const ix2 = CX + IR * Math.cos(toRad(startDeg));
    const iy2 = CY + IR * Math.sin(toRad(startDeg));
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return [
      `M${x1.toFixed(2)},${y1.toFixed(2)}`,
      `A${OR},${OR} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)}`,
      `L${ix1.toFixed(2)},${iy1.toFixed(2)}`,
      `A${IR},${IR} 0 ${large} 0 ${ix2.toFixed(2)},${iy2.toFixed(2)}`,
      'Z',
    ].join(' ');
  }

  // Single item: full circle as two half-arcs
  if (items.length === 1) {
    const c = allocColor(items[0].label, 0);
    return (
      <svg viewBox="0 0 160 160" width={160} height={160} style={{ display: 'block' }}>
        <circle cx={CX} cy={CY} r={OR} fill={c}/>
        <circle cx={CX} cy={CY} r={IR} fill="var(--ink-2)"/>
      </svg>
    );
  }

  const slices: { path: string; color: string }[] = [];
  let cursor = 0;
  for (let i = 0; i < items.length; i++) {
    const sweep = (items[i].pct / 100) * 360;
    if (sweep > 0) {
      slices.push({
        path: describeArc(cursor, cursor + sweep - 0.4),
        color: allocColor(items[i].label, i),
      });
    }
    cursor += sweep;
  }

  return (
    <svg viewBox="0 0 160 160" width={160} height={160} style={{ display: 'block' }}>
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color}/>
      ))}
      <circle cx={CX} cy={CY} r={IR} fill="var(--ink-2)"/>
    </svg>
  );
}

function AllocationGroup({
  title,
  items,
  loading,
}: {
  title: string;
  items: { label: string; pct: number }[];
  loading: boolean;
}) {
  return (
    <div style={{ flex: 1, minWidth: 200 }}>
      <SectionLabel>{title}</SectionLabel>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton w={160} h={160} radius={80}/>
          <Skeleton w="80%" h={12} radius={3}/>
        </div>
      ) : items.length === 0 ? (
        <div style={{ font: '500 11px/1 var(--font-mono)', color: 'var(--mute)' }}>no data</div>
      ) : (
        <>
          {/* Donut chart */}
          <DonutChart items={items}/>
          {/* Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 14 }}>
            {items.map((item, i) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 9, height: 9, borderRadius: '50%',
                  background: allocColor(item.label, i),
                  flexShrink: 0,
                }}/>
                <span style={{ font: '600 11px/1 var(--font-mono)', color: 'var(--bone)', flex: 1 }}>
                  {item.label}
                </span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--mute)', fontVariantNumeric: 'tabular-nums' }}>
                  {item.pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Add Transaction Modal ────────────────────────────────────────────────────

const BRANDS = ['SJC', 'DOJI', 'PNJ', 'BAO_TIN'] as const;
const GOLD_TYPES = ['MIEN_SJC', 'NHAN_9999', 'VANG_24K', 'VANG_18K'] as const;

function AddTransactionModal({ onClose }: { onClose: () => void }) {
  const addTx = useAddTransaction();

  const [txType, setTxType] = useState<'BUY' | 'SELL'>('BUY');
  const [brand, setBrand] = useState<string>('SJC');
  const [goldType, setGoldType] = useState<string>('MIEN_SJC');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    const qtyNum = parseFloat(qty);
    const priceNum = parseFloat(price);
    if (!qtyNum || qtyNum <= 0) { setError('Quantity must be > 0'); return; }
    if (!priceNum || priceNum <= 0) { setError('Price must be > 0'); return; }
    setError('');
    setSubmitting(true);
    try {
      const payload: AddTransactionPayload = {
        type: txType,
        brand,
        goldType,
        quantity: qtyNum,
        pricePerTael: priceNum,
        transactedAt: new Date(date).toISOString(),
        note: note || undefined,
      };
      await addTx.mutateAsync(payload);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction');
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--ink-3)',
    border: '1px solid var(--line)',
    borderRadius: 8,
    color: 'var(--chalk)',
    font: '600 14px/1 var(--font-display)',
    padding: '10px 14px',
    outline: 'none',
    appearance: 'none' as const,
  };

  function ChipSel<T extends string>({
    options, value, onChange,
  }: {
    options: readonly T[];
    value: T;
    onChange: (v: T) => void;
  }) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              border: `1px solid ${value === opt ? 'var(--gold)' : 'var(--line)'}`,
              background: value === opt ? 'rgba(212,175,55,0.12)' : 'transparent',
              color: value === opt ? 'var(--gold)' : 'var(--bone)',
              font: '700 11px/1 var(--font-mono)',
              letterSpacing: '0.08em',
              padding: '7px 13px',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'border-color 120ms, background 120ms, color 120ms',
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(11,11,15,0.85)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        width: 480, maxWidth: '100%',
        background: 'var(--ink-2)',
        border: '1px solid var(--line)',
        borderRadius: 16,
        padding: '28px 28px 24px',
        position: 'relative',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ font: '800 18px/1 var(--font-display)', letterSpacing: '-0.02em' }}>
              add transaction
            </div>
            <div style={{ font: '500 12px/1 var(--font-mono)', color: 'var(--mute)', marginTop: 4, letterSpacing: '0.04em' }}>
              record a buy or sell
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--line)',
              borderRadius: 8,
              color: 'var(--mute)',
              width: 34, height: 34,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color 120ms, border-color 120ms',
            }}
          >
            <IconX s={14}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Type */}
          <div>
            <SectionLabel>Type</SectionLabel>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['BUY', 'SELL'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTxType(t)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: `1px solid ${txType === t ? (t === 'BUY' ? 'var(--up)' : 'var(--down)') : 'var(--line)'}`,
                    background: txType === t
                      ? t === 'BUY' ? 'rgba(88,200,150,0.12)' : 'rgba(229,72,77,0.12)'
                      : 'transparent',
                    color: txType === t ? (t === 'BUY' ? 'var(--up)' : 'var(--down)') : 'var(--bone)',
                    font: '700 12px/1 var(--font-mono)',
                    letterSpacing: '0.1em',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'border-color 120ms, background 120ms, color 120ms',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Brand */}
          <div>
            <SectionLabel>Brand</SectionLabel>
            <ChipSel options={BRANDS} value={brand as typeof BRANDS[number]} onChange={setBrand}/>
          </div>

          {/* Gold Type */}
          <div>
            <SectionLabel>Gold Type</SectionLabel>
            <ChipSel options={GOLD_TYPES} value={goldType as typeof GOLD_TYPES[number]} onChange={setGoldType}/>
          </div>

          {/* Quantity & Price */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <SectionLabel>Quantity (tael)</SectionLabel>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={qty}
                onChange={(e: { target: { value: string } }) => setQty(e.target.value)}
                placeholder="e.g. 1.5"
                required
                style={inputStyle}
              />
            </div>
            <div>
              <SectionLabel>Price / Tael (VND)</SectionLabel>
              <input
                type="number"
                min="1"
                step="1"
                value={price}
                onChange={(e: { target: { value: string } }) => setPrice(e.target.value)}
                placeholder="e.g. 79000000"
                required
                style={inputStyle}
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <SectionLabel>Date</SectionLabel>
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e: { target: { value: string } }) => setDate(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* Note */}
          <div>
            <SectionLabel>Note (optional)</SectionLabel>
            <input
              type="text"
              value={note}
              onChange={(e: { target: { value: string } }) => setNote(e.target.value)}
              placeholder="e.g. Bought at SJC Hà Nội"
              style={inputStyle}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(229,72,77,0.1)',
              border: '1px solid rgba(229,72,77,0.3)',
              borderRadius: 8,
              padding: '10px 14px',
              font: '500 12px/1.4 var(--font-mono)',
              color: 'var(--down)',
              letterSpacing: '0.04em',
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              height: 44,
              background: submitting ? 'rgba(212,175,55,0.4)' : 'var(--gold)',
              border: 0,
              borderRadius: 10,
              cursor: submitting ? 'not-allowed' : 'pointer',
              font: '700 13px/1 var(--font-display)',
              color: '#0B0B0F',
              letterSpacing: '0.04em',
              transition: 'background 140ms',
            }}
          >
            {submitting ? 'Saving…' : `Record ${txType}`}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Transaction Modal ───────────────────────────────────────────────────

interface EditableTx {
  id: string;
  type: 'BUY' | 'SELL';
  brand: string;
  goldType: string;
  quantity: number;
  pricePerTael: number;
  transactedAt: string;
  note: string | null;
}

function EditTransactionModal({ tx, onClose }: { tx: EditableTx; onClose: () => void }) {
  const editTx = useEditTransaction();

  const [txType, setTxType] = useState<'BUY' | 'SELL'>(tx.type);
  const [brand, setBrand] = useState<string>(tx.brand);
  const [goldType, setGoldType] = useState<string>(tx.goldType);
  const [qty, setQty] = useState(String(tx.quantity));
  const [price, setPrice] = useState(String(tx.pricePerTael));
  const [date, setDate] = useState(tx.transactedAt.split('T')[0]);
  const [note, setNote] = useState(tx.note ?? '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    const qtyNum = parseFloat(qty);
    const priceNum = parseFloat(price);
    if (!qtyNum || qtyNum <= 0) { setError('Quantity must be > 0'); return; }
    if (!priceNum || priceNum <= 0) { setError('Price must be > 0'); return; }
    setError('');
    setSubmitting(true);
    try {
      await editTx.mutateAsync({
        id: tx.id,
        type: txType,
        brand,
        goldType,
        quantity: qtyNum,
        pricePerTael: priceNum,
        transactedAt: new Date(date).toISOString(),
        note: note || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction');
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--ink-3)',
    border: '1px solid var(--line)',
    borderRadius: 8,
    color: 'var(--chalk)',
    font: '600 14px/1 var(--font-display)',
    padding: '10px 14px',
    outline: 'none',
    appearance: 'none' as const,
  };

  function ChipSel<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (v: T) => void }) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              border: `1px solid ${value === opt ? 'var(--gold)' : 'var(--line)'}`,
              background: value === opt ? 'rgba(212,175,55,0.12)' : 'transparent',
              color: value === opt ? 'var(--gold)' : 'var(--bone)',
              font: '700 11px/1 var(--font-mono)',
              letterSpacing: '0.08em',
              padding: '7px 13px',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >{opt}</button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(11,11,15,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: 480, maxWidth: '100%', background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 16, padding: '28px 28px 24px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ font: '800 18px/1 var(--font-display)', letterSpacing: '-0.02em' }}>edit transaction</div>
            <div style={{ font: '500 12px/1 var(--font-mono)', color: 'var(--mute)', marginTop: 4, letterSpacing: '0.04em' }}>modify the details below</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--mute)', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconX s={14}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <SectionLabel>Type</SectionLabel>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['BUY', 'SELL'] as const).map(t => (
                <button key={t} type="button" onClick={() => setTxType(t)} style={{ flex: 1, padding: '10px', border: `1px solid ${txType === t ? (t === 'BUY' ? 'var(--up)' : 'var(--down)') : 'var(--line)'}`, background: txType === t ? t === 'BUY' ? 'rgba(88,200,150,0.12)' : 'rgba(229,72,77,0.12)' : 'transparent', color: txType === t ? (t === 'BUY' ? 'var(--up)' : 'var(--down)') : 'var(--bone)', font: '700 12px/1 var(--font-mono)', letterSpacing: '0.1em', borderRadius: 8, cursor: 'pointer' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>Brand</SectionLabel>
            <ChipSel options={BRANDS} value={brand as typeof BRANDS[number]} onChange={setBrand}/>
          </div>

          <div>
            <SectionLabel>Gold Type</SectionLabel>
            <ChipSel options={GOLD_TYPES} value={goldType as typeof GOLD_TYPES[number]} onChange={setGoldType}/>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <SectionLabel>Quantity (tael)</SectionLabel>
              <input type="number" min="0.01" step="0.01" value={qty} onChange={(e: { target: { value: string } }) => setQty(e.target.value)} placeholder="e.g. 1.5" required style={inputStyle}/>
            </div>
            <div>
              <SectionLabel>Price / Tael (VND)</SectionLabel>
              <input type="number" min="1" step="1" value={price} onChange={(e: { target: { value: string } }) => setPrice(e.target.value)} placeholder="e.g. 79000000" required style={inputStyle}/>
            </div>
          </div>

          <div>
            <SectionLabel>Date</SectionLabel>
            <input type="date" value={date} max={today} onChange={(e: { target: { value: string } }) => setDate(e.target.value)} required style={inputStyle}/>
          </div>

          <div>
            <SectionLabel>Note (optional)</SectionLabel>
            <input type="text" value={note} onChange={(e: { target: { value: string } }) => setNote(e.target.value)} placeholder="e.g. Bought at SJC Hà Nội" style={inputStyle}/>
          </div>

          {error && (
            <div style={{ background: 'rgba(229,72,77,0.1)', border: '1px solid rgba(229,72,77,0.3)', borderRadius: 8, padding: '10px 14px', font: '500 12px/1.4 var(--font-mono)', color: 'var(--down)', letterSpacing: '0.04em' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting} style={{ width: '100%', height: 44, background: submitting ? 'rgba(212,175,55,0.4)' : 'var(--gold)', border: 0, borderRadius: 10, cursor: submitting ? 'not-allowed' : 'pointer', font: '700 13px/1 var(--font-display)', color: '#0B0B0F', letterSpacing: '0.04em' }}>
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function PortfolioContent() {
  const router = useRouter();

  const [showModal, setShowModal] = useState(false);
  const [editingTx, setEditingTx] = useState<EditableTx | null>(null);
  const [txPage, setTxPage] = useState(1);

  const { data: summary, isLoading: summaryLoading } = usePortfolio();
  const { data: chartData, isLoading: chartLoading } = usePortfolioChart();
  const { data: alloc, isLoading: allocLoading } = usePortfolioAllocation();
  const { data: txData, isLoading: txLoading } = useTransactions(txPage);
  const deleteTx = useDeleteTransaction();

  // Derived values
  const pnlPositive = (summary?.totalPnlVnd ?? 0) >= 0;
  const pnlColor = pnlPositive ? 'var(--up)' : 'var(--down)';
  const pnlArrow = pnlPositive ? '↑' : '↓';
  const pnlPctValue = summary?.totalPnlPct ?? 0;
  const pnlPctPositive = pnlPctValue >= 0;

  const allocByBrand = (alloc?.byBrand ?? []).map((b: { brand: string; pct: number }) => ({ label: b.brand, pct: b.pct }));
  const allocByType = (alloc?.byGoldType ?? []).map((b: { goldType: string; pct: number }) => ({ label: b.goldType, pct: b.pct }));

  return (
    <>
      <style>{`
        @keyframes skshimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--ink)', color: 'var(--chalk)', padding: '32px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* ── Header bar ── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 16 }}>
            <div>
              <button
                onClick={() => router.back()}
                style={{
                  background: 'transparent', border: 0, cursor: 'pointer',
                  color: 'var(--mute)', display: 'flex', alignItems: 'center', gap: 6,
                  font: '600 12px/1 var(--font-mono)', letterSpacing: '0.08em',
                  padding: '0 0 14px', transition: 'color 140ms',
                }}
              >
                <IconArrowLeft s={13}/> portfolio
              </button>
              <h1 style={{ font: '800 40px/1 var(--font-display)', letterSpacing: '-0.035em', margin: 0 }}>
                my portfolio
              </h1>
              <p style={{ font: '400 13px/1.5 var(--font-display)', color: 'var(--mute)', margin: '8px 0 0' }}>
                Track your gold holdings, P&L, and transaction history
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                height: 40,
                background: 'var(--gold)',
                border: 0,
                borderRadius: 10,
                cursor: 'pointer',
                font: '700 13px/1 var(--font-display)',
                color: '#0B0B0F',
                padding: '0 18px',
                letterSpacing: '0.02em',
                flexShrink: 0,
                marginTop: 6,
                transition: 'opacity 140ms',
              }}
            >
              <IconPlus s={14}/> add transaction
            </button>
          </div>

          {/* ── Summary cards ── */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
            <SummaryCard
              label="Total Value"
              value={summary ? fmtM(summary.totalValueVnd) : '—'}
              subLabel={summary ? fmtVnd(summary.totalValueVnd) : undefined}
              loading={summaryLoading}
            />
            <SummaryCard
              label="Total Cost"
              value={summary ? fmtM(summary.totalCostVnd) : '—'}
              subLabel={summary ? fmtVnd(summary.totalCostVnd) : undefined}
              loading={summaryLoading}
            />
            <SummaryCard
              label={`P&L ${summary ? pnlArrow : ''}`}
              value={summary ? `${pnlPositive ? '+' : ''}${fmtM(summary.totalPnlVnd)}` : '—'}
              subLabel={summary ? fmtVnd(summary.totalPnlVnd) : undefined}
              color={summary ? pnlColor : undefined}
              loading={summaryLoading}
            />
            <SummaryCard
              label="P&L %"
              value={summary ? `${pnlPctPositive ? '+' : ''}${pnlPctValue.toFixed(2)}%` : '—'}
              color={summary ? (pnlPctPositive ? 'var(--up)' : 'var(--down)') : undefined}
              loading={summaryLoading}
            />
          </div>

          {/* ── P&L Chart ── */}
          <div style={{
            background: 'var(--ink-2)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 28,
          }}>
            <SectionLabel>portfolio value history</SectionLabel>
            <PnlChart data={chartData ?? []} loading={chartLoading}/>
          </div>

          {/* ── Holdings table ── */}
          <div style={{
            background: 'var(--ink-2)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 28,
            overflowX: 'auto',
          }}>
            <SectionLabel>holdings</SectionLabel>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr>
                  {['Brand', 'Gold Type', 'Net Qty', 'Avg Cost', 'Current Price', 'Value', 'P&L', 'P&L%'].map(h => (
                    <th key={h} style={{
                      font: '700 9px/1 var(--font-mono)',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--mute)',
                      padding: '0 12px 14px',
                      textAlign: h === 'Brand' || h === 'Gold Type' ? 'left' : 'right',
                      borderBottom: '1px solid var(--line)',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summaryLoading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} style={{ padding: '14px 12px', borderBottom: '1px solid var(--hairline)' }}>
                          <Skeleton w={j < 2 ? 60 : 80} h={12}/>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : !summary?.holdings.length ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', font: '500 13px/1 var(--font-mono)', color: 'var(--mute)' }}>
                      no holdings yet — add a buy transaction to get started
                    </td>
                  </tr>
                ) : (
                  summary.holdings.map((h: { brand: string; goldType: string; netQty: number; avgCostPerTael: number; currentBuyPrice: number; currentValueVnd: number; pnlVnd: number; pnlPct: number }, idx: number) => {
                    const hPnlPos = h.pnlVnd >= 0;
                    const hPnlColor = hPnlPos ? 'var(--up)' : 'var(--down)';
                    return (
                      <tr key={idx} style={{ transition: 'background 120ms' }}>
                        <td style={{ padding: '14px 12px', borderBottom: '1px solid var(--hairline)', font: '600 13px/1 var(--font-display)', color: 'var(--chalk)' }}>{h.brand}</td>
                        <td style={{ padding: '14px 12px', borderBottom: '1px solid var(--hairline)', font: '600 11px/1 var(--font-mono)', color: 'var(--bone)', letterSpacing: '0.04em' }}>{h.goldType}</td>
                        <td className="mono" style={{ padding: '14px 12px', borderBottom: '1px solid var(--hairline)', textAlign: 'right', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{h.netQty.toFixed(3)}</td>
                        <td className="mono" style={{ padding: '14px 12px', borderBottom: '1px solid var(--hairline)', textAlign: 'right', fontSize: 12, color: 'var(--bone)', fontVariantNumeric: 'tabular-nums' }}>{fmtM(h.avgCostPerTael)}</td>
                        <td className="mono" style={{ padding: '14px 12px', borderBottom: '1px solid var(--hairline)', textAlign: 'right', fontSize: 12, color: 'var(--bone)', fontVariantNumeric: 'tabular-nums' }}>{fmtM(h.currentBuyPrice)}</td>
                        <td className="mono" style={{ padding: '14px 12px', borderBottom: '1px solid var(--hairline)', textAlign: 'right', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{fmtM(h.currentValueVnd)}</td>
                        <td className="mono" style={{ padding: '14px 12px', borderBottom: '1px solid var(--hairline)', textAlign: 'right', fontSize: 13, color: hPnlColor, fontVariantNumeric: 'tabular-nums' }}>
                          {hPnlPos ? '+' : ''}{fmtM(h.pnlVnd)}
                        </td>
                        <td className="mono" style={{ padding: '14px 12px', borderBottom: '1px solid var(--hairline)', textAlign: 'right', fontSize: 12, color: hPnlColor, fontVariantNumeric: 'tabular-nums' }}>
                          {hPnlPos ? '+' : ''}{h.pnlPct.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Allocation ── */}
          <div style={{
            background: 'var(--ink-2)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 28,
          }}>
            <SectionLabel>allocation</SectionLabel>
            <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
              <AllocationGroup title="by brand" items={allocByBrand} loading={allocLoading}/>
              <AllocationGroup title="by gold type" items={allocByType} loading={allocLoading}/>
            </div>
          </div>

          {/* ── Transactions ── */}
          <div style={{
            background: 'var(--ink-2)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: '20px 24px',
            overflowX: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <SectionLabel>transactions</SectionLabel>
              {txData && txData.totalPages > 1 && (
                <div className="mono" style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '0.1em' }}>
                  page {txData.page} of {txData.totalPages}
                </div>
              )}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
              <thead>
                <tr>
                  {['Date', 'Type', 'Brand', 'Gold Type', 'Qty', 'Price/Tael', 'Note', ''].map((h, i) => (
                    <th key={i} style={{
                      font: '700 9px/1 var(--font-mono)',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--mute)',
                      padding: '0 10px 14px',
                      textAlign: i >= 4 ? 'right' : 'left',
                      borderBottom: '1px solid var(--line)',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txLoading ? (
                  [1, 2, 3, 4].map(i => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} style={{ padding: '13px 10px', borderBottom: '1px solid var(--hairline)' }}>
                          <Skeleton w={j === 1 ? 40 : 70} h={11}/>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : !txData?.items.length ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', font: '500 13px/1 var(--font-mono)', color: 'var(--mute)' }}>
                      no transactions yet
                    </td>
                  </tr>
                ) : (
                  txData.items.map((tx: { id: string; type: 'BUY' | 'SELL'; brand: string; goldType: string; quantity: number; pricePerTael: number; transactedAt: string; note: string | null }) => {
                    const d = new Date(tx.transactedAt);
                    const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                    const isBuy = tx.type === 'BUY';
                    return (
                      <tr key={tx.id}>
                        <td className="mono" style={{ padding: '13px 10px', borderBottom: '1px solid var(--hairline)', fontSize: 11, color: 'var(--bone)', fontVariantNumeric: 'tabular-nums' }}>
                          {dateStr}
                        </td>
                        <td style={{ padding: '13px 10px', borderBottom: '1px solid var(--hairline)' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: 4,
                            font: '700 10px/1 var(--font-mono)',
                            letterSpacing: '0.1em',
                            background: isBuy ? 'rgba(88,200,150,0.12)' : 'rgba(229,72,77,0.12)',
                            color: isBuy ? 'var(--up)' : 'var(--down)',
                            border: `1px solid ${isBuy ? 'rgba(88,200,150,0.3)' : 'rgba(229,72,77,0.3)'}`,
                          }}>
                            {tx.type}
                          </span>
                        </td>
                        <td style={{ padding: '13px 10px', borderBottom: '1px solid var(--hairline)', font: '600 12px/1 var(--font-display)', color: 'var(--chalk)' }}>{tx.brand}</td>
                        <td className="mono" style={{ padding: '13px 10px', borderBottom: '1px solid var(--hairline)', fontSize: 11, color: 'var(--bone)', letterSpacing: '0.04em' }}>{tx.goldType}</td>
                        <td className="mono" style={{ padding: '13px 10px', borderBottom: '1px solid var(--hairline)', textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                          {tx.quantity.toFixed(3)}
                        </td>
                        <td className="mono" style={{ padding: '13px 10px', borderBottom: '1px solid var(--hairline)', textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                          {fmtM(tx.pricePerTael)}
                        </td>
                        <td style={{ padding: '13px 10px', borderBottom: '1px solid var(--hairline)', font: '400 12px/1.4 var(--font-display)', color: 'var(--mute)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tx.note ?? '—'}
                        </td>
                        <td style={{ padding: '13px 10px', borderBottom: '1px solid var(--hairline)', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              onClick={() => setEditingTx(tx)}
                              style={{ background: 'transparent', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--mute)', width: 28, height: 28, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'color 120ms, border-color 120ms' }}
                            >
                              <IconPencil s={12}/>
                            </button>
                            <button
                              onClick={() => deleteTx.mutateAsync(tx.id)}
                              style={{ background: 'transparent', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--mute)', width: 28, height: 28, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'color 120ms, border-color 120ms' }}
                            >
                              <IconTrash s={12}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {txData && txData.totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <button
                  onClick={() => setTxPage((p: number) => Math.max(1, p - 1))}
                  disabled={txPage <= 1}
                  style={{
                    height: 32, padding: '0 14px',
                    background: 'transparent',
                    border: '1px solid var(--line)',
                    borderRadius: 6,
                    color: txPage <= 1 ? 'var(--mute)' : 'var(--bone)',
                    font: '600 11px/1 var(--font-mono)',
                    letterSpacing: '0.06em',
                    cursor: txPage <= 1 ? 'not-allowed' : 'pointer',
                    opacity: txPage <= 1 ? 0.5 : 1,
                  }}
                >
                  Prev
                </button>
                <span className="mono" style={{ fontSize: 11, color: 'var(--mute)' }}>
                  {txPage} / {txData.totalPages}
                </span>
                <button
                  onClick={() => setTxPage((p: number) => Math.min(txData.totalPages, p + 1))}
                  disabled={txPage >= txData.totalPages}
                  style={{
                    height: 32, padding: '0 14px',
                    background: 'transparent',
                    border: '1px solid var(--line)',
                    borderRadius: 6,
                    color: txPage >= txData.totalPages ? 'var(--mute)' : 'var(--bone)',
                    font: '600 11px/1 var(--font-mono)',
                    letterSpacing: '0.06em',
                    cursor: txPage >= txData.totalPages ? 'not-allowed' : 'pointer',
                    opacity: txPage >= txData.totalPages ? 0.5 : 1,
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Modal */}
      {showModal && <AddTransactionModal onClose={() => setShowModal(false)}/>}
      {editingTx && <EditTransactionModal tx={editingTx} onClose={() => setEditingTx(null)}/>}
    </>
  );
}

export default function PortfolioPage() {
  return <ProtectedRoute><PortfolioContent /></ProtectedRoute>;
}
