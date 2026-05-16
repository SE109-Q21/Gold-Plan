import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type { SmartAlertDto, CreateSmartAlertDto } from '@gpls/shared';

export function useSmartAlerts() {
  return useQuery({
    queryKey: ['smart-alerts'],
    queryFn: () => apiClient.get<SmartAlertDto[]>('/smart-alerts').then(r => r.data),
    staleTime: 30_000,
  });
}

export function useCreateSmartAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateSmartAlertDto) =>
      apiClient.post<SmartAlertDto>('/smart-alerts', dto).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['smart-alerts'] }),
  });
}

export function useToggleSmartAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<SmartAlertDto>(`/smart-alerts/${id}/toggle`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['smart-alerts'] }),
  });
}

export function useDeleteSmartAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/smart-alerts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['smart-alerts'] }),
  });
}
