import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type { AssetsComparisonDto, AssetBenchmarkDto } from '@gpls/shared';

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

export function useBenchmarks(assetType?: string) {
  return useQuery({
    queryKey: ['admin', 'benchmarks', assetType],
    queryFn: async () => {
      const params = assetType ? `?assetType=${assetType}` : '';
      const { data } = await apiClient.get<AssetBenchmarkDto[]>(`/admin/benchmarks${params}`);
      return data;
    },
  });
}

export function useUpsertBenchmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { assetType: string; date: string; value: number; note?: string }) =>
      apiClient.post('/admin/benchmarks', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'benchmarks'] }),
  });
}

export function useDeleteBenchmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/benchmarks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'benchmarks'] }),
  });
}
