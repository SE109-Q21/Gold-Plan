'use client';

import type { DomesticPriceDto, GoldBrand, PriceStatus } from '@gpls/shared';
import { useDomesticPrices } from '@/lib/price.api';

const BRAND_LABELS: Record<GoldBrand, string> = {
  SJC: 'SJC',
  DOJI: 'DOJI',
  PNJ: 'PNJ',
  BAO_TIN: 'Bảo Tín',
};

const GOLD_TYPE_LABELS: Record<string, string> = {
  MIEN_SJC: 'Miếng SJC',
  NHAN_9999: 'Nhẫn 9999',
  VANG_24K: 'Vàng 24K',
  VANG_18K: 'Vàng 18K',
};

const STATUS_CONFIG: Record<PriceStatus, { label: string; className: string }> = {
  live:     { label: 'Trực tiếp',  className: 'bg-green-100 text-green-800' },
  recent:   { label: 'Gần đây',    className: 'bg-yellow-100 text-yellow-800' },
  outdated: { label: 'Cũ',         className: 'bg-red-100 text-red-800' },
};

function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function ChangeIndicator({ changePercent }: { changePercent: number | null }) {
  if (changePercent === null) return <span className="text-gray-400">–</span>;
  const isUp = changePercent > 0;
  const isDown = changePercent < 0;
  return (
    <span className={isUp ? 'text-green-600' : isDown ? 'text-red-600' : 'text-gray-400'}>
      {isUp ? '▲' : isDown ? '▼' : '–'} {Math.abs(changePercent).toFixed(2)}%
    </span>
  );
}

function StatusBadge({ status }: { status: PriceStatus }) {
  const { label, className } = STATUS_CONFIG[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export function PriceTable({ brand }: { brand?: GoldBrand }) {
  const { data: prices, isLoading, error } = useDomesticPrices(brand);

  if (isLoading) return <div className="py-8 text-center text-gray-400">Đang tải...</div>;
  if (error) return <div className="py-8 text-center text-red-500">Không thể tải dữ liệu giá</div>;
  if (!prices?.length) return <div className="py-8 text-center text-gray-400">Không có dữ liệu</div>;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-700">Thương hiệu</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">Loại vàng</th>
            <th className="px-4 py-3 text-right font-medium text-gray-700">Giá mua</th>
            <th className="px-4 py-3 text-right font-medium text-gray-700">Giá bán</th>
            <th className="px-4 py-3 text-center font-medium text-gray-700">Biến động</th>
            <th className="px-4 py-3 text-center font-medium text-gray-700">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {prices.map((p: DomesticPriceDto) => (
            <tr key={`${p.brand}-${p.goldType}`} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-semibold text-yellow-700">{BRAND_LABELS[p.brand]}</td>
              <td className="px-4 py-3 text-gray-600">{GOLD_TYPE_LABELS[p.goldType] ?? p.goldType}</td>
              <td className="px-4 py-3 text-right font-mono text-green-700">{formatVnd(p.buyPrice)}</td>
              <td className="px-4 py-3 text-right font-mono text-red-700">{formatVnd(p.sellPrice)}</td>
              <td className="px-4 py-3 text-center">
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
