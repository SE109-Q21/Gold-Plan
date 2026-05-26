'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import type { DomesticPriceDto, ComparisonRowDto } from '@gpls/shared';

interface PriceUpdatedPayload {
  brand: string;
  goldType: string;
  buyPrice: string;
  sellPrice: string;
  recordedAt: string;
}

export function useRealTimePrices() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const raw = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
    const wsBase = raw.replace(/\/api\/?$/, '');
    const socket = io(wsBase, {
      path: '/ws',
      transports: ['websocket'],
      reconnectionDelay: 2000,
      reconnectionAttempts: 5,
    });

    socket.on('price:updated', (data: PriceUpdatedPayload) => {
      const buyPrice  = Number(data.buyPrice);
      const sellPrice = Number(data.sellPrice);

      // Cập nhật domestic prices cache ngay lập tức — không cần round-trip API
      queryClient.setQueriesData<DomesticPriceDto[]>(
        { queryKey: ['prices', 'domestic'] },
        (old) => {
          if (!old) return old;
          return old.map(p =>
            p.brand === data.brand && p.goldType === data.goldType
              ? { ...p, buyPrice, sellPrice, recordedAt: data.recordedAt, status: 'live' as const }
              : p,
          );
        },
      );

      // Cập nhật comparison cache và tính lại best buy/sell
      queryClient.setQueriesData<ComparisonRowDto[]>(
        { queryKey: ['prices', 'comparison'] },
        (old) => {
          if (!old) return old;
          return old.map(row => {
            const updated = row.brands.map(b =>
              b.brand === data.brand ? { ...b, buyPrice, sellPrice } : b,
            );
            const maxBuy  = Math.max(...updated.map(b => b.buyPrice));
            const minSell = Math.min(...updated.map(b => b.sellPrice));
            return {
              ...row,
              brands: updated.map(b => ({
                ...b,
                isBestBuy:  b.buyPrice  === maxBuy,
                isBestSell: b.sellPrice === minSell,
              })),
            };
          });
        },
      );

      // Arbitrage cần refetch vì phụ thuộc vào logic phức tạp phía server
      queryClient.invalidateQueries({ queryKey: ['prices', 'arbitrage'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);
}
