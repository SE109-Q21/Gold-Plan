'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDcaSimulate } from '@/lib/dca.api';
import { useAddTransaction } from '@/lib/portfolio.api';
import { useAuth } from '@/contexts/auth-context';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import type { DcaDataPointDto } from '@gpls/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Brand = 'SJC' | 'DOJI' | 'PNJ' | 'BAO_TIN';
type Frequency = 'weekly' | 'monthly';

const BRAND_GOLD_TYPE: Record<Brand, string> = {
  SJC:     'MIEN_SJC',
  DOJI:    'NHAN_9999',
  PNJ:     'VANG_24K',
  BAO_TIN: 'VANG_24K',
};

function fmtMillions(v: number): string {
  return (v / 1_000_000).toFixed(2) + 'M₫';
}

function fmtVnd(v: number): string {
  return v.toLocaleString('vi-VN') + ' ₫';
}

function todayMinus14(): string {
  const d = new Date();
  d.setDate(d.getDate() - 14);
  return d.toISOString().split('T')[0];
}

const CHIP_BASE = 'font-mono text-[12px] leading-none font-bold tracking-[0.08em] px-4 py-2 rounded-md border cursor-pointer transition-[border-color,background,color] duration-[140ms]';

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn(CHIP_BASE, 'h-auto', selected
        ? 'border-gold bg-[rgba(212,175,55,0.12)] text-gold hover:bg-[rgba(212,175,55,0.18)] hover:text-gold'
        : 'border-line bg-transparent text-bone hover:bg-ink-3 hover:text-bone'
      )}
    >
      {label}
    </Button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[9px] leading-none font-bold tracking-[0.16em] uppercase text-mute mb-[10px]">
      {children}
    </div>
  );
}

function StatCard({ label, value, valueClass, sub }: { label: string; value: string; valueClass?: string; sub?: string }) {
  return (
    <div className="bg-ink-2 border border-line rounded-[14px] p-[16px_20px] flex-[1_1_140px] min-w-0">
      <div className="font-mono text-[9px] leading-none font-bold tracking-[0.14em] uppercase text-mute mb-[10px]">
        {label}
      </div>
      <div className={cn('font-display text-[20px] leading-none font-bold [font-variant-numeric:tabular-nums] tracking-[-0.02em] text-chalk', valueClass)}>
        {value}
      </div>
      {sub && (
        <div className="font-mono text-[10px] leading-[1.4] text-mute mt-[6px]">
          {sub}
        </div>
      )}
    </div>
  );
}

function LumpSumDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] leading-none font-semibold tracking-[0.12em] uppercase text-mute mb-1">
        {label}
      </div>
      <div className="font-mono text-[12px] leading-[1.4] font-semibold text-bone [font-variant-numeric:tabular-nums]">
        {value}
      </div>
    </div>
  );
}

function IconArrowLeft({ s = 16 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
    </svg>
  );
}

