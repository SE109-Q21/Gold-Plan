'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';

function IconArrowLeft({ s = 16 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
    </svg>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[9px] leading-none font-bold tracking-[0.16em] uppercase text-mute mb-[10px]">
      {children}
    </div>
  );
}

function NumInput({
  label, value, onChange, placeholder, suffix, money,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; suffix?: string; money?: boolean;
}) {
  const inputCls = 'bg-ink-3 border-line text-chalk font-display text-[18px] leading-none font-bold p-[10px_14px] h-auto focus-visible:ring-gold placeholder:text-mute flex-1';
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className="flex items-center gap-2">
        {money ? (
          <MoneyInput value={value} onChange={onChange} placeholder={placeholder ?? '0'} className={inputCls}/>
        ) : (
          <Input
            type="number"
            min="0"
            step="any"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder ?? '0'}
            className={inputCls}
          />
        )}
        {suffix && <span className="font-mono text-[13px] text-mute shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

type Freq = 'yearly' | 'semi' | 'quarterly' | 'monthly';
const FREQ_LABELS: Record<Freq, string> = {
  yearly: 'Hàng năm',
  semi: 'Nửa năm',
  quarterly: 'Hàng quý',
  monthly: 'Hàng tháng',
};
const FREQ_N: Record<Freq, number> = { yearly: 1, semi: 2, quarterly: 4, monthly: 12 };

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn(
        'h-7 px-3 rounded-md font-mono text-[11px] leading-none font-bold tracking-[0.06em]',
        active
          ? 'border-gold bg-[rgba(212,175,55,0.12)] text-gold hover:bg-[rgba(212,175,55,0.18)] hover:text-gold'
          : 'border-line bg-transparent text-bone hover:bg-ink-3 hover:text-bone',
      )}
    >
      {children}
    </Button>
  );
}

function ResultRow({ label, value, color, big }: { label: string; value: string; color?: string; big?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-[14px] border-b border-hairline last:border-0">
      <span className="font-mono text-[11px] text-mute tracking-[0.08em]">{label}</span>
      <span className={cn('font-display leading-none font-extrabold tabular-nums', big ? 'text-[26px]' : 'text-[20px]', color ?? 'text-chalk')}>
        {value}
      </span>
    </div>
  );
}

