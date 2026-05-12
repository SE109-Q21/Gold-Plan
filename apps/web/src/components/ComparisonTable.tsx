'use client';

import { useState } from 'react';
import type { GoldType, ComparisonBrandDto } from '@gpls/shared';
import { useComparison } from '@/lib/price.api';

const GOLD_TYPES: GoldType[] = ['MIEN_SJC', 'NHAN_9999', 'VANG_24K', 'VANG_18K'];
const GOLD_TYPE_LABELS: Record<GoldType, string> = {
  MIEN_SJC: 'Miếng SJC',
  NHAN_9999: 'Nhẫn 9999',
  VANG_24K: 'Vàng 24K',
  VANG_18K: 'Vàng 18K',
};
const BRAND_LABELS: Record<string, string> = {
  SJC: 'SJC', DOJI: 'DOJI', PNJ: 'PNJ', BAO_TIN: 'Bảo Tín',
};

function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

function BrandCell({ item }: { item: ComparisonBrandDto }) {
  return (
    <td
      className={`px-4 py-3 text-right font-mono text-sm ${
        item.isBestBuy ? 'bg-green-50 font-bold text-green-700' : 'text-gray-700'
      }`}
      title={item.isBestBuy ? 'Giá mua cao nhất' : undefined}
    >
      {formatVnd(item.buyPrice)}
      {item.isBestBuy && <span className="ml-1 text-xs text-green-600">★</span>}
    </td>
  );
}

function BrandSellCell({ item }: { item: ComparisonBrandDto }) {
  return (
    <td
      className={`px-4 py-3 text-right font-mono text-sm ${
        item.isBestSell ? 'bg-blue-50 font-bold text-blue-700' : 'text-gray-700'
      }`}
      title={item.isBestSell ? 'Giá bán thấp nhất' : undefined}
    >
      {formatVnd(item.sellPrice)}
      {item.isBestSell && <span className="ml-1 text-xs text-blue-600">★</span>}
    </td>
  );
}

export function ComparisonTable() {
  const [goldType, setGoldType] = useState<GoldType>('MIEN_SJC');
  const { data: rows, isLoading, error } = useComparison(goldType);

  const brands = rows?.[0]?.brands ?? [];

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Loại vàng:</span>
        <select
          value={goldType}
          onChange={(e) => setGoldType(e.target.value as GoldType)}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        >
          {GOLD_TYPES.map((t) => (
            <option key={t} value={t}>{GOLD_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {isLoading && <div className="py-8 text-center text-gray-400">Đang tải...</div>}
      {error && <div className="py-8 text-center text-red-500">Không thể tải dữ liệu</div>}

      {!isLoading && !error && brands.length > 0 && (
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Thương hiệu</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Giá mua (VNĐ)</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Giá bán (VNĐ)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {brands.map((b) => (
              <tr key={b.brand}>
                <td className="px-4 py-3 font-semibold text-yellow-700">{BRAND_LABELS[b.brand] ?? b.brand}</td>
                <BrandCell item={b} />
                <BrandSellCell item={b} />
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-3 text-xs text-gray-400">
        ★ Giá mua cao nhất&nbsp;&nbsp;|&nbsp;&nbsp;★ Giá bán thấp nhất
      </p>
    </div>
  );
}
