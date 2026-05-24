import { useQuery } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type { ArbitrageOpportunityDto, ArbitrageHistoryDto } from '@gpls/shared';

export function useArbitrageOpportunities() {
  return useQuery({
    queryKey: ['prices', 'arbitrage'],
    queryFn: async () => {
      const { data } = await apiClient.get<ArbitrageOpportunityDto[]>('/prices/arbitrage');
      return data;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useArbitrageHistory(goldType: string, hours = 24) {
  return useQuery({
    queryKey: ['prices', 'arbitrage', 'history', goldType, hours],
    queryFn: async () => {
      const { data } = await apiClient.get<ArbitrageHistoryDto[]>(
        `/prices/arbitrage/history?goldType=${goldType}&hours=${hours}`,
      );
      return data;
    },
    staleTime: 60_000,
    enabled: !!goldType,
  });
}