function DcaChart({ points, altPoints, altLabel }: {
  points: DcaDataPointDto[];
  altPoints?: DcaDataPointDto[];
  altLabel?: string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (points.length < 2) return null;

  const W = 800, H = 240, PAD = 40;

  const allValues = [
    ...points.flatMap(p => [p.cumulativeValue, p.lumpSumValue]),
    ...(altPoints ? altPoints.map(p => p.cumulativeValue) : []),
  ];
  const maxVal = Math.max(...allValues);
  const minVal = Math.min(...allValues);
  const range = maxVal - minVal || 1;

  const xFor = (i: number) => PAD + (i / (points.length - 1)) * (W - 2 * PAD);
  const yFor = (v: number) => H - PAD - ((v - minVal) / range) * (H - 2 * PAD);

  const dcaPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(p.cumulativeValue).toFixed(1)}`).join(' ');
  const lsPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(p.lumpSumValue).toFixed(1)}`).join(' ');

  const altPath = altPoints && altPoints.length > 1
    ? altPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(p.cumulativeValue).toFixed(1)}`).join(' ')
    : null;

  const labelStep = Math.max(1, Math.floor(points.length / 6));
  const xLabels = points.map((p, i) => ({ i, date: p.date })).filter((_, i) => i % labelStep === 0 || i === points.length - 1);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const xMouse = (e.clientX - rect.left) * scaleX;
    const fraction = Math.min(1, Math.max(0, (xMouse - PAD) / (W - 2 * PAD)));
    setHoverIdx(Math.round(fraction * (points.length - 1)));
  };

  const hp = hoverIdx !== null ? points[hoverIdx] : null;
  const hx = hoverIdx !== null ? xFor(hoverIdx) : 0;
  const altHp = hoverIdx !== null && altPoints ? altPoints[Math.min(hoverIdx, altPoints.length - 1)] : null;

  return (
    <div className="relative">
      <div className="flex gap-5 mb-3">
        <div className="flex items-center gap-[6px]">
          <span className="w-[10px] h-[10px] rounded-full bg-[#60A5FA] inline-block"/>
          <span className="font-mono text-[10px] leading-none font-semibold text-bone tracking-[0.06em]">DCA Strategy</span>
        </div>
        <div className="flex items-center gap-[6px]">
          <span className="w-[10px] h-[10px] rounded-full bg-[#F97316] inline-block"/>
          <span className="font-mono text-[10px] leading-none font-semibold text-bone tracking-[0.06em]">Lump Sum</span>
        </div>
        {altPath && (
          <div className="flex items-center gap-[6px]">
            <span className="w-[10px] h-[10px] rounded-full bg-[#34D399] inline-block"/>
            <span className="font-mono text-[10px] leading-none font-semibold text-bone tracking-[0.06em]">
              {altLabel ?? 'Alt DCA'}
            </span>
          </div>
        )}
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full block cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {[0.25, 0.5, 0.75].map(f => {
          const y = yFor(minVal + f * range);
          return <line key={f} x1={PAD} y1={y.toFixed(1)} x2={W - PAD} y2={y.toFixed(1)} stroke="var(--line)" strokeWidth="0.5" strokeDasharray="4 4"/>;
        })}
        <path d={lsPath} stroke="#F97316" strokeWidth="2" fill="none" strokeLinejoin="round"/>
        <path d={dcaPath} stroke="#60A5FA" strokeWidth="2" fill="none" strokeLinejoin="round"/>
        {altPath && (
          <path d={altPath} stroke="#34D399" strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeDasharray="5 3"/>
        )}
        {xLabels.map(({ i, date }) => (
          <text key={i} x={xFor(i).toFixed(1)} y={H - 8} textAnchor="middle" style={{ font: '500 9px var(--font-mono)', fill: 'var(--mute)' }}>
            {date.slice(5)}
          </text>
        ))}
        {hoverIdx !== null && hp && (
          <>
            <line x1={hx.toFixed(1)} y1={PAD} x2={hx.toFixed(1)} y2={H - PAD} stroke="var(--line)" strokeWidth="1"/>
            <circle cx={hx.toFixed(1)} cy={yFor(hp.cumulativeValue).toFixed(1)} r="4" fill="#60A5FA" stroke="var(--ink-2)" strokeWidth="1.5"/>
            <circle cx={hx.toFixed(1)} cy={yFor(hp.lumpSumValue).toFixed(1)} r="4" fill="#F97316" stroke="var(--ink-2)" strokeWidth="1.5"/>
            {altHp && altPath && (
              <circle cx={hx.toFixed(1)} cy={yFor(altHp.cumulativeValue).toFixed(1)} r="4" fill="#34D399" stroke="var(--ink-2)" strokeWidth="1.5"/>
            )}
            {(() => {
              const tx = hx > W * 0.65 ? hx - 168 : hx + 12;
              const tooltipH = altHp && altPath ? 90 : 72;
              return (
                <g>
                  <rect x={tx} y={PAD} width={158} height={tooltipH} rx={6} fill="var(--ink-3)" stroke="var(--line)" strokeWidth="0.75"/>
                  <text x={tx + 10} y={PAD + 16} style={{ font: '600 10px var(--font-mono)', fill: 'var(--mute)' }}>{hp.date}</text>
                  <circle cx={tx + 10} cy={PAD + 31} r="3" fill="#60A5FA"/>
                  <text x={tx + 18} y={PAD + 34} style={{ font: '600 10px var(--font-mono)', fill: 'var(--bone)' }}>{fmtMillions(hp.cumulativeValue)}</text>
                  <circle cx={tx + 10} cy={PAD + 50} r="3" fill="#F97316"/>
                  <text x={tx + 18} y={PAD + 53} style={{ font: '600 10px var(--font-mono)', fill: 'var(--bone)' }}>{fmtMillions(hp.lumpSumValue)}</text>
                  {altHp && altPath && (
                    <>
                      <circle cx={tx + 10} cy={PAD + 69} r="3" fill="#34D399"/>
                      <text x={tx + 18} y={PAD + 72} style={{ font: '600 10px var(--font-mono)', fill: 'var(--bone)' }}>{fmtMillions(altHp.cumulativeValue)}</text>
                    </>
                  )}
                </g>
              );
            })()}
          </>
        )}
      </svg>
    </div>
  );
}

function DcaSimulatorContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [brand, setBrand] = useState<Brand>('SJC');
  const [startDate, setStartDate] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [qty, setQty] = useState(0.5);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const goldType = BRAND_GOLD_TYPE[brand];
  const maxDate = todayMinus14();

  const params = submitted && startDate
    ? { brand, goldType, startDate, frequency, qtyPerPurchase: qty }
    : null;

  const altFrequency: Frequency = frequency === 'weekly' ? 'monthly' : 'weekly';
  const altParams = submitted && startDate
    ? { brand, goldType, startDate, frequency: altFrequency, qtyPerPurchase: qty }
    : null;

  const { data, isLoading, error } = useDcaSimulate(params);
  const { data: altData } = useDcaSimulate(altParams);
  const addTransaction = useAddTransaction();

  const handleSimulate = () => {
    if (!startDate) return;
    setSubmitted(true);
    setSaveMsg(null);
  };

  const handleSaveToPortfolio = async () => {
    if (!data || !data.dataPoints.length) return;
    const confirmed = window.confirm(`Lưu ${data.dataPoints.length} giao dịch vào danh mục? Mỗi lần mua ${qty} tael ${brand}.`);
    if (!confirmed) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      for (const point of data.dataPoints) {
        await addTransaction.mutateAsync({
          type: 'BUY', brand, goldType, quantity: qty, pricePerTael: point.price,
          transactedAt: new Date(point.date).toISOString(), note: `DCA simulation — ${frequency}`,
        });
      }
      setSaveMsg(`${data.dataPoints.length} giao dịch đã được lưu vào danh mục`);
    } catch {
      setSaveMsg('Lỗi: không thể lưu giao dịch. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const pnlClass = (v: number) => v >= 0 ? 'text-up' : 'text-down';
  const pnlArrow = (v: number) => v >= 0 ? '▲' : '▼';
  const dcaWon = data ? data.dcaPnlPct >= data.lumpSumPnlPct : false;

  return (
    <div className="min-h-full bg-[#0a0a0d] p-[32px_24px_60px] flex flex-col items-center">
      <div className="w-full max-w-[860px]">

        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="text-mute flex items-center gap-[6px] font-mono text-[12px] font-semibold tracking-[0.08em] p-0 pb-6 h-auto hover:bg-transparent hover:text-bone"
        >
          <IconArrowLeft s={14}/> quay lại dashboard
        </Button>

        <div className="mb-8">
          <h1 className="font-display text-[40px] leading-none font-extrabold tracking-[-0.03em] text-chalk m-0 capitalize">
            mô phỏng DCA
          </h1>
          <p className="font-display text-[14px] leading-[1.5] text-mute m-0 mt-2">
            So sánh đầu tư theo DCA vs Mua một lần vào vàng
          </p>
        </div>

        {/* Controls card */}
        <div className="bg-ink-2 border border-line rounded-[14px] p-[24px_28px] mb-6">
          <div className="mb-6">
            <SectionLabel>Thương hiệu</SectionLabel>
            <div className="flex gap-2">
              {(['SJC', 'DOJI'] as Brand[]).map(b => (
                <Chip key={b} label={b} selected={brand === b} onClick={() => { setBrand(b); setSubmitted(false); }}/>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <SectionLabel>Loại vàng (tự động)</SectionLabel>
            <div className="inline-block border border-line bg-ink-3 text-mute font-mono text-[12px] leading-none font-bold tracking-[0.08em] px-4 py-2 rounded-md">
              {goldType}
            </div>
          </div>

          <div className="flex gap-8 flex-wrap items-start">
            <div>
              <SectionLabel>Ngày bắt đầu</SectionLabel>
              <Input
                type="date"
                max={maxDate}
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setSubmitted(false); }}
                className="bg-ink-3 border-line text-chalk font-mono text-[14px] font-semibold px-[14px] cursor-pointer focus-visible:ring-gold h-[42px] placeholder:text-mute"
              />
            </div>

            <div>
              <SectionLabel>Tần suất mua</SectionLabel>
              <div className="flex gap-2">
                {(['weekly', 'monthly'] as Frequency[]).map(f => (
                  <Chip key={f} label={f === 'weekly' ? 'hàng tuần' : 'hàng tháng'} selected={frequency === f} onClick={() => { setFrequency(f); setSubmitted(false); }}/>
                ))}
              </div>
            </div>

            <div>
              <SectionLabel>Số lượng mỗi lần mua</SectionLabel>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={qty}
                  onChange={e => { setQty(parseFloat(e.target.value) || 0.1); setSubmitted(false); }}
                  className="bg-ink-3 border-line text-chalk font-display text-[20px] font-bold px-[14px] w-[100px] text-right h-[42px] focus-visible:ring-gold placeholder:text-mute"
                />
                <span className="font-mono text-[12px] leading-none font-semibold text-mute tracking-[0.08em]">tael</span>
              </div>
            </div>
          </div>

          <div className="mt-7 flex items-center gap-[14px]">
            <Button
              onClick={handleSimulate}
              disabled={!startDate}
              className="font-display text-[13px] font-bold tracking-[0.04em] px-7 py-3 h-auto"
            >
              {isLoading ? 'Đang mô phỏng…' : 'Mô phỏng'}
            </Button>
            {!startDate && (
              <span className="font-mono text-[11px] leading-none text-mute tracking-[0.06em]">
                chọn ngày bắt đầu để tiếp tục
              </span>
            )}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-10 text-mute">
            <div className="w-7 h-7 border-2 border-line border-t-gold rounded-full mx-auto mb-3 animate-spin"/>
            <div className="font-mono text-[12px] leading-none tracking-[0.08em]">đang chạy mô phỏng…</div>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-[10px] p-[16px_20px] font-display text-[13px] leading-[1.5] text-down mb-6">
            {(error as Error).message ?? 'Chạy mô phỏng thất bại. Vui lòng thử lại.'}
          </div>
        )}

        {/* Results */}
        {data && !isLoading && (
          <>
            <div className="flex gap-3 flex-wrap mb-4">
              <StatCard label="Giá vốn TB" value={fmtMillions(data.averageCostVnd)} sub="mỗi lượng (DCA)"/>
              <StatCard label="Tổng vàng" value={data.totalGoldTael.toFixed(2) + ' lượng'}/>
              <StatCard label="Tổng đã chi" value={fmtMillions(data.totalSpentVnd)}/>
              <StatCard label="Giá trị hiện tại" value={fmtMillions(data.currentValueVnd)}/>
              <StatCard
                label="Lãi/Lỗ DCA"
                value={`${pnlArrow(data.dcaPnlVnd)} ${fmtMillions(Math.abs(data.dcaPnlVnd))}`}
                valueClass={pnlClass(data.dcaPnlVnd)}
                sub={`${data.dcaPnlPct >= 0 ? '+' : ''}${data.dcaPnlPct.toFixed(2)}%`}
              />
            </div>

            {/* Comparison card */}
            <div className={cn(
              'bg-ink-2 rounded-[14px] p-[16px_24px] mb-6 flex items-center gap-5 flex-wrap border',
              dcaWon ? 'border-[rgba(157,204,110,0.3)]' : 'border-[rgba(249,115,22,0.3)]',
            )}>
              <div className="flex-1 min-w-[220px]">
                <div className="font-mono text-[9px] leading-none font-bold tracking-[0.14em] uppercase text-mute mb-2">
                  so sánh chiến lược
                </div>
                <div className="font-display text-[14px] leading-[1.4] font-semibold text-chalk">
                  {dcaWon
                    ? <><span className="text-up">DCA thắng</span> — lợi nhuận cao hơn mua một lần</>
                    : <><span className="text-gold">Mua một lần thắng</span> — lợi nhuận cao hơn DCA</>
                  }
                </div>
              </div>
              <div className="flex gap-8">
                <div>
                  <div className="font-mono text-[9px] leading-none font-bold tracking-[0.12em] uppercase text-mute mb-[6px]">lợi nhuận DCA</div>
                  <div className={cn('font-display text-[20px] leading-none font-bold [font-variant-numeric:tabular-nums]', pnlClass(data.dcaPnlPct))}>
                    {data.dcaPnlPct >= 0 ? '+' : ''}{data.dcaPnlPct.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[9px] leading-none font-bold tracking-[0.12em] uppercase text-mute mb-[6px]">lợi nhuận mua một lần</div>
                  <div className={cn('font-display text-[20px] leading-none font-bold [font-variant-numeric:tabular-nums]', pnlClass(data.lumpSumPnlPct))}>
                    {data.lumpSumPnlPct >= 0 ? '+' : ''}{data.lumpSumPnlPct.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Chart */}
            {data.dataPoints && data.dataPoints.length >= 2 && (
              <div className="bg-ink-2 border border-line rounded-[14px] p-[20px_24px]">
                <div className="mb-4">
                  <div className="font-mono text-[12px] leading-none font-bold tracking-[0.08em] uppercase text-bone">
                    Giá trị danh mục theo thời gian
                  </div>
                  <div className="font-mono text-[11px] leading-[1.5] text-mute mt-1">
                    {data.dataPoints.length} data points · {data.dataPoints[0]?.date} → {data.dataPoints[data.dataPoints.length - 1]?.date}
                  </div>
                </div>
                <DcaChart
                  points={data.dataPoints}
                  altPoints={altData?.dataPoints}
                  altLabel={altFrequency === 'weekly' ? 'DCA hàng tuần' : 'DCA hàng tháng'}
                />
              </div>
            )}

            {/* Lump sum detail */}
            <div className="mt-4 p-[14px_20px] bg-[rgba(212,175,55,0.04)] border border-[rgba(212,175,55,0.12)] rounded-[10px] flex gap-[8px_40px] flex-wrap">
              <LumpSumDetail label="Chi phí mua một lần" value={fmtVnd(data.lumpSumCostVnd)}/>
              <LumpSumDetail label="Giá trị hiện tại (mua 1 lần)" value={fmtVnd(data.lumpSumCurrentValueVnd)}/>
              <LumpSumDetail label="Lãi/Lỗ mua một lần" value={`${data.lumpSumPnlPct >= 0 ? '+' : ''}${data.lumpSumPnlPct.toFixed(2)}%`}/>
            </div>

            {/* Save to Portfolio */}
            {!!user && (
              <div className="mt-5 flex items-center gap-[14px] flex-wrap">
                <Button
                  onClick={handleSaveToPortfolio}
                  disabled={saving}
                  className="h-[42px] px-[22px] font-display text-[13px] font-bold tracking-[0.04em]"
                >
                  {saving ? 'Đang lưu…' : 'Lưu vào danh mục'}
                </Button>
                {saveMsg && (
                  <span className={cn('font-mono text-[12px] leading-[1.4] tracking-[0.04em]', saveMsg.startsWith('Lỗi') ? 'text-down' : 'text-up')}>
                    {saveMsg}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function DcaSimulatorPage() {
  return <ProtectedRoute><DcaSimulatorContent /></ProtectedRoute>;
}
