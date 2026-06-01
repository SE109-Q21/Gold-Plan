'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
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

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn('flex items-baseline justify-between py-[14px] border-b border-hairline last:border-0')}>
      <span className="font-mono text-[11px] text-mute tracking-[0.08em]">{label}</span>
      <span className={cn('font-display text-[22px] leading-none font-extrabold tabular-nums', highlight ? 'text-gold' : 'text-chalk')}>
        {value}
      </span>
    </div>
  );
}

export default function FireCalculatorPage() {
  const router = useRouter();

  const [currentSavings, setCurrentSavings] = useState('500000000');
  const [monthlyIncome, setMonthlyIncome] = useState('30000000');
  const [monthlyExpenses, setMonthlyExpenses] = useState('20000000');
  const [annualReturn, setAnnualReturn] = useState('8');
  const [inflation, setInflation] = useState('4');
  const [withdrawalRate, setWithdrawalRate] = useState('4');

  const result = useMemo(() => {
    const savings = parseFloat(currentSavings) || 0;
    const income = parseFloat(monthlyIncome) || 0;
    const expenses = parseFloat(monthlyExpenses) || 0;
    const r = (parseFloat(annualReturn) || 0) / 100;
    const inf = (parseFloat(inflation) || 0) / 100;
    const wr = (parseFloat(withdrawalRate) || 0) / 100;

    if (wr <= 0 || expenses <= 0) return null;

    const annualExpenses = expenses * 12;
    const fireTarget = annualExpenses / wr;
    const realReturn = (1 + r) / (1 + inf) - 1;
    const monthlySavings = income - expenses;

    if (monthlySavings <= 0 && savings >= fireTarget) {
      return { years: 0, fireTarget, annualPassiveIncome: annualExpenses, monthlySavings };
    }
    if (monthlySavings <= 0) return null;

    // Future value of lump sum + annuity
    let years = 0;
    let portfolio = savings;
    const monthlyRate = realReturn / 12;
    const maxYears = 100;

    while (portfolio < fireTarget && years < maxYears) {
      portfolio = portfolio * (1 + monthlyRate) + monthlySavings;
      years += 1 / 12;
    }

    return {
      years: Math.ceil(years),
      fireTarget,
      annualPassiveIncome: fireTarget * wr,
      monthlySavings,
    };
  }, [currentSavings, monthlyIncome, monthlyExpenses, annualReturn, inflation, withdrawalRate]);

  const [resultVersion, setResultVersion] = useState(0);
  const [displayYears, setDisplayYears] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const countUpRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!result) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setResultVersion(v => v + 1), 350);
    return () => clearTimeout(debounceRef.current);
  }, [result]);

  useEffect(() => {
    cancelAnimationFrame(countUpRef.current!);
    if (!result || result.years === 0) {
      const id = window.setTimeout(() => setDisplayYears(0), 0);
      return () => window.clearTimeout(id);
    }
    const target = result.years;
    const t0 = performance.now();
    const run = (now: number) => {
      const p = Math.min((now - t0) / 900, 1);
      setDisplayYears(Math.round((1 - (1 - p) ** 3) * target));
      if (p < 1) countUpRef.current = requestAnimationFrame(run);
    };
    countUpRef.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(countUpRef.current!);
  }, [result, resultVersion]);

  function fmtVnd(n: number) {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + ' tỷ ₫';
    return (n / 1_000_000).toFixed(2) + ' triệu ₫';
  }

  return (
    <div className="h-full overflow-auto bg-ink">
      <style>{`
        @keyframes result-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes years-pop {
          0%   { opacity: 0; transform: scale(0.65); }
          65%  { transform: scale(1.06); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes celebrate-in {
          0%   { opacity: 0; transform: scale(0.4) rotate(-12deg); }
          60%  { transform: scale(1.15) rotate(6deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
      `}</style>
      <div className="p-[32px_24px_60px] flex flex-col items-center">
      <div className="w-full max-w-[800px]">

        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="text-mute flex items-center gap-[6px] font-mono text-[12px] font-semibold tracking-[0.08em] p-0 pb-6 h-auto hover:bg-transparent hover:text-bone"
        >
          <IconArrowLeft s={14}/> quay lại dashboard
        </Button>

        <div className="mb-8">
          <h1 className="font-display text-[40px] leading-none font-extrabold tracking-[-0.03em] text-chalk m-0 capitalize">
            FIRE Calculator
          </h1>
          <p className="font-display text-[14px] leading-[1.5] text-mute m-0 mt-2">
            Ước tính thời gian đến tự do tài chính &amp; nghỉ hưu sớm (Financial Independence, Retire Early)
          </p>
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {/* Inputs */}
          <div className="bg-ink-2 border border-line rounded-[14px] p-[24px_28px] flex flex-col gap-5">
            <SectionLabel>Thông tin tài chính</SectionLabel>
            <NumInput label="Tổng tài sản hiện tại" value={currentSavings} onChange={setCurrentSavings} placeholder="500000000" suffix="₫" money/>
            <NumInput label="Thu nhập hàng tháng" value={monthlyIncome} onChange={setMonthlyIncome} placeholder="30000000" suffix="₫" money/>
            <NumInput label="Chi tiêu hàng tháng" value={monthlyExpenses} onChange={setMonthlyExpenses} placeholder="20000000" suffix="₫" money/>
            <NumInput label="Lãi suất đầu tư / năm" value={annualReturn} onChange={setAnnualReturn} placeholder="8" suffix="%"/>
            <NumInput label="Lạm phát ước tính / năm" value={inflation} onChange={setInflation} placeholder="4" suffix="%"/>
            <NumInput label="Tỷ lệ rút tiền / năm (Safe Withdrawal Rate)" value={withdrawalRate} onChange={setWithdrawalRate} placeholder="4" suffix="%"/>
          </div>

          {/* Results */}
          <div className="flex flex-col gap-5">
            <div key={resultVersion} className="bg-ink-2 border border-line rounded-[14px] p-[24px_28px]" style={{ animation: 'result-in 0.4s ease-out both' }}>
              <SectionLabel>Kết quả ước tính</SectionLabel>
              {!result ? (
                <div className="py-6 text-center text-mute font-mono text-[13px]">
                  Nhập thu nhập lớn hơn chi tiêu để tính được
                </div>
              ) : (
                <>
                  {result.years === 0 ? (
                    <div className="py-4 text-center">
                      <div className="text-[48px] leading-none font-extrabold text-gold" style={{ animation: 'celebrate-in 0.65s cubic-bezier(0.34,1.56,0.64,1) both' }}>🎉</div>
                      <div className="font-display text-[22px] font-extrabold text-gold mt-3" style={{ animation: 'result-in 0.4s ease-out 0.15s both' }}>Bạn đã đạt FIRE!</div>
                      <div className="font-mono text-[12px] text-mute mt-2">Tài sản hiện tại đủ để nghỉ hưu</div>
                    </div>
                  ) : (
                    <div className="text-center py-4 mb-4 border-b border-hairline">
                      <div className="font-mono text-[11px] text-mute tracking-[0.12em] uppercase mb-1">Số năm đến FIRE</div>
                      <div className="font-display text-[72px] leading-none font-extrabold text-gold tabular-nums" style={{ animation: 'years-pop 0.55s cubic-bezier(0.34,1.56,0.64,1) both' }}>{displayYears}</div>
                      <div className="font-mono text-[12px] text-mute mt-1">năm nữa</div>
                    </div>
                  )}
                  <ResultRow label="Tổng tài sản cần đạt" value={fmtVnd(result.fireTarget)} highlight/>
                  <ResultRow label="Thu nhập thụ động / năm" value={fmtVnd(result.annualPassiveIncome)}/>
                  <ResultRow label="Thu nhập thụ động / tháng" value={fmtVnd(result.annualPassiveIncome / 12)}/>
                  <ResultRow label="Tiết kiệm hàng tháng" value={fmtVnd(result.monthlySavings)}/>
                </>
              )}
            </div>

            <div className="p-[16px_20px] bg-[rgba(212,175,55,0.04)] border border-[rgba(212,175,55,0.12)] rounded-[10px]">
              <SectionLabel>Ghi chú</SectionLabel>
              <ul className="font-mono text-[11px] leading-[1.7] text-mute list-disc list-inside space-y-1">
                <li>Tỷ lệ rút tiền 4%/năm là quy tắc phổ biến (Quy tắc 4%)</li>
                <li>Lãi suất thực = lãi suất đầu tư trừ lạm phát</li>
                <li>Kết quả chỉ mang tính tham khảo, không phải tư vấn tài chính</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
      </div>
    </div>
  );
}
