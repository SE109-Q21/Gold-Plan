import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type {
  AdminStatsDto,
  DataSourceAdminDto,
  AdminUserDto,
  AnomalyRecordDto,
} from '@gpls/shared';
import type { PaginatedResponse } from '@gpls/shared';

// ─── Stats ────────────────────────────────────────────────────────────────────

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => apiClient.get<AdminStatsDto>('/admin/stats').then(r => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

// ─── Data Sources ─────────────────────────────────────────────────────────────

export function useAdminDataSources() {
  return useQuery({
    queryKey: ['admin', 'data-sources'],
    queryFn: () => apiClient.get<DataSourceAdminDto[]>('/admin/data-sources').then(r => r.data),
    staleTime: 30_000,
  });
}

export function useDisableDataSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/data-sources/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'data-sources'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

// ─── Users ────────────────────────────────────────────────────────────────────

export function useAdminUsers(page = 1) {
  return useQuery({
    queryKey: ['admin', 'users', page],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<AdminUserDto>>('/admin/users', { params: { page, limit: 20 } })
        .then(r => r.data),
    staleTime: 30_000,
  });
}

export function useLockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/admin/users/${id}/lock`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useUnlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/admin/users/${id}/unlock`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

// ─── Anomalies ────────────────────────────────────────────────────────────────

export function useAdminAnomalies() {
  return useQuery({
    queryKey: ['admin', 'anomalies'],
    queryFn: () => apiClient.get<AnomalyRecordDto[]>('/admin/anomalies').then(r => r.data),
    staleTime: 30_000,
  });
}

export function useReviewAnomaly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approved' | 'rejected' }) =>
      apiClient
        .post(`/admin/anomalies/${id}/review`, { action })
        .then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'anomalies'] }),
  });
}
