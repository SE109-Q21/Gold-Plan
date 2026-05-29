import { useQuery } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type { AssetsComparisonDto } from '@gpls/shared';

export type ComparisonRange = '1M' | '3M' | '6M' | '1Y';

export function useAssetsComparison(range: ComparisonRange = '1M') {
  return useQuery({
    queryKey: ['prices', 'assets-comparison', range],
    queryFn: async () => {
      const { data } = await apiClient.get<AssetsComparisonDto>(
        `/prices/assets-comparison?range=${range}`,
      );
      return data;
    },
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  });
}
