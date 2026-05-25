'use client';

import { useInternationalPrice } from '@/lib/price.api';

export function InternationalPriceCard() {
  const { data, isLoading, error } = useInternationalPrice();

  if (isLoading) {
    return (
      <div className="bg-ink-2 rounded-lg border border-line p-4 animate-pulse">
        <div className="h-5 w-32 rounded bg-ink-3" />
        <div className="mt-3 h-8 w-48 rounded bg-ink-3" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-ink-2 rounded-lg border border-[rgba(229,72,77,0.3)] p-4 text-[13px] text-down">
        Không thể tải giá quốc tế
      </div>
    );
  }

  const updatedAt = new Date(data.recordedAt).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-ink-2 rounded-lg border border-line p-4">
      <h3 className="font-sans text-[13px] font-medium text-mute">Giá vàng quốc tế</h3>
      <div className="mt-2 flex items-end gap-3">
        <span className="font-display text-[22px] font-bold text-gold">
          ${data.spotPriceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="ml-1 font-sans text-[13px] font-normal text-mute">/ troy oz</span>
        </span>
      </div>
      <div className="mt-1 font-sans text-[13px] text-bone">
        <span className="font-semibold text-gold-soft">
          €{data.spotPriceEur.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        {' '}/ troy oz
      </div>
      <div className="mt-1 font-sans text-[13px] text-bone">
        ≈{' '}
        <span className="font-semibold text-gold-soft">
          {new Intl.NumberFormat('vi-VN').format(data.spotPriceVnd)} ₫
        </span>
        /lượng
      </div>
      <div className="mt-1 font-mono text-[11px] text-mute">
        Tỷ giá USD/VND: {new Intl.NumberFormat('vi-VN').format(data.exchangeRate)} · Cập nhật {updatedAt}
      </div>
    </div>
  );
}
