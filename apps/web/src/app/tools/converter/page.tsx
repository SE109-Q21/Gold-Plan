'use client';
import { ProtectedRoute } from '@/components/ProtectedRoute';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDomesticPrices } from '@/lib/price.api';
import { useExchangeRates } from '@/lib/exchange-rate.api';
import { calculateConversion, WEIGHT_TO_GRAMS } from '@/lib/converter.api';
import type { GoldBrand, GoldType } from '@gpls/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type WeightUnit = 'TAEL' | 'CHI' | 'PHAN' | 'TROY_OZ' | 'GRAM' | 'KILOGRAM';
type Purity = '24K' | '22K' | '18K' | '14K';
type Brand = 'SJC' | 'DOJI';

const WEIGHT_UNITS: { id: WeightUnit; label: string; sub: string }[] = [
  { id: 'TAEL',     label: 'TAEL',    sub: 'Lượng'    },
  { id: 'CHI',      label: 'CHI',     sub: 'Chỉ'      },
  { id: 'PHAN',     label: 'PHAN',    sub: 'Phân'     },
  { id: 'TROY_OZ',  label: 'TROY_OZ', sub: 'Troy oz'  },
  { id: 'GRAM',     label: 'GRAM',    sub: 'Gram'     },
  { id: 'KILOGRAM', label: 'KG',      sub: 'Kilogram' },
];

const PURITIES: Purity[] = ['24K', '22K', '18K', '14K'];
const BRANDS: { id: Brand; label: string }[] = [{ id: 'SJC', label: 'SJC' }, { id: 'DOJI', label: 'DOJI' }];

const BRAND_GOLD_TYPE: Record<Brand, GoldType> = { SJC: 'MIEN_SJC', DOJI: 'NHAN_9999' };
const UNIT_DISPLAY: Record<WeightUnit, string> = {
  TAEL: 'Tael', CHI: 'Chi', PHAN: 'Phân', TROY_OZ: 'Troy oz', GRAM: 'Gram', KILOGRAM: 'Kg',
};

const CHIP_BASE = 'font-mono text-[12px] leading-none font-bold tracking-[0.08em] border rounded-md cursor-pointer flex flex-col items-center gap-1 transition-[border-color,background,color] duration-[140ms]';

function Chip({ label, sub, selected, onClick }: { label: string; sub?: string; selected: boolean; onClick: () => void }) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn(
        CHIP_BASE, 'h-auto',
        sub ? 'px-4 pt-2 pb-[10px]' : 'px-4 py-2',
        selected
          ? 'border-gold bg-[rgba(212,175,55,0.12)] text-gold hover:bg-[rgba(212,175,55,0.18)] hover:text-gold'
          : 'border-line bg-transparent text-bone hover:bg-ink-3 hover:text-bone',
      )}
    >
      <span>{label}</span>
      {sub && <span className="font-mono text-[9px] leading-none tracking-[0.06em] opacity-65">{sub}</span>}
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

function Skeleton({ w, h }: { w: number | string; h: number }) {
  return <div className="animate-pulse bg-ink-3 rounded" style={{ width: w, height: h }}/>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  return (
    <Button
      variant="outline"
      onClick={handleCopy}
      className={cn(
        'px-[10px] py-1 h-auto font-mono text-[10px] leading-none font-bold tracking-[0.08em] shrink-0 transition-[color,border-color] duration-[140ms]',
        copied ? 'border-gold text-up hover:border-gold hover:text-up' : 'border-line text-gold hover:border-gold hover:text-gold',
      )}
    >
      {copied ? 'Đã sao chép!' : 'Sao chép'}
    </Button>
  );
}

function IconArrowLeft({ s = 16 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
    </svg>
  );
}

function InfoItem({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div>
      <div className="font-mono text-[9px] leading-none font-semibold tracking-[0.12em] uppercase text-mute mb-1">
        {label}
      </div>
      {loading ? (
        <Skeleton w={120} h={14}/>
      ) : (
        <div className="font-mono text-[12px] leading-[1.4] font-semibold text-bone [font-variant-numeric:tabular-nums]">
          {value}
        </div>
      )}
    </div>
  );
}

