'use client';

import { useInternationalPrice } from '@/lib/price.api';

export function InternationalPriceCard() {
  const { data, isLoading, error } = useInternationalPrice();

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 p-4 animate-pulse">
        <div className="h-5 w-32 rounded bg-gray-200" />
        <div className="mt-3 h-8 w-48 rounded bg-gray-200" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        Không thể tải giá quốc tế
      </div>
    );
  }

  const updatedAt = new Date(data.recordedAt).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-yellow-50 to-white p-4">
      <h3 className="text-sm font-medium text-gray-500">Giá vàng quốc tế (XAU/USD)</h3>
      <div className="mt-2 flex items-end gap-3">
        <span className="text-2xl font-bold text-yellow-700">
          ${data.spotPriceUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          <span className="ml-1 text-sm font-normal text-gray-400">/oz</span>
        </span>
      </div>
      <div className="mt-1 text-sm text-gray-600">
        ≈{' '}
        <span className="font-semibold text-yellow-800">
          {new Intl.NumberFormat('vi-VN').format(data.spotPriceVnd)} ₫
        </span>
        /lượng
      </div>
      <div className="mt-1 text-xs text-gray-400">
        Tỷ giá USD/VND: {new Intl.NumberFormat('vi-VN').format(data.exchangeRate)} · Cập nhật {updatedAt}
      </div>
    </div>
  );
}