export default function CompoundInterestPage() {
  const router = useRouter();

  const [principal, setPrincipal] = useState('100000000');
  const [annualRate, setAnnualRate] = useState('8');
  const [freq, setFreq] = useState<Freq>('monthly');
  const [monthlyDeposit, setMonthlyDeposit] = useState('5000000');
  const [years, setYears] = useState('10');

  const result = useMemo(() => {
    const p = parseFloat(principal) || 0;
    const r = (parseFloat(annualRate) || 0) / 100;
    const n = FREQ_N[freq];
    const md = parseFloat(monthlyDeposit) || 0;
    const y = parseFloat(years) || 0;
    if (y <= 0 || r < 0) return null;

    const rPerPeriod = r / n;
    const periods = n * y;

    // Future value of lump sum
    const fvLump = p * Math.pow(1 + rPerPeriod, periods);

    // Future value of periodic deposit (convert monthly to per-period)
    const depositPerPeriod = md * (12 / n);
    const fvDeposits = depositPerPeriod > 0 && rPerPeriod > 0
      ? depositPerPeriod * ((Math.pow(1 + rPerPeriod, periods) - 1) / rPerPeriod)
      : depositPerPeriod * periods;

    const total = fvLump + fvDeposits;
    const totalDeposited = p + md * 12 * y;
    const totalInterest = total - totalDeposited;

    return { total, totalDeposited, totalInterest, fvLump, fvDeposits };
  }, [principal, annualRate, freq, monthlyDeposit, years]);

  function fmtVnd(n: number) {
    if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(3) + ' tỷ ₫';
    if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + ' triệu ₫';
    return n.toLocaleString('vi-VN') + ' ₫';
  }

  // Growth bar percentage
  const interestPct = result && result.totalDeposited > 0
    ? Math.min((result.totalInterest / result.total) * 100, 100)
    : 0;

  return (
    <div className="h-full overflow-auto bg-ink">
      <div className="p-[32px_24px_60px] flex flex-col items-center">
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
            Máy tính lãi kép
          </h1>
          <p className="font-display text-[14px] leading-[1.5] text-mute m-0 mt-2">
            Tính tăng trưởng tài sản theo lãi kép — bao gồm vốn ban đầu, góp thêm định kỳ và tần suất ghép lãi
          </p>
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: '1.1fr 1fr' }}>
          {/* Inputs */}
          <div className="bg-ink-2 border border-line rounded-[14px] p-[24px_28px] flex flex-col gap-5">
            <NumInput label="Vốn ban đầu" value={principal} onChange={setPrincipal} placeholder="100000000" suffix="₫" money/>
            <NumInput label="Lãi suất / năm" value={annualRate} onChange={setAnnualRate} placeholder="8" suffix="%"/>

            <div>
              <SectionLabel>Tần suất ghép lãi</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(FREQ_LABELS) as Freq[]).map(f => (
                  <Chip key={f} active={freq === f} onClick={() => setFreq(f)}>{FREQ_LABELS[f]}</Chip>
                ))}
              </div>
            </div>

            <NumInput label="Góp thêm hàng tháng (tùy chọn)" value={monthlyDeposit} onChange={setMonthlyDeposit} placeholder="0" suffix="₫" money/>
            <NumInput label="Số năm đầu tư" value={years} onChange={setYears} placeholder="10" suffix="năm"/>
          </div>

          {/* Results */}
          <div className="flex flex-col gap-5">
            <div className="bg-ink-2 border border-line rounded-[14px] p-[24px_28px]">
              <SectionLabel>Kết quả sau {years || '?'} năm</SectionLabel>
              {!result ? (
                <div className="py-6 text-center text-mute font-mono text-[13px]">Nhập số liệu để tính</div>
              ) : (
                <>
                  <div className="text-center py-5 border-b border-hairline mb-1">
                    <div className="font-mono text-[10px] text-mute tracking-[0.12em] uppercase mb-2">Tổng tài sản</div>
                    <div className="font-display text-[48px] leading-none font-extrabold text-gold tabular-nums">
                      {(result.total / 1_000_000_000).toFixed(3)}
                    </div>
                    <div className="font-mono text-[14px] text-gold mt-1">tỷ đồng</div>
                  </div>

                  {/* Growth bar */}
                  <div className="py-4 border-b border-hairline">
                    <div className="flex justify-between font-mono text-[10px] text-mute mb-2">
                      <span>Vốn gốc</span>
                      <span>Lãi kép</span>
                    </div>
                    <div className="h-3 bg-ink-3 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[linear-gradient(90deg,#3B82F6,#D4AF37)] rounded-full transition-all duration-500"
                        style={{ width: `${interestPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between font-mono text-[10px] mt-1">
                      <span className="text-[#3B82F6]">{(100 - interestPct).toFixed(0)}%</span>
                      <span className="text-gold">{interestPct.toFixed(0)}%</span>
                    </div>
                  </div>

                  <ResultRow label="Tổng tài sản" value={fmtVnd(result.total)} color="text-gold" big/>
                  <ResultRow label="Tổng vốn đã bỏ vào" value={fmtVnd(result.totalDeposited)}/>
                  <ResultRow label="Tổng lãi kép kiếm được" value={fmtVnd(result.totalInterest)} color="text-up"/>
                  <ResultRow label="Lãi kép / vốn gốc" value={`×${(result.total / (parseFloat(principal) || 1)).toFixed(2)}`} color="text-up"/>
                </>
              )}
            </div>

            <div className="p-[16px_20px] bg-[rgba(212,175,55,0.04)] border border-[rgba(212,175,55,0.12)] rounded-[10px]">
              <SectionLabel>Tham khảo lãi suất</SectionLabel>
              <div className="font-mono text-[11px] leading-[1.8] text-mute">
                <div>Gửi ngân hàng 12 tháng: ~5–6%/năm</div>
                <div>Trái phiếu chính phủ: ~6–7%/năm</div>
                <div>Chứng khoán VN30 lịch sử: ~10–12%/năm</div>
                <div>Vàng SJC lịch sử 10 năm: ~8–10%/năm</div>
              </div>
            </div>
          </div>
        </div>

      </div>
      </div>
    </div>
  );
}
