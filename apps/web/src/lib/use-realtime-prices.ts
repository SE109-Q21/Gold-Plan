'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';

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
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
    const socket = io(apiUrl, {
      path: '/ws',
      transports: ['websocket'],
      reconnectionDelay: 2000,
      reconnectionAttempts: 5,
    });

    socket.on('price:updated', (_data: PriceUpdatedPayload) => {
      // Invalidate both brand-specific and all-brands queries
      queryClient.invalidateQueries({ queryKey: ['prices', 'domestic'] });
      queryClient.invalidateQueries({ queryKey: ['prices', 'comparison'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);
}
