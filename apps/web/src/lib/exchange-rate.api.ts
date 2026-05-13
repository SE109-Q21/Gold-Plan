import { useQuery } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type { ExchangeRateDto } from '@gpls/shared';

export async function fetchExchangeRates(): Promise<ExchangeRateDto> {
  const { data } = await apiClient.get<ExchangeRateDto>('/exchange-rate/rates');
  return data;
}

export function useExchangeRates() {
  return useQuery({
    queryKey: ['exchange-rate', 'rates'],
    queryFn: fetchExchangeRates,
    staleTime: 14 * 60 * 1000, // 14 min (just under 15-min server cache)
    refetchInterval: 15 * 60 * 1000,
  });
}
