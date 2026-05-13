'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDcaSimulate } from '@/lib/dca.api';
import type { DcaDataPointDto } from '@gpls/shared';

// ─── Constants ────────────────────────────────────────────────────────────────

type Brand = 'SJC' | 'DOJI';
type Frequency = 'weekly' | 'monthly';

const BRAND_GOLD_TYPE: Record<Brand, string> = {
  SJC:  'MIEN_SJC',
  DOJI: 'NHAN_9999',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
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
        padding: '8px 16px',
        borderRadius: 6,
        cursor: 'pointer',
        transition: 'border-color 140ms, background 140ms, color 140ms',
      }}
    >
      {label}
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

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  valueStyle,
  sub,
}: {
  label: string;
  value: string;
  valueStyle?: React.CSSProperties;
  sub?: string;
}) {
  return (
    <div style={{
      background: 'var(--ink-2)',
      border: '1px solid var(--line)',
      borderRadius: 14,
      padding: '16px 20px',
      flex: '1 1 140px',
      minWidth: 0,
    }}>
      <div style={{
        font: '700 9px/1 var(--font-mono)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--mute)',
        marginBottom: 10,
      }}>
        {label}
      </div>
      <div style={{
        font: '700 20px/1 var(--font-display)',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.02em',
        color: 'var(--chalk)',
        ...valueStyle,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          font: '500 10px/1.4 var(--font-mono)',
          color: 'var(--mute)',
          marginTop: 6,
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── DCA Chart ───────────────────────────────────────────────────────────────

function DcaChart({ points }: { points: DcaDataPointDto[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (points.length < 2) return null;

  const W = 800, H = 240, PAD = 40;

  const maxVal = Math.max(...points.flatMap(p => [p.cumulativeValue, p.lumpSumValue]));
  const minVal = Math.min(...points.flatMap(p => [p.cumulativeValue, p.lumpSumValue]));
  const range = maxVal - minVal || 1;

  const xFor = (i: number) => PAD + (i / (points.length - 1)) * (W - 2 * PAD);
  const yFor = (v: number) => H - PAD - ((v - minVal) / range) * (H - 2 * PAD);

  const dcaPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(p.cumulativeValue).toFixed(1)}`)
    .join(' ');
  const lsPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(p.lumpSumValue).toFixed(1)}`)
    .join(' ');

  // X-axis labels: show up to 6 evenly spaced
  const labelStep = Math.max(1, Math.floor(points.length / 6));
  const xLabels = points
    .map((p, i) => ({ i, date: p.date }))
    .filter((_, i) => i % labelStep === 0 || i === points.length - 1);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const xMouse = (e.clientX - rect.left) * scaleX;
    const plotW = W - 2 * PAD;
    const fraction = Math.min(1, Math.max(0, (xMouse - PAD) / plotW));
    const idx = Math.round(fraction * (points.length - 1));
    setHoverIdx(idx);
  };

  const hp = hoverIdx !== null ? points[hoverIdx] : null;
  const hx = hoverIdx !== null ? xFor(hoverIdx) : 0;

  return (
    <div style={{ position: 'relative' }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 99, background: '#60A5FA', display: 'inline-block' }}/>
          <span style={{ font: '600 10px/1 var(--font-mono)', color: 'var(--bone)', letterSpacing: '0.06em' }}>DCA Strategy</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 99, background: '#F97316', display: 'inline-block' }}/>
          <span style={{ font: '600 10px/1 var(--font-mono)', color: 'var(--bone)', letterSpacing: '0.06em' }}>Lump Sum</span>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(f => {
          const y = yFor(minVal + f * range);
          return (
            <line key={f} x1={PAD} y1={y.toFixed(1)} x2={W - PAD} y2={y.toFixed(1)}
              stroke="var(--line)" strokeWidth="0.5" strokeDasharray="4 4"/>
          );
        })}

        {/* Lump sum path */}
        <path d={lsPath} stroke="#F97316" strokeWidth="2" fill="none" strokeLinejoin="round"/>
        {/* DCA path */}
        <path d={dcaPath} stroke="#60A5FA" strokeWidth="2" fill="none" strokeLinejoin="round"/>

        {/* X-axis labels */}
        {xLabels.map(({ i, date }) => (
          <text key={i} x={xFor(i).toFixed(1)} y={H - 8} textAnchor="middle"
            style={{ font: '500 9px var(--font-mono)', fill: 'var(--mute)' }}>
            {date.slice(5)} {/* MM-DD */}
          </text>
        ))}

        {/* Hover crosshair */}
        {hoverIdx !== null && hp && (
          <>
            <line
              x1={hx.toFixed(1)} y1={PAD}
              x2={hx.toFixed(1)} y2={H - PAD}
              stroke="var(--line)" strokeWidth="1"
            />
            <circle cx={hx.toFixed(1)} cy={yFor(hp.cumulativeValue).toFixed(1)} r="4"
              fill="#60A5FA" stroke="var(--ink-2)" strokeWidth="1.5"/>
            <circle cx={hx.toFixed(1)} cy={yFor(hp.lumpSumValue).toFixed(1)} r="4"
              fill="#F97316" stroke="var(--ink-2)" strokeWidth="1.5"/>

            {/* Tooltip box */}
            {(() => {
              const tx = hx > W * 0.65 ? hx - 158 : hx + 12;
              return (
                <g>
                  <rect x={tx} y={PAD} width={148} height={72} rx={6}
                    fill="var(--ink-3)" stroke="var(--line)" strokeWidth="0.75"/>
                  <text x={tx + 10} y={PAD + 16}
                    style={{ font: '600 10px var(--font-mono)', fill: 'var(--mute)' }}>
                    {hp.date}
                  </text>
                  <circle cx={tx + 10} cy={PAD + 31} r="3" fill="#60A5FA"/>
                  <text x={tx + 18} y={PAD + 34}
                    style={{ font: '600 10px var(--font-mono)', fill: 'var(--bone)' }}>
                    {fmtMillions(hp.cumulativeValue)}
                  </text>
                  <circle cx={tx + 10} cy={PAD + 50} r="3" fill="#F97316"/>
                  <text x={tx + 18} y={PAD + 53}
                    style={{ font: '600 10px var(--font-mono)', fill: 'var(--bone)' }}>
                    {fmtMillions(hp.lumpSumValue)}
                  </text>
                </g>
              );
            })()}
          </>
        )}
      </svg>
    </div>
  );
}

