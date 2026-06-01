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

type Mode = 'future' | 'past';

function ResultCard({ label, value, sub, color, delay = 0 }: { label: string; value: string; sub?: string; color?: string; delay?: number }) {
  return (
    <div className="p-[18px] bg-ink-3 border border-line rounded-[12px]" style={{ animation: `result-in 0.4s ease-out ${delay}ms both` }}>
      <div className="font-mono text-[9px] text-mute tracking-[0.14em] uppercase mb-[8px]">{label}</div>
      <div className={cn('font-display text-[26px] leading-none font-extrabold tabular-nums', color ?? 'text-chalk')}>{value}</div>
      {sub && <div className="font-mono text-[11px] text-mute mt-[6px]">{sub}</div>}
    </div>
  );
}

export default function InflationCalculatorPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('future');
  const [amount, setAmount] = useState('100000000');
  const [inflation, setInflation] = useState('4');
  const [years, setYears] = useState('10');

  const result = useMemo(() => {
    const a = parseFloat(amount) || 0;
    const inf = (parseFloat(inflation) || 0) / 100;
    const y = parseFloat(years) || 0;
    if (a <= 0 || y <= 0) return null;

    if (mode === 'future') {
      // How much will my money be worth in X years?
      const futureValue = a / Math.pow(1 + inf, y);
      const purchasePowerLoss = ((a - futureValue) / a) * 100;
      const neededToKeep = a * Math.pow(1 + inf, y);
      return { futureValue, purchasePowerLoss, neededToKeep, label: 'Sức mua tương đương sau X năm' };
    } else {
      // How much did this money used to be worth?
      const pastValue = a * Math.pow(1 + inf, y);
      const purchasePowerGrowth = ((pastValue - a) / a) * 100;
      return { pastValue, purchasePowerGrowth, label: 'Sức mua X năm trước' };
    }
  }, [amount, inflation, years, mode]);

  const [resultVersion, setResultVersion] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!result) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setResultVersion(v => v + 1), 350);
    return () => clearTimeout(debounceRef.current);
  }, [result]);

  function fmtVnd(n: number) {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(3) + ' tỷ ₫';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + ' triệu ₫';
    return n.toLocaleString('vi-VN') + ' ₫';
  }

  const TAB = 'flex-1 h-[32px] font-mono text-[11px] leading-none font-bold tracking-[0.06em] rounded-[6px] cursor-pointer transition-[background,color] duration-[140ms]';

  return (
    <div className="h-full overflow-auto bg-ink">
      <style>{`
        @keyframes result-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
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
          <h1 className="font-display text-[40px] leading-none font-extrabold tracking-[-0.03em] text-chalk m-0 uppercase">
            Máy tính lạm phát
          </h1>
          <p className="font-display text-[14px] leading-[1.5] text-mute m-0 mt-2">
            Tính giá trị sức mua của tiền theo thời gian
          </p>
        </div>

        {/* Mode tab */}
        <div className="flex gap-0 mb-5 bg-ink-3 border border-line rounded-[8px] p-[3px]">
          {([['future', 'Sức mua tương lai'], ['past', 'Sức mua quá khứ']] as [Mode, string][]).map(([m, lbl]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(TAB, mode === m ? 'bg-gold text-gold-ink' : 'text-mute hover:text-bone')}
            >{lbl}</button>
          ))}
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {/* Inputs */}
          <div className="bg-ink-2 border border-line rounded-[14px] p-[24px_28px] flex flex-col gap-5">
            <NumInput
              label="Số tiền hiện tại"
              value={amount}
              onChange={setAmount}
              placeholder="100000000"
              suffix="₫"
              money
            />
            <NumInput label="Tỷ lệ lạm phát / năm" value={inflation} onChange={setInflation} placeholder="4" suffix="%"/>
            <NumInput label="Số năm" value={years} onChange={setYears} placeholder="10" suffix="năm"/>

            <div className="p-[14px] bg-ink-3 border border-line rounded-[10px]">
              <SectionLabel>Ví dụ lịch sử Việt Nam</SectionLabel>
              <div className="font-mono text-[11px] leading-[1.8] text-mute">
                <div>2010–2020: ~5%/năm trung bình</div>
                <div>2020–2024: ~3.5%/năm trung bình</div>
                <div>Dự báo 2025+: ~3–4%/năm</div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div key={resultVersion} className="flex flex-col gap-4">
            {!result ? (
              <div className="bg-ink-2 border border-line rounded-[14px] p-[24px_28px] flex items-center justify-center h-full">
                <span className="text-mute font-mono text-[13px]">Nhập số liệu để tính</span>
              </div>
            ) : mode === 'future' ? (
              <>
                <ResultCard
                  label="Sức mua tương đương sau X năm"
                  value={fmtVnd(result.futureValue!)}
                  sub={`Số tiền gốc ${fmtVnd(parseFloat(amount) || 0)} chỉ mua được hàng hóa trị giá này`}
                  color="text-down"
                  delay={0}
                />
                <ResultCard
                  label="Sức mua mất đi"
                  value={`-${result.purchasePowerLoss!.toFixed(1)}%`}
                  sub={`Sau ${years} năm ở lạm phát ${inflation}%/năm`}
                  color="text-down"
                  delay={80}
                />
                <ResultCard
                  label="Cần có để giữ nguyên sức mua"
                  value={fmtVnd(result.neededToKeep!)}
                  sub="Số tiền cần tích lũy để mua được hàng hóa tương đương"
                  color="text-up"
                  delay={160}
                />
              </>
            ) : (
              <>
                <ResultCard
                  label={`Sức mua ${years} năm trước tương đương`}
                  value={fmtVnd(result.pastValue!)}
                  sub={`${fmtVnd(parseFloat(amount) || 0)} hiện tại tương đương số tiền này X năm trước`}
                  color="text-gold"
                  delay={0}
                />
                <ResultCard
                  label="Giá đã tăng bao nhiêu"
                  value={`+${result.purchasePowerGrowth!.toFixed(1)}%`}
                  sub={`Sau ${years} năm ở lạm phát ${inflation}%/năm`}
                  delay={80}
                />
              </>
            )}

            <div className="p-[16px_20px] bg-[rgba(212,175,55,0.04)] border border-[rgba(212,175,55,0.12)] rounded-[10px]">
              <SectionLabel>Ghi chú</SectionLabel>
              <ul className="font-mono text-[11px] leading-[1.7] text-mute list-disc list-inside space-y-1">
                <li>Lạm phát thực tế có thể biến động theo từng năm</li>
                <li>Vàng thường được coi là hàng rào chống lạm phát dài hạn</li>
                <li>Kết quả chỉ mang tính tham khảo</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
      </div>
    </div>
  );
}
