import { useQuery } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type { HeatIndexDto } from '@gpls/shared';

export async function fetchHeatIndex(): Promise<HeatIndexDto> {
  const { data } = await apiClient.get<HeatIndexDto>('/heat-index/current');
  return data;
}

export function useHeatIndex() {
  return useQuery({
    queryKey: ['heat-index', 'current'],
    queryFn: fetchHeatIndex,
    staleTime: 4 * 60_000,         // 4 min
    refetchInterval: 5 * 60_000,   // 5 min
  });
}

export function useHeatIndexHistory(days = 7) {
  return useQuery({
    queryKey: ['heat-index', 'history', days],
    queryFn: () =>
      apiClient
        .get<HeatIndexDto[]>(`/heat-index/history?days=${days}`)
        .then(r => r.data),
    staleTime: 10 * 60_000,
    refetchInterval: 60 * 60_000,
  });
}
