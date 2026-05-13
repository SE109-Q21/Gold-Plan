import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type { PriceAlertDto, AlertTriggerHistoryDto, CreateAlertDto } from '@gpls/shared';

// GET /alerts
export async function fetchAlerts(): Promise<PriceAlertDto[]> {
  return apiClient.get<PriceAlertDto[]>('/alerts').then(r => r.data);
}

export function useAlerts() {
  return useQuery({ queryKey: ['alerts'], queryFn: fetchAlerts, staleTime: 30_000 });
}

// POST /alerts
export function useCreateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAlertDto) => apiClient.post<PriceAlertDto>('/alerts', dto).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

// PATCH /alerts/:id/toggle
export function useToggleAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch<PriceAlertDto>(`/alerts/${id}/toggle`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

// DELETE /alerts/:id
export function useDeleteAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/alerts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

// GET /alerts/history
export function useAlertHistory() {
  return useQuery({
    queryKey: ['alerts', 'history'],
    queryFn: () => apiClient.get<AlertTriggerHistoryDto[]>('/alerts/history').then(r => r.data),
    staleTime: 60_000,
  });
}
