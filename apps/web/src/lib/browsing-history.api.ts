import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type { BrowsingContextDto, BrowsingHistoryItemDto, LowestSeenItemDto } from '@gpls/shared';

export function useBrowsingContext(brand: string, goldType: string, enabled = true) {
  return useQuery({
    queryKey: ['browsing-history', 'context', brand, goldType],
    queryFn: () => apiClient.get<BrowsingContextDto | null>('/browsing-history/context', { params: { brand, goldType } }).then(r => r.data),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useBrowsingHistory(page = 1) {
  return useQuery({
    queryKey: ['browsing-history', page],
    queryFn: () => apiClient.get<{ items: BrowsingHistoryItemDto[]; total: number; page: number; totalPages: number }>('/browsing-history', { params: { page, limit: 20 } }).then(r => r.data),
    staleTime: 60_000,
  });
}

export function useRecordBrowse() {
  return useMutation({
    mutationFn: ({ brand, goldType, buyPrice }: { brand: string; goldType: string; buyPrice: number }) =>
      apiClient.post('/browsing-history/record', { brand, goldType, buyPrice }),
  });
}

export function useLowestSeen() {
  return useQuery({
    queryKey: ['browsing-history', 'lowest'],
    queryFn: () => apiClient.get<LowestSeenItemDto[]>('/browsing-history/lowest').then(r => r.data),
    staleTime: 60_000,
  });
}

export function useClearHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete('/browsing-history'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['browsing-history'] }),
  });
}
