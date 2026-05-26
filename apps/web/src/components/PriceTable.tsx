'use client';

import type { DomesticPriceDto, GoldBrand, PriceStatus } from '@gpls/shared';
import { useDomesticPrices } from '@/lib/price.api';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/ui/BrandLogo';

const BRAND_LABELS: Record<GoldBrand, string> = {
  SJC: 'SJC', DOJI: 'DOJI', PNJ: 'PNJ', BAO_TIN: 'Bảo Tín',
};

const GOLD_TYPE_LABELS: Record<string, string> = {
  MIEN_SJC: 'Miếng SJC',
  NHAN_9999: 'Nhẫn 9999',
  VANG_24K: 'Vàng 24K',
  VANG_18K: 'Vàng 18K',
};

const STATUS_CONFIG: Record<PriceStatus, { label: string; cls: string }> = {
  live:     { label: 'Trực tiếp', cls: 'bg-[rgba(88,200,150,0.1)] border border-[rgba(88,200,150,0.3)] text-up' },
  recent:   { label: 'Gần đây',   cls: 'bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.3)] text-gold' },
  outdated: { label: 'Cũ',        cls: 'bg-[rgba(229,72,77,0.1)] border border-[rgba(229,72,77,0.3)] text-down' },
};

function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function ChangeIndicator({ changePercent }: { changePercent: number | null }) {
  if (changePercent === null) return <span className="text-mute">–</span>;
  const isUp = changePercent > 0;
  const isDown = changePercent < 0;
  return (
    <span className={isUp ? 'text-up' : isDown ? 'text-down' : 'text-mute'}>
      {isUp ? '▲' : isDown ? '▼' : '–'} {Math.abs(changePercent).toFixed(2)}%
    </span>
  );
}

function StatusBadge({ status }: { status: PriceStatus }) {
  const { label, cls } = STATUS_CONFIG[status];
  return (
    <span className={cn('rounded-full px-2 py-[2px] font-mono text-[11px] font-bold', cls)}>
      {label}
    </span>
  );
}

export function PriceTable({ brand }: { brand?: GoldBrand }) {
  const { data: prices, isLoading, error } = useDomesticPrices(brand);

  if (isLoading) return <div className="py-8 text-center text-mute font-sans text-[13px]">Đang tải...</div>;
  if (error) return <div className="py-8 text-center text-down font-sans text-[13px]">Không thể tải dữ liệu giá</div>;
  if (!prices?.length) return <div className="py-8 text-center text-mute font-sans text-[13px]">Không có dữ liệu</div>;

  return (
    <div className="overflow-x-auto bg-ink-2 rounded-lg border border-line">
      <table className="min-w-full font-sans text-[13px]">
        <thead className="bg-ink-3">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-mute">Thương hiệu</th>
            <th className="px-4 py-3 text-left font-medium text-mute">Loại vàng</th>
            <th className="px-4 py-3 text-right font-medium text-mute">Giá mua</th>
            <th className="px-4 py-3 text-right font-medium text-mute">Giá bán</th>
            <th className="px-4 py-3 text-center font-medium text-mute">Biến động</th>
            <th className="px-4 py-3 text-center font-medium text-mute">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {prices.map((p: DomesticPriceDto) => (
            <tr key={`${p.brand}-${p.goldType}`} className="hover:bg-ink-3 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <BrandLogo brand={p.brand} size={24} />
                  <span className="font-semibold text-gold">{BRAND_LABELS[p.brand]}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-bone">{GOLD_TYPE_LABELS[p.goldType] ?? p.goldType}</td>
              <td className="px-4 py-3 text-right font-mono text-up">{formatVnd(p.buyPrice)}</td>
              <td className="px-4 py-3 text-right font-mono text-down">{formatVnd(p.sellPrice)}</td>
              <td className="px-4 py-3 text-center font-mono text-[12px]">
                <ChangeIndicator changePercent={p.changePercent} />
              </td>
              <td className="px-4 py-3 text-center">
                <StatusBadge status={p.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
