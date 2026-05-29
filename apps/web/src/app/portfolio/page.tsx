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
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

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
    <div className="font-mono text-[9px] leading-none font-bold tracking-[0.18em] uppercase text-mute mb-3">
      {children}
    </div>
  );
}

function Skeleton({ w, h, radius = 4 }: { w: number | string; h: number; radius?: number }) {
  return (
    <div
      className="animate-pulse bg-ink-3"
      style={{ width: w, height: h, borderRadius: radius }}
    />
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, subLabel, colorClass, loading,
}: {
  label: string;
  value: string;
  subLabel?: string;
  colorClass?: string;
  loading: boolean;
}) {
  return (
    <div className="bg-ink-2 border border-line rounded-[12px] p-[20px_22px] flex-1 min-w-0">
      <div className="font-mono text-[9px] leading-none font-bold tracking-[0.18em] uppercase text-mute mb-[10px]">
        {label}
      </div>
      {loading ? (
        <Skeleton w={140} h={30}/>
      ) : (
        <div className={cn(
          'font-display text-[28px] leading-none font-extrabold tracking-[-0.03em] [font-variant-numeric:tabular-nums]',
          colorClass ?? 'text-chalk',
        )}>
          {value}
        </div>
      )}
      {subLabel && !loading && (
        <div className="font-mono text-[11px] leading-none font-medium text-mute mt-[6px] tracking-[0.04em]">
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

  const chartData = useMemo(() => {
    const points = data.slice(-30);
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

    const isPositive = points[points.length - 1].valueVnd >= points[0].valueVnd;
    return { linePath, areaPath, xs, ys, xTicks: uniqueIdxs, yTicks, minV, maxV, points, isPositive };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: H }}>
        <Skeleton w="100%" h={H - 20}/>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="flex items-center justify-center" style={{ height: H }}>
        <span className="font-mono text-[13px] leading-none font-medium text-mute tracking-[0.06em]">
          chưa có lịch sử
        </span>
      </div>
    );
  }

  const lineColor = chartData.isPositive ? '#22c55e' : '#ef4444';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.20"/>
          <stop offset="100%" stopColor={lineColor} stopOpacity="0"/>
        </linearGradient>
      </defs>
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
      <path d={chartData.areaPath} fill="url(#chartGrad)"/>
      <path d={chartData.linePath} fill="none" stroke={lineColor} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round"/>
      {chartData.xTicks.map((i: number) => {
        const d = new Date(chartData.points[i].date);
        const label = `${d.getDate()}/${d.getMonth() + 1}`;
        return (
          <text key={i} x={chartData.xs[i]} y={H - PAD.bottom + 14} textAnchor="middle"
            style={{ font: '400 9px var(--font-mono)', fill: 'var(--mute)' }}>
            {label}
          </text>
        );
      })}
      <circle
        cx={chartData.xs[chartData.xs.length - 1]}
        cy={chartData.ys[chartData.ys.length - 1]}
        r={3.5} fill={lineColor} stroke="var(--ink-2)" strokeWidth="2"
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
    <div className="flex-1 min-w-[200px]">
      <SectionLabel>{title}</SectionLabel>
      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton w={160} h={160} radius={80}/>
          <Skeleton w="80%" h={12} radius={3}/>
        </div>
      ) : items.length === 0 ? (
        <div className="font-mono text-[11px] leading-none font-medium text-mute">không có dữ liệu</div>
      ) : (
        <>
          <DonutChart items={items}/>
          <div className="flex flex-col gap-[7px] mt-[14px]">
            {items.map((item, i) => (
              <div key={item.label} className="flex items-center gap-2">
                <div
                  className="w-[9px] h-[9px] rounded-full shrink-0"
                  style={{ background: allocColor(item.label, i) }}
                />
                <span className="font-mono text-[11px] leading-none font-semibold text-bone flex-1">
                  {item.label}
                </span>
                <span className="font-mono text-[11px] leading-none text-mute [font-variant-numeric:tabular-nums]">
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

// ─── Shared modal input style ─────────────────────────────────────────────────

const INPUT_CLS = 'bg-ink-3 border-line text-chalk font-display text-[14px] font-semibold placeholder:text-mute focus-visible:ring-gold appearance-none';

// ─── ChipSel ─────────────────────────────────────────────────────────────────

function ChipSel<T extends string>({
  options, value, onChange, labelMap,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labelMap?: Partial<Record<string, string>>;
}) {
  return (
    <div className="flex flex-wrap gap-[6px]">
      {options.map(opt => (
        <Button
          key={opt}
          variant="outline"
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            'font-mono text-[11px] leading-none font-bold tracking-[0.08em] px-[13px] py-[7px] h-auto rounded-md transition-[border-color,background,color] duration-[120ms]',
            value === opt
              ? 'border-gold bg-[rgba(212,175,55,0.12)] text-gold hover:bg-[rgba(212,175,55,0.18)] hover:text-gold'
              : 'border-line bg-transparent text-bone hover:bg-ink-3',
          )}
        >
          {labelMap?.[opt] ?? opt}
        </Button>
      ))}
    </div>
  );
}

// ─── Add Transaction Modal ────────────────────────────────────────────────────

const BRANDS = ['SJC', 'DOJI', 'PNJ', 'BAO_TIN'] as const;
const GOLD_TYPES = ['MIEN_SJC', 'NHAN_9999', 'VANG_24K', 'VANG_18K'] as const;

const GOLD_TYPE_LABELS: Record<string, string> = {
  MIEN_SJC: 'Vàng miếng SJC',
  NHAN_9999: 'Nhẫn tròn 9999',
  VANG_24K: 'Vàng 24K',
  VANG_18K: 'Vàng 18K',
};

const TX_TYPE_LABELS: Record<string, string> = {
  BUY: 'Mua',
  SELL: 'Bán',
};

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
    if (!qtyNum || qtyNum <= 0) { setError('Số lượng phải lớn hơn 0'); return; }
    if (!priceNum || priceNum <= 0) { setError('Giá phải lớn hơn 0'); return; }
    setError('');
    setSubmitting(true);
    try {
      const payload: AddTransactionPayload = {
        type: txType,
        brand,
        goldType,
        quantity: qtyNum,
        pricePerTael: priceNum,
        transactedAt: new Date(date + 'T00:00:00').toISOString(),
        note: note || undefined,
      };
      await addTx.mutateAsync(payload);
      toast.success('Giao dịch đã được thêm');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lưu giao dịch thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="w-[480px] bg-ink-2 border-line text-chalk p-[28px_28px_24px] max-h-[90vh] overflow-y-auto gap-6">
        <DialogHeader>
          <DialogTitle className="font-display text-[18px] leading-none font-extrabold tracking-[-0.02em] text-chalk">
            thêm giao dịch
          </DialogTitle>
          <DialogDescription className="font-mono text-[12px] leading-none font-medium text-mute tracking-[0.04em]">
            ghi lại giao dịch mua hoặc bán
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
          {/* Type */}
          <div>
            <SectionLabel>Loại</SectionLabel>
            <div className="flex gap-[6px]">
              {(['BUY', 'SELL'] as const).map(t => (
                <Button
                  key={t}
                  type="button"
                  variant="outline"
                  onClick={() => setTxType(t)}
                  className={cn(
                    'flex-1 py-[10px] h-auto font-mono text-[12px] leading-none font-bold tracking-[0.1em] rounded-lg transition-[border-color,background,color] duration-[120ms]',
                    txType === t
                      ? t === 'BUY'
                        ? 'border-up bg-[rgba(88,200,150,0.12)] text-up hover:bg-[rgba(88,200,150,0.18)] hover:text-up'
                        : 'border-down bg-[rgba(229,72,77,0.12)] text-down hover:bg-[rgba(229,72,77,0.18)] hover:text-down'
                      : 'border-line bg-transparent text-bone hover:bg-ink-3',
                  )}
                >
                  {TX_TYPE_LABELS[t]}
                </Button>
              ))}
            </div>
          </div>

          {/* Brand */}
          <div>
            <SectionLabel>Thương hiệu</SectionLabel>
            <ChipSel options={BRANDS} value={brand as typeof BRANDS[number]} onChange={setBrand}/>
          </div>

          {/* Gold Type */}
          <div>
            <SectionLabel>Loại vàng</SectionLabel>
            <ChipSel options={GOLD_TYPES} value={goldType as typeof GOLD_TYPES[number]} onChange={setGoldType} labelMap={GOLD_TYPE_LABELS}/>
          </div>

          {/* Quantity & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <SectionLabel>Số lượng (lượng)</SectionLabel>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={qty}
                onChange={(e: { target: { value: string } }) => setQty(e.target.value)}
                placeholder="vd: 1,5"
                required
                className={INPUT_CLS}
              />
            </div>
            <div>
              <SectionLabel>Giá / Lượng (VND)</SectionLabel>
              <MoneyInput
                value={price}
                onChange={setPrice}
                placeholder="79000000"
                required
                className={INPUT_CLS}
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <SectionLabel>Ngày</SectionLabel>
            <Input
              type="date"
              value={date}
              max={today}
              onChange={(e: { target: { value: string } }) => setDate(e.target.value)}
              required
              className={INPUT_CLS}
            />
          </div>

          {/* Note */}
          <div>
            <SectionLabel>Ghi chú (tùy chọn)</SectionLabel>
            <Input
              type="text"
              value={note}
              onChange={(e: { target: { value: string } }) => setNote(e.target.value)}
              placeholder="vd: Mua tại SJC Hà Nội"
              className={INPUT_CLS}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-[rgba(229,72,77,0.1)] border border-[rgba(229,72,77,0.3)] rounded-lg px-[14px] py-[10px] font-mono text-[12px] leading-[1.4] font-medium text-down tracking-[0.04em]">
              {error}
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-11 font-display text-[13px] font-bold tracking-[0.04em]"
          >
            {submitting ? 'Đang lưu…' : txType === 'BUY' ? 'Lưu giao dịch Mua' : 'Lưu giao dịch Bán'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
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
    if (!qtyNum || qtyNum <= 0) { setError('Số lượng phải lớn hơn 0'); return; }
    if (!priceNum || priceNum <= 0) { setError('Giá phải lớn hơn 0'); return; }
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
        transactedAt: new Date(date + 'T00:00:00').toISOString(),
        note: note || undefined,
      });
      toast.success('Giao dịch đã được cập nhật');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lưu giao dịch thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="w-[480px] bg-ink-2 border-line text-chalk p-[28px_28px_24px] max-h-[90vh] overflow-y-auto gap-6">
        <DialogHeader>
          <DialogTitle className="font-display text-[18px] leading-none font-extrabold tracking-[-0.02em] text-chalk">
            sửa giao dịch
          </DialogTitle>
          <DialogDescription className="font-mono text-[12px] leading-none font-medium text-mute tracking-[0.04em]">
            chỉnh sửa thông tin bên dưới
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
          <div>
            <SectionLabel>Loại</SectionLabel>
            <div className="flex gap-[6px]">
              {(['BUY', 'SELL'] as const).map(t => (
                <Button
                  key={t}
                  type="button"
                  variant="outline"
                  onClick={() => setTxType(t)}
                  className={cn(
                    'flex-1 py-[10px] h-auto font-mono text-[12px] leading-none font-bold tracking-[0.1em] rounded-lg transition-[border-color,background,color] duration-[120ms]',
                    txType === t
                      ? t === 'BUY'
                        ? 'border-up bg-[rgba(88,200,150,0.12)] text-up hover:bg-[rgba(88,200,150,0.18)] hover:text-up'
                        : 'border-down bg-[rgba(229,72,77,0.12)] text-down hover:bg-[rgba(229,72,77,0.18)] hover:text-down'
                      : 'border-line bg-transparent text-bone hover:bg-ink-3',
                  )}
                >
                  {TX_TYPE_LABELS[t]}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>Thương hiệu</SectionLabel>
            <ChipSel options={BRANDS} value={brand as typeof BRANDS[number]} onChange={setBrand}/>
          </div>

          <div>
            <SectionLabel>Loại vàng</SectionLabel>
            <ChipSel options={GOLD_TYPES} value={goldType as typeof GOLD_TYPES[number]} onChange={setGoldType} labelMap={GOLD_TYPE_LABELS}/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <SectionLabel>Số lượng (lượng)</SectionLabel>
              <Input type="number" min="0.01" step="0.01" value={qty}
                onChange={(e: { target: { value: string } }) => setQty(e.target.value)}
                placeholder="vd: 1,5" required className={INPUT_CLS}/>
            </div>
            <div>
              <SectionLabel>Giá / Lượng (VND)</SectionLabel>
              <MoneyInput value={price} onChange={setPrice} placeholder="79000000" required className={INPUT_CLS}/>
            </div>
          </div>

          <div>
            <SectionLabel>Ngày</SectionLabel>
            <Input type="date" value={date} max={today}
              onChange={(e: { target: { value: string } }) => setDate(e.target.value)}
              required className={INPUT_CLS}/>
          </div>

          <div>
            <SectionLabel>Ghi chú (tùy chọn)</SectionLabel>
            <Input type="text" value={note}
              onChange={(e: { target: { value: string } }) => setNote(e.target.value)}
              placeholder="vd: Mua tại SJC Hà Nội" className={INPUT_CLS}/>
          </div>

          {error && (
            <div className="bg-[rgba(229,72,77,0.1)] border border-[rgba(229,72,77,0.3)] rounded-lg px-[14px] py-[10px] font-mono text-[12px] leading-[1.4] font-medium text-down tracking-[0.04em]">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-11 font-display text-[13px] font-bold tracking-[0.04em]"
          >
            {submitting ? 'Đang lưu…' : 'Lưu thay đổi'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TH_BASE = 'font-mono text-[9px] leading-none font-bold tracking-[0.14em] uppercase text-mute pb-[14px] px-3 border-b border-line';
const TD_BASE = 'px-3 py-[14px] border-b border-hairline';

function PortfolioContent() {
  const router = useRouter();

  const [showModal, setShowModal] = useState(false);
  const [editingTx, setEditingTx] = useState<EditableTx | null>(null);
  const [txPage, setTxPage] = useState(1);

  const { data: summary, isLoading: summaryLoading, isFetching: summaryFetching } = usePortfolio();
  const { data: chartData, isLoading: chartLoading, isFetching: chartFetching } = usePortfolioChart();
  const { data: alloc, isLoading: allocLoading, isFetching: allocFetching } = usePortfolioAllocation();
  const { data: txData, isLoading: txLoading, isFetching: txFetching } = useTransactions(txPage);
  const deleteTx = useDeleteTransaction();

  async function handleDeleteTx(id: string) {
    if (!window.confirm('Xóa giao dịch này? Hành động không thể hoàn tác.')) return;
    try {
      await deleteTx.mutateAsync(id);
      toast.success('Đã xóa giao dịch');
    } catch {
      toast.error('Xóa giao dịch thất bại');
    }
  }

  const pnlPositive = (summary?.totalPnlVnd ?? 0) >= 0;
  const pnlClass = pnlPositive ? 'text-up' : 'text-down';
  const pnlArrow = pnlPositive ? '↑' : '↓';
  const pnlPctValue = summary?.totalPnlPct ?? 0;
  const pnlPctPositive = pnlPctValue >= 0;

  const allocByBrand = (alloc?.byBrand ?? []).map((b: { brand: string; pct: number }) => ({ label: b.brand, pct: b.pct }));
  const allocByType = (alloc?.byGoldType ?? []).map((b: { goldType: string; pct: number }) => ({ label: b.goldType, pct: b.pct }));

  return (
    <>
      <div className="h-full overflow-auto bg-ink text-chalk">
      <div className="p-[32px_40px]">
        <div className="max-w-[1100px] mx-auto">

          {/* ── Header bar ── */}
          <div className="flex items-start justify-between mb-8 gap-4">
            <div>
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="text-mute flex items-center gap-[6px] font-mono text-[12px] leading-none font-semibold tracking-[0.08em] p-0 pb-[14px] h-auto hover:bg-transparent hover:text-bone"
              >
                <IconArrowLeft s={13}/> danh mục
              </Button>
              <h1 className="font-display text-[40px] leading-none font-extrabold tracking-[-0.035em] m-0">
                danh mục của tôi
              </h1>
              <p className="font-display text-[13px] leading-[1.5] text-mute m-0 mt-2">
                Theo dõi tài sản vàng, lãi/lỗ và lịch sử giao dịch
              </p>
            </div>
            <div className="flex items-center gap-2 mt-[6px]">
              <Button
                variant="outline"
                onClick={() => router.push('/portfolio/report')}
                className="flex items-center gap-[7px] h-10 font-display text-[13px] font-bold px-[14px] tracking-[0.02em] border-line text-bone hover:text-chalk hover:bg-ink-3 shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"/>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                xuất báo cáo
              </Button>
              <Button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-[7px] h-10 font-display text-[13px] font-bold px-[18px] tracking-[0.02em] shrink-0"
              >
                <IconPlus s={14}/> thêm giao dịch
              </Button>
            </div>
          </div>

          {/* ── Summary cards ── */}
          <div className="flex gap-3 mb-7 flex-wrap">
            <SummaryCard
              label="Tổng giá trị"
              value={summary ? fmtM(summary.totalValueVnd) : '—'}
              subLabel={summary ? fmtVnd(summary.totalValueVnd) : undefined}
              loading={summaryLoading || (summaryFetching && !summary)}
            />
            <SummaryCard
              label="Tổng vốn"
              value={summary ? fmtM(summary.totalCostVnd) : '—'}
              subLabel={summary ? fmtVnd(summary.totalCostVnd) : undefined}
              loading={summaryLoading || (summaryFetching && !summary)}
            />
            <SummaryCard
              label={`Lãi/Lỗ ${summary ? pnlArrow : ''}`}
              value={summary ? `${pnlPositive ? '+' : ''}${fmtM(summary.totalPnlVnd)}` : '—'}
              subLabel={summary ? fmtVnd(summary.totalPnlVnd) : undefined}
              colorClass={summary ? pnlClass : undefined}
              loading={summaryLoading || (summaryFetching && !summary)}
            />
            <SummaryCard
              label="Lãi/Lỗ %"
              value={summary ? `${pnlPctPositive ? '+' : ''}${pnlPctValue.toFixed(2)}%` : '—'}
              colorClass={summary ? (pnlPctPositive ? 'text-up' : 'text-down') : undefined}
              loading={summaryLoading || (summaryFetching && !summary)}
            />
          </div>

          {/* ── P&L Chart ── */}
          <div className="bg-ink-2 border border-line rounded-xl p-[20px_24px] mb-7">
            <SectionLabel>lịch sử giá trị danh mục</SectionLabel>
            <PnlChart data={chartData ?? []} loading={chartLoading || (chartFetching && !chartData)}/>
          </div>

          {/* ── Holdings table ── */}
          <div className="bg-ink-2 border border-line rounded-xl p-[20px_24px] mb-7 overflow-x-auto">
            <SectionLabel>tài sản nắm giữ</SectionLabel>
            <table className="w-full border-collapse min-w-[700px]">
              <thead>
                <tr>
                  {[['Thương hiệu', true], ['Loại vàng', true], ['Số lượng', false], ['Giá vốn TB', false], ['Giá hiện tại', false], ['Giá trị', false], ['Lãi/Lỗ', false], ['Lãi/Lỗ %', false]].map(([h, left]) => (
                    <th key={h as string} className={cn(TH_BASE, left ? 'text-left' : 'text-right')}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(summaryLoading || (summaryFetching && !summary)) ? (
                  [1, 2, 3].map(i => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className={TD_BASE}>
                          <Skeleton w={j < 2 ? 60 : 80} h={12}/>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : !summary?.holdings.length ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center font-mono text-[13px] leading-none font-medium text-mute">
                      chưa có tài sản — thêm giao dịch mua để bắt đầu
                    </td>
                  </tr>
                ) : (
                  summary.holdings.map((h: { brand: string; goldType: string; netQty: number; avgCostPerTael: number; currentBuyPrice: number; currentValueVnd: number; pnlVnd: number; pnlPct: number }, idx: number) => {
                    const hPnlPos = h.pnlVnd >= 0;
                    const hPnlCls = hPnlPos ? 'text-up' : 'text-down';
                    return (
                      <tr key={idx}>
                        <td className={cn(TD_BASE, 'font-display text-[13px] leading-none font-semibold text-chalk')}>{h.brand}</td>
                        <td className={cn(TD_BASE, 'font-mono text-[11px] leading-none font-semibold text-bone tracking-[0.04em]')}>{GOLD_TYPE_LABELS[h.goldType] ?? h.goldType}</td>
                        <td className={cn(TD_BASE, 'text-right font-mono text-[13px] [font-variant-numeric:tabular-nums]')}>{h.netQty.toFixed(3)}</td>
                        <td className={cn(TD_BASE, 'text-right font-mono text-[12px] text-bone [font-variant-numeric:tabular-nums]')}>{fmtM(h.avgCostPerTael)}</td>
                        <td className={cn(TD_BASE, 'text-right font-mono text-[12px] text-bone [font-variant-numeric:tabular-nums]')}>{fmtM(h.currentBuyPrice)}</td>
                        <td className={cn(TD_BASE, 'text-right font-mono text-[13px] [font-variant-numeric:tabular-nums]')}>{fmtM(h.currentValueVnd)}</td>
                        <td className={cn(TD_BASE, 'text-right font-mono text-[13px] [font-variant-numeric:tabular-nums]', hPnlCls)}>
                          {hPnlPos ? '+' : ''}{fmtM(h.pnlVnd)}
                        </td>
                        <td className={cn(TD_BASE, 'text-right font-mono text-[12px] [font-variant-numeric:tabular-nums]', hPnlCls)}>
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
          <div className="bg-ink-2 border border-line rounded-xl p-[20px_24px] mb-7">
            <SectionLabel>phân bổ</SectionLabel>
            <div className="flex gap-12 flex-wrap">
              <AllocationGroup title="theo thương hiệu" items={allocByBrand} loading={allocLoading || (allocFetching && !alloc)}/>
              <AllocationGroup title="theo loại vàng" items={allocByType} loading={allocLoading || (allocFetching && !alloc)}/>
            </div>
          </div>

          {/* ── Transactions ── */}
          <div className="bg-ink-2 border border-line rounded-xl p-[20px_24px] overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <SectionLabel>giao dịch</SectionLabel>
              {txData && txData.totalPages > 1 && (
                <div className="font-mono text-[10px] text-mute tracking-[0.1em]">
                  Trang {txData.page} / {txData.totalPages}
                </div>
              )}
            </div>
            <table className="w-full border-collapse min-w-[680px]">
              <thead>
                <tr>
                  {['Ngày', 'Loại', 'Thương hiệu', 'Loại vàng', 'Số lượng', 'Giá/Lượng', 'Ghi chú', ''].map((h, i) => (
                    <th key={i} className={cn(TH_BASE, i >= 4 ? 'text-right' : 'text-left')}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(txLoading || (txFetching && !txData)) ? (
                  [1, 2, 3, 4].map(i => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-[10px] py-[13px] border-b border-hairline">
                          <Skeleton w={j === 1 ? 40 : 70} h={11}/>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : !txData?.items.length ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center font-mono text-[13px] leading-none font-medium text-mute">
                      chưa có giao dịch
                    </td>
                  </tr>
                ) : (
                  txData.items.map((tx: { id: string; type: 'BUY' | 'SELL'; brand: string; goldType: string; quantity: number; pricePerTael: number; transactedAt: string; note: string | null }) => {
                    const d = new Date(tx.transactedAt);
                    const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                    const isBuy = tx.type === 'BUY';
                    return (
                      <tr key={tx.id}>
                        <td className="px-[10px] py-[13px] border-b border-hairline font-mono text-[11px] text-bone [font-variant-numeric:tabular-nums]">
                          {dateStr}
                        </td>
                        <td className="px-[10px] py-[13px] border-b border-hairline">
                          <Badge className={cn(
                            'font-mono text-[10px] font-bold tracking-[0.1em] border rounded',
                            isBuy
                              ? 'bg-[rgba(88,200,150,0.12)] text-up border-[rgba(88,200,150,0.3)] hover:bg-[rgba(88,200,150,0.12)]'
                              : 'bg-[rgba(229,72,77,0.12)] text-down border-[rgba(229,72,77,0.3)] hover:bg-[rgba(229,72,77,0.12)]',
                          )}>
                            {TX_TYPE_LABELS[tx.type] ?? tx.type}
                          </Badge>
                        </td>
                        <td className="px-[10px] py-[13px] border-b border-hairline font-display text-[12px] leading-none font-semibold text-chalk">{tx.brand}</td>
                        <td className="px-[10px] py-[13px] border-b border-hairline font-mono text-[11px] text-bone tracking-[0.04em]">{GOLD_TYPE_LABELS[tx.goldType] ?? tx.goldType}</td>
                        <td className="px-[10px] py-[13px] border-b border-hairline text-right font-mono text-[12px] [font-variant-numeric:tabular-nums]">
                          {tx.quantity.toFixed(3)}
                        </td>
                        <td className="px-[10px] py-[13px] border-b border-hairline text-right font-mono text-[12px] [font-variant-numeric:tabular-nums]">
                          {fmtM(tx.pricePerTael)}
                        </td>
                        <td className="px-[10px] py-[13px] border-b border-hairline font-display text-[12px] leading-[1.4] text-mute max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap">
                          {tx.note ?? '—'}
                        </td>
                        <td className="px-[10px] py-[13px] border-b border-hairline text-right">
                          <div className="inline-flex gap-[6px]">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setEditingTx(tx)}
                              className="border-line text-mute w-7 h-7 bg-transparent hover:bg-ink-3 hover:text-bone"
                            >
                              <IconPencil s={12}/>
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteTx(tx.id)}
                              disabled={deleteTx.isPending}
                              className="border-line text-mute w-7 h-7 bg-transparent hover:bg-[rgba(229,72,77,0.08)] hover:text-down hover:border-[rgba(229,72,77,0.3)]"
                            >
                              <IconTrash s={12}/>
                            </Button>
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
              <div className="flex items-center justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTxPage((p: number) => Math.max(1, p - 1))}
                  disabled={txPage <= 1}
                  className="h-8 px-[14px] border-line bg-transparent text-bone hover:bg-ink-3 font-mono text-[11px] font-semibold tracking-[0.06em]"
                >
                  Trước
                </Button>
                <span className="font-mono text-[11px] text-mute">
                  {txPage} / {txData.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTxPage((p: number) => Math.min(txData.totalPages, p + 1))}
                  disabled={txPage >= txData.totalPages}
                  className="h-8 px-[14px] border-line bg-transparent text-bone hover:bg-ink-3 font-mono text-[11px] font-semibold tracking-[0.06em]"
                >
                  Tiếp
                </Button>
              </div>
            )}
          </div>

        </div>
      </div>
      </div>

      {showModal && <AddTransactionModal onClose={() => setShowModal(false)}/>}
      {editingTx && <EditTransactionModal tx={editingTx} onClose={() => setEditingTx(null)}/>}
    </>
  );
}

export default function PortfolioPage() {
  return <ProtectedRoute><PortfolioContent /></ProtectedRoute>;
}
