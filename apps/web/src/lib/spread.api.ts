import { useQuery } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type { SpreadRankingDto, SpreadHistoryPointDto, GoldType, GoldBrand } from '@gpls/shared';

export async function fetchSpreadRanking(goldType: GoldType): Promise<SpreadRankingDto[]> {
  const { data } = await apiClient.get<SpreadRankingDto[]>('/spread/ranking', {
    params: { goldType },
  });
  return data;
}

export function useSpreadRanking(goldType: GoldType) {
  return useQuery({
    queryKey: ['spread', 'ranking', goldType],
    queryFn: () => fetchSpreadRanking(goldType),
    staleTime: 60_000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useSpreadHistory(brand: GoldBrand, goldType: GoldType, days = 7) {
  return useQuery({
    queryKey: ['spread', 'history', brand, goldType, days],
    queryFn: () =>
      apiClient
        .get<SpreadHistoryPointDto[]>('/spread/history', { params: { brand, goldType, days } })
        .then((r) => r.data),
    staleTime: 5 * 60_000,
  });
}
