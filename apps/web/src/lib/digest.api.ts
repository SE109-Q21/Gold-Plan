import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type { DigestDto, DigestArchiveDto } from '@gpls/shared';

export function useLatestDigest() {
  return useQuery({
    queryKey: ['digest', 'latest'],
    queryFn: () => apiClient.get<DigestDto | null>('/digest/latest').then(r => r.data),
    staleTime: 10 * 60_000,
    refetchInterval: 15 * 60_000,
  });
}

export function useDigestArchive(page = 1) {
  return useQuery({
    queryKey: ['digest', 'archive', page],
    queryFn: () => apiClient.get<DigestArchiveDto>('/digest/archive', { params: { page } }).then(r => r.data),
    staleTime: 5 * 60_000,
  });
}

export function useSubscribeDigest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subscribe: boolean) =>
      subscribe
        ? apiClient.post('/digest/subscribe').then(r => r.data)
        : apiClient.delete('/digest/subscribe').then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['digest'] }),
  });
}