// ─── Back arrow icon ──────────────────────────────────────────────────────────

function IconArrowLeft({ s = 16 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
    </svg>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DcaSimulatorPage() {
  const router = useRouter();

  const [brand, setBrand] = useState<Brand>('SJC');
  const [startDate, setStartDate] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [qty, setQty] = useState(0.5);
  const [submitted, setSubmitted] = useState(false);

  const goldType = BRAND_GOLD_TYPE[brand];
  const maxDate = todayMinus14();

  const params = submitted && startDate
    ? { brand, goldType, startDate, frequency, qtyPerPurchase: qty }
    : null;

  const { data, isLoading, error } = useDcaSimulate(params);

  const handleSimulate = () => {
    if (!startDate) return;
    setSubmitted(true);
  };

  // P&L helpers
  const pnlColor = (v: number) => v >= 0 ? 'var(--up)' : 'var(--down)';
  const pnlArrow = (v: number) => v >= 0 ? '▲' : '▼';

  // Strategy comparison
  const dcaWon = data ? data.dcaPnlPct >= data.lumpSumPnlPct : false;

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .dca-input:focus { outline: none; border-color: var(--gold) !important; }
        .dca-input::placeholder { color: var(--mute); }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }
      `}</style>

      <div style={{
        minHeight: '100%',
        background: '#0a0a0d',
        padding: '32px 24px 60px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <div style={{ width: '100%', maxWidth: 860 }}>

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
              dca simulator
            </h1>
            <p style={{
              font: '400 14px/1.5 var(--font-display)',
              color: 'var(--mute)',
              margin: '8px 0 0',
            }}>
              Compare Dollar-Cost Averaging vs Lump Sum investing in gold
            </p>
          </div>

          {/* Controls card */}
          <div style={{
            background: 'var(--ink-2)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            padding: '24px 28px',
            marginBottom: 24,
          }}>

            {/* Brand */}
            <div style={{ marginBottom: 24 }}>
              <SectionLabel>Brand</SectionLabel>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['SJC', 'DOJI'] as Brand[]).map(b => (
                  <Chip
                    key={b}
                    label={b}
                    selected={brand === b}
                    onClick={() => { setBrand(b); setSubmitted(false); }}
                  />
                ))}
              </div>
            </div>

            {/* Gold type (auto) */}
            <div style={{ marginBottom: 24 }}>
              <SectionLabel>Gold type (auto)</SectionLabel>
              <div style={{
                display: 'inline-block',
                border: '1px solid var(--line)',
                background: 'var(--ink-3)',
                color: 'var(--mute)',
                font: '700 12px/1 var(--font-mono)',
                letterSpacing: '0.08em',
                padding: '8px 16px',
                borderRadius: 6,
              }}>
                {goldType}
              </div>
            </div>

            {/* Row: start date + frequency + qty */}
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>

              {/* Start date */}
              <div>
                <SectionLabel>Start date</SectionLabel>
                <input
                  className="dca-input"
                  type="date"
                  max={maxDate}
                  value={startDate}
                  onChange={e => { setStartDate(e.target.value); setSubmitted(false); }}
                  style={{
                    background: 'var(--ink-3)',
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    color: 'var(--chalk)',
                    font: '600 14px/1 var(--font-mono)',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    transition: 'border-color 140ms',
                  }}
                />
              </div>

              {/* Frequency */}
              <div>
                <SectionLabel>Purchase frequency</SectionLabel>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['weekly', 'monthly'] as Frequency[]).map(f => (
                    <Chip
                      key={f}
                      label={f}
                      selected={frequency === f}
                      onClick={() => { setFrequency(f); setSubmitted(false); }}
                    />
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <SectionLabel>Qty per purchase</SectionLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    className="dca-input"
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={qty}
                    onChange={e => { setQty(parseFloat(e.target.value) || 0.1); setSubmitted(false); }}
                    style={{
                      background: 'var(--ink-3)',
                      border: '1px solid var(--line)',
                      borderRadius: 8,
                      color: 'var(--chalk)',
                      font: '700 20px/1 var(--font-display)',
                      padding: '10px 14px',
                      width: 100,
                      textAlign: 'right',
                      transition: 'border-color 140ms',
                    }}
                  />
                  <span style={{ font: '600 12px/1 var(--font-mono)', color: 'var(--mute)', letterSpacing: '0.08em' }}>
                    tael
                  </span>
                </div>
              </div>
            </div>

            {/* Simulate button */}
            <div style={{ marginTop: 28 }}>
              <button
                onClick={handleSimulate}
                disabled={!startDate}
                style={{
                  background: startDate ? 'var(--gold)' : 'var(--ink-3)',
                  border: 0,
                  borderRadius: 8,
                  cursor: startDate ? 'pointer' : 'not-allowed',
                  font: '700 13px/1 var(--font-display)',
                  color: startDate ? '#0B0B0F' : 'var(--mute)',
                  letterSpacing: '0.04em',
                  padding: '12px 28px',
                  transition: 'background 140ms, color 140ms',
                }}
              >
                {isLoading ? 'Simulating…' : 'Simulate'}
              </button>
              {!startDate && (
                <span style={{ font: '500 11px/1 var(--font-mono)', color: 'var(--mute)', marginLeft: 14, letterSpacing: '0.06em' }}>
                  pick a start date to begin
                </span>
              )}
            </div>
          </div>

          {/* Loading spinner */}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--mute)' }}>
              <div style={{
                width: 28, height: 28, border: '2px solid var(--line)',
                borderTopColor: 'var(--gold)', borderRadius: 99,
                margin: '0 auto 12px',
                animation: 'spin 0.8s linear infinite',
              }}/>
              <div style={{ font: '500 12px/1 var(--font-mono)', letterSpacing: '0.08em' }}>
                running simulation…
              </div>
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10,
              padding: '16px 20px',
              font: '500 13px/1.5 var(--font-display)',
              color: 'var(--down)',
              marginBottom: 24,
            }}>
              {(error as Error).message ?? 'Failed to run simulation. Please try again.'}
            </div>
          )}

          {/* Results */}
          {data && !isLoading && (
            <>
              {/* Stat cards */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <StatCard
                  label="Avg Cost"
                  value={fmtMillions(data.averageCostVnd)}
                  sub="per tael (DCA)"
                />
                <StatCard
                  label="Total Gold"
                  value={data.totalGoldTael.toFixed(2) + ' tael'}
                />
                <StatCard
                  label="Total Spent"
                  value={fmtMillions(data.totalSpentVnd)}
                />
                <StatCard
                  label="Current Value"
                  value={fmtMillions(data.currentValueVnd)}
                />
                <StatCard
                  label="DCA P&L"
                  value={`${pnlArrow(data.dcaPnlVnd)} ${fmtMillions(Math.abs(data.dcaPnlVnd))}`}
                  valueStyle={{ color: pnlColor(data.dcaPnlVnd) }}
                  sub={`${data.dcaPnlPct >= 0 ? '+' : ''}${data.dcaPnlPct.toFixed(2)}%`}
                />
              </div>

              {/* Comparison card */}
              <div style={{
                background: 'var(--ink-2)',
                border: `1px solid ${dcaWon ? 'rgba(157,204,110,0.3)' : 'rgba(249,115,22,0.3)'}`,
                borderRadius: 14,
                padding: '16px 24px',
                marginBottom: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ font: '700 9px/1 var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mute)', marginBottom: 8 }}>
                    strategy comparison
                  </div>
                  <div style={{ font: '600 14px/1.4 var(--font-display)', color: 'var(--chalk)' }}>
                    {dcaWon
                      ? <><span style={{ color: 'var(--up)' }}>DCA wins</span> — higher return than lump sum</>
                      : <><span style={{ color: 'var(--gold)' }}>Lump Sum wins</span> — higher return than DCA</>
                    }
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 32 }}>
                  <div>
                    <div style={{ font: '700 9px/1 var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mute)', marginBottom: 6 }}>DCA return</div>
                    <div style={{ font: '700 20px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums', color: pnlColor(data.dcaPnlPct) }}>
                      {data.dcaPnlPct >= 0 ? '+' : ''}{data.dcaPnlPct.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div style={{ font: '700 9px/1 var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mute)', marginBottom: 6 }}>Lump Sum return</div>
                    <div style={{ font: '700 20px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums', color: pnlColor(data.lumpSumPnlPct) }}>
                      {data.lumpSumPnlPct >= 0 ? '+' : ''}{data.lumpSumPnlPct.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart card */}
              {data.dataPoints && data.dataPoints.length >= 2 && (
                <div style={{
                  background: 'var(--ink-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 14,
                  padding: '20px 24px',
                }}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ font: '700 12px/1 var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--bone)' }}>
                      Portfolio Value Over Time
                    </div>
                    <div style={{ font: '500 11px/1.5 var(--font-mono)', color: 'var(--mute)', marginTop: 4 }}>
                      {data.dataPoints.length} data points · {data.dataPoints[0]?.date} → {data.dataPoints[data.dataPoints.length - 1]?.date}
                    </div>
                  </div>
                  <DcaChart points={data.dataPoints}/>
                </div>
              )}

              {/* Lump sum detail */}
              <div style={{
                marginTop: 16,
                padding: '14px 20px',
                background: 'rgba(212,175,55,0.04)',
                border: '1px solid rgba(212,175,55,0.12)',
                borderRadius: 10,
                display: 'flex',
                gap: '8px 40px',
                flexWrap: 'wrap',
              }}>
                <LumpSumDetail label="Lump Sum cost" value={fmtVnd(data.lumpSumCostVnd)}/>
                <LumpSumDetail label="Lump Sum current value" value={fmtVnd(data.lumpSumCurrentValueVnd)}/>
                <LumpSumDetail label="Lump Sum P&L" value={`${data.lumpSumPnlPct >= 0 ? '+' : ''}${data.lumpSumPnlPct.toFixed(2)}%`}/>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}

function LumpSumDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ font: '600 9px/1 var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mute)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ font: '600 12px/1.4 var(--font-mono)', color: 'var(--bone)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  );
}
