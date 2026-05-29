'use client';

import { useState } from 'react';
import type { GoldType, ComparisonBrandDto } from '@gpls/shared';
import { useComparison } from '@/lib/price.api';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { LiveBadge } from '@/components/ui/LiveBadge';

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
      className={cn(
        'px-4 py-3 text-right font-mono text-[13px]',
        item.isBestBuy ? 'bg-[rgba(88,200,150,0.08)] font-bold text-up' : 'text-bone',
      )}
      title={item.isBestBuy ? 'Giá mua cao nhất' : undefined}
    >
      {formatVnd(item.buyPrice)}
      {item.isBestBuy && <span className="ml-1 text-[11px] text-up">★</span>}
    </td>
  );
}

function BrandSellCell({ item }: { item: ComparisonBrandDto }) {
  return (
    <td
      className={cn(
        'px-4 py-3 text-right font-mono text-[13px]',
        item.isBestSell ? 'bg-[rgba(212,175,55,0.08)] font-bold text-gold' : 'text-bone',
      )}
      title={item.isBestSell ? 'Giá bán thấp nhất' : undefined}
    >
      {formatVnd(item.sellPrice)}
      {item.isBestSell && <span className="ml-1 text-[11px] text-gold">★</span>}
    </td>
  );
}

export function ComparisonTable() {
  const [goldType, setGoldType] = useState<GoldType>('MIEN_SJC');
  const { data: rows, isLoading, error } = useComparison(goldType);

  const brands = rows?.[0]?.brands ?? [];

  return (
    <div className="bg-ink-2 rounded-lg border border-line p-4">
      <div className="mb-4 flex items-center gap-3">
        <LiveBadge variant="inline" />
        <span className="font-sans text-[13px] font-medium text-bone">Loại vàng:</span>
        <select
          value={goldType}
          onChange={(e) => setGoldType(e.target.value as GoldType)}
          className="bg-ink-3 border border-line rounded px-2 py-1 text-[13px] text-chalk outline-none cursor-pointer"
        >
          {GOLD_TYPES.map((t) => (
            <option key={t} value={t}>{GOLD_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {isLoading && <div className="py-8 text-center text-mute text-[13px]">Đang tải...</div>}
      {error && <div className="py-8 text-center text-down text-[13px]">Không thể tải dữ liệu</div>}

      {!isLoading && !error && brands.length > 0 && (
        <table className="min-w-full text-[13px]">
          <thead className="bg-ink-3">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-mute">Thương hiệu</th>
              <th className="px-4 py-3 text-right font-medium text-mute">Giá mua (VNĐ)</th>
              <th className="px-4 py-3 text-right font-medium text-mute">Giá bán (VNĐ)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {brands.map((b) => (
              <tr key={b.brand}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <BrandLogo brand={b.brand} size={24} />
                    <span className="font-semibold text-gold">{BRAND_LABELS[b.brand] ?? b.brand}</span>
                  </div>
                </td>
                <BrandCell item={b} />
                <BrandSellCell item={b} />
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-3 font-mono text-[11px] text-mute">
        ★ Giá mua cao nhất&nbsp;&nbsp;|&nbsp;&nbsp;★ Giá bán thấp nhất
      </p>
    </div>
  );
}