function ConverterContent() {
  const router = useRouter();

  const [unit, setUnit] = useState<WeightUnit>('TAEL');
  const [qtyStr, setQtyStr] = useState('1');
  const [purity, setPurity] = useState<Purity>('24K');
  const [brand, setBrand] = useState<Brand>('SJC');

  const goldType = BRAND_GOLD_TYPE[brand];
  const qty = parseFloat(qtyStr) || 0;

  const { data: prices, isLoading: pricesLoading } = useDomesticPrices(brand as GoldBrand);
  const { data: rates, isLoading: ratesLoading } = useExchangeRates();
  const isLoading = pricesLoading || ratesLoading;

  const priceEntry = useMemo(() => {
    if (!prices?.length) return null;
    return prices.find(p => p.goldType === goldType) ?? prices.find(p => p.buyPrice > 0) ?? null;
  }, [prices, goldType]);
  const pricePerTaelVnd = priceEntry?.buyPrice ?? 0;

  const noPriceData = !pricesLoading && prices !== undefined && pricePerTaelVnd === 0;

  const result = useMemo(() => {
    if (!rates || pricePerTaelVnd === 0 || qty <= 0) return null;
    return calculateConversion(unit, qty, purity, pricePerTaelVnd, rates);
  }, [unit, qty, purity, pricePerTaelVnd, rates]);

  const fmtVnd = (v: number) => v.toLocaleString('vi-VN') + ' ₫';
  const fmtUsd = (v: number) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtEur = (v: number) => '€' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const timeStr = useMemo(() => {
    const d = priceEntry ? new Date(priceEntry.recordedAt) : new Date();
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }, [priceEntry]);

  const copyText = useCallback((currency: 'VND' | 'USD' | 'EUR') => {
    if (!result) return '';
    const valMap = { VND: fmtVnd(result.valuations.VND), USD: fmtUsd(result.valuations.USD), EUR: fmtEur(result.valuations.EUR) };
    return `${qty} ${UNIT_DISPLAY[unit]} ${purity} = ${valMap[currency]} (${brand} at ${timeStr})`;
  }, [result, unit, qty, purity, brand, timeStr]);

  const noDataLabel = noPriceData ? 'Chưa có dữ liệu giá' : '—';
  const resultRows: { id: 'VND' | 'USD' | 'EUR'; label: string; value: string; skeleton: boolean }[] = [
    { id: 'VND', label: 'VND', value: result ? fmtVnd(result.valuations.VND) : noDataLabel, skeleton: isLoading },
    { id: 'USD', label: 'USD', value: result ? fmtUsd(result.valuations.USD) : noDataLabel, skeleton: isLoading },
    { id: 'EUR', label: 'EUR', value: result ? fmtEur(result.valuations.EUR) : noDataLabel, skeleton: isLoading },
  ];

  const weightInGrams = qty * (WEIGHT_TO_GRAMS[unit] ?? 1);
  const weightInTael = weightInGrams / 37.5;

  return (
    <div className="h-full overflow-auto bg-ink">
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
          <h1 className="font-display text-[40px] leading-none font-extrabold tracking-[-0.03em] text-chalk m-0">
            quy đổi vàng
          </h1>
          <p className="font-display text-[14px] leading-[1.5] text-mute m-0 mt-2">
            Quy đổi thời gian thực giữa các đơn vị, độ tinh khiết và tiền tệ
          </p>
        </div>

        {/* Controls card */}
        <div className="bg-ink-2 border border-line rounded-[14px] p-[24px_28px]">
          <div className="mb-6">
            <SectionLabel>Đơn vị khối lượng</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {WEIGHT_UNITS.map(u => (
                <Chip key={u.id} label={u.label} sub={u.sub} selected={unit === u.id} onClick={() => setUnit(u.id)}/>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <SectionLabel>Số lượng</SectionLabel>
            <Input
              type="number"
              min="0"
              step="any"
              value={qtyStr}
              onChange={e => setQtyStr(e.target.value)}
              onWheel={e => e.currentTarget.blur()}
              className="bg-ink-3 border-line text-chalk font-display text-[28px] leading-none font-bold p-[12px_16px] w-[160px] text-right h-auto focus-visible:ring-gold placeholder:text-mute"
            />
          </div>

          <div className="mb-6">
            <SectionLabel>Độ tinh khiết</SectionLabel>
            <div className="flex gap-2">
              {PURITIES.map(p => <Chip key={p} label={p} selected={purity === p} onClick={() => setPurity(p)}/>)}
            </div>
          </div>

          <div className="flex gap-10 flex-wrap">
            <div>
              <SectionLabel>Thương hiệu (giá tham chiếu)</SectionLabel>
              <div className="flex gap-2">
                {BRANDS.map(b => <Chip key={b.id} label={b.label} selected={brand === b.id} onClick={() => setBrand(b.id)}/>)}
              </div>
            </div>
            <div>
              <SectionLabel>Loại vàng</SectionLabel>
              <div className="border border-line bg-ink-3 text-mute font-mono text-[12px] leading-none font-bold tracking-[0.08em] px-4 py-2 rounded-md self-start">
                {goldType}
              </div>
            </div>
          </div>
        </div>

        {/* Arrow divider */}
        <div className="text-center py-4 text-gold opacity-50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 16l7 7 7-7"/>
          </svg>
        </div>

        {/* Results card */}
        <div className="bg-ink-2 border border-line rounded-[14px] p-[24px_28px]">
          <SectionLabel>Kết quả quy đổi</SectionLabel>
          <div className="flex flex-col gap-0">
            {resultRows.map((row, idx) => (
              <div
                key={row.id}
                className={cn('flex items-center gap-5 py-[18px]', idx < resultRows.length - 1 && 'border-b border-line')}
              >
                <div className="w-12 shrink-0 font-mono text-[11px] leading-none font-bold tracking-[0.14em] uppercase text-mute">
                  {row.label}
                </div>
                <div className="flex-1">
                  {row.skeleton ? (
                    <Skeleton w={220} h={32}/>
                  ) : (
                    <div className="font-display text-[32px] leading-none font-extrabold [font-variant-numeric:tabular-nums] text-chalk tracking-[-0.02em]">
                      {row.value}
                    </div>
                  )}
                </div>
                {!row.skeleton && result && <CopyButton text={copyText(row.id)}/>}
              </div>
            ))}
          </div>
        </div>

        {/* Weight info */}
        <div className="mt-5 p-[16px_20px] bg-[rgba(212,175,55,0.04)] border border-[rgba(212,175,55,0.12)] rounded-[10px]">
          <SectionLabel>Chi tiết khối lượng &amp; tỷ giá</SectionLabel>
          <div className="flex flex-wrap gap-[8px_32px]">
            <InfoItem label="Khối lượng (g)" value={`${weightInGrams.toFixed(2)} g`} loading={false}/>
            <InfoItem label="Khối lượng (lượng)" value={`${weightInTael.toFixed(3)} lượng`} loading={false}/>
            <InfoItem
              label="Giá dùng"
              value={isLoading ? '—' : pricePerTaelVnd > 0 ? `${pricePerTaelVnd.toLocaleString('vi-VN')} ₫/lượng (${brand} · ${priceEntry?.goldType ?? goldType})` : 'Không có dữ liệu giá'}
              loading={isLoading}
            />
            <InfoItem
              label="Tỷ giá dùng"
              value={ratesLoading || !rates ? '—' : `1 USD = ${rates.usdVnd.toLocaleString('vi-VN')} ₫ · 1 EUR = ${rates.eurVnd.toLocaleString('vi-VN')} ₫`}
              loading={ratesLoading}
            />
          </div>
        </div>

      </div>
      </div>
    </div>
  );
}

export default function ConverterPage() {
  return <ProtectedRoute><ConverterContent /></ProtectedRoute>;
}
