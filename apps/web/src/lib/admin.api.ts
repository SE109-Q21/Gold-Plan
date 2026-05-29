import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type {
  AdminStatsDto,
  AdminPeriodStatsDto,
  AdminStatsPeriod,
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

export function useAdminPeriodStats(period: AdminStatsPeriod) {
  return useQuery({
    queryKey: ['admin', 'stats', 'period', period],
    queryFn: () =>
      apiClient
        .get<AdminPeriodStatsDto>('/admin/stats/period', { params: { period } })
        .then((r) => r.data),
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

export function useAdminUsers(params: { page?: number; search?: string; status?: string; role?: string } = {}) {
  const { page = 1, search, status, role } = params;
  return useQuery({
    queryKey: ['admin', 'users', page, search, status, role],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<AdminUserDto>>('/admin/users', {
          params: { page, limit: 20, ...(search && { search }), ...(status && { status }), ...(role && { role }) },
        })
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

export function useChangeUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'user' | 'admin' }) =>
      apiClient.patch(`/admin/users/${id}/role`, { role }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useTriggerCrawl() {
  return useMutation({
    mutationFn: () => apiClient.post<{ triggered: number }>('/admin/crawl/trigger').then(r => r.data),
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

// ─── Time-series ─────────────────────────────────────────────────────────────

export interface TimeSeriesPoint {
  date: string;
  newUsers: number;
  crawlsTotal: number;
  crawlsSuccess: number;
  alertsFired: number;
  forecastVotes: number;
}

export function useAdminTimeSeries(days = 30) {
  return useQuery({
    queryKey: ['admin', 'stats', 'timeseries', days],
    queryFn: () =>
      apiClient
        .get<{ days: number; series: TimeSeriesPoint[] }>('/admin/stats/timeseries', { params: { days } })
        .then(r => r.data),
    staleTime: 60_000,
  });
}

// ─── Forecast management ──────────────────────────────────────────────────────

interface ForecastSessionAdminDto {
  id: string;
  date: string;
  opensAt: string;
  closesAt: string;
  sessionClosed: boolean;
  actualResult: 'up' | 'down' | 'flat' | null;
  scoredAt: string | null;
  voteCounts: { up: number; down: number; flat: number; total: number };
}

export function useAdminForecastSessions() {
  return useQuery({
    queryKey: ['admin', 'forecast', 'sessions'],
    queryFn: () => apiClient.get('/admin/forecast/sessions').then(r => r.data) as Promise<ForecastSessionAdminDto[]>,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useAdminSessionVotes(sessionId: string | null) {
  return useQuery({
    queryKey: ['admin', 'forecast', 'votes', sessionId],
    queryFn: () => apiClient.get(`/admin/forecast/sessions/${sessionId}/votes`).then(r => r.data),
    enabled: !!sessionId,
  });
}

export function useOpenForecastSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { date: string; closesAt: string }) =>
      apiClient.post('/admin/forecast/sessions', body).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'forecast'] }),
  });
}

export function useCloseForecastSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/admin/forecast/sessions/${id}/close`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'forecast'] }),
  });
}

export function useSetForecastResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, actualResult }: { id: string; actualResult: 'up' | 'down' | 'flat' }) =>
      apiClient.patch(`/admin/forecast/sessions/${id}/result`, { actualResult }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'forecast'] }),
  });
}

export function useAutoScoreForecastSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/admin/forecast/sessions/${id}/auto-score`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'forecast'] }),
  });
}

// ─── Data Source enable/create/update ─────────────────────────────────────────

export function useEnableDataSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/admin/data-sources/${id}/enable`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'data-sources'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

export function useCreateDataSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; brand: string; url: string; crawlType: string; frequencyMin?: number }) =>
      apiClient.post('/admin/data-sources', body).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'data-sources'] }),
  });
}

export function useUpdateDataSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; url?: string; crawlType?: string; frequencyMin?: number; isActive?: boolean }) =>
      apiClient.patch(`/admin/data-sources/${id}`, body).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'data-sources'] }),
  });
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export function useAdminAuditLog(page = 1) {
  return useQuery({
    queryKey: ['admin', 'audit', page],
    queryFn: () => apiClient.get('/admin/audit', { params: { page, limit: 30 } }).then(r => r.data),
    staleTime: 30_000,
  });
}
