import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type { PersonalisationItemDto } from '@gpls/shared';

export function usePersonalisationOrder() {
  return useQuery({
    queryKey: ['personalisation', 'order'],
    queryFn: () => apiClient.get<PersonalisationItemDto[]>('/personalisation/order').then(r => r.data),
    staleTime: 60_000,
  });
}

export function useRecordView() {
  return useMutation({
    mutationFn: ({ brand, goldType }: { brand: string; goldType: string }) =>
      apiClient.post('/personalisation/view', { brand, goldType }),
  });
}

export function useAddPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ brand, goldType }: { brand: string; goldType: string }) =>
      apiClient.post('/personalisation/pin', { brand, goldType }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personalisation'] }),
  });
}

export function useRemovePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ brand, goldType }: { brand: string; goldType: string }) =>
      apiClient.delete('/personalisation/pin', { data: { brand, goldType } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personalisation'] }),
  });
}

export function useReorderPins() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (order: Array<{ brand: string; goldType: string }>) =>
      apiClient.patch('/personalisation/pin/reorder', { order }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personalisation'] }),
  });
}

export function useResetPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete('/personalisation/reset'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personalisation'] }),
  });
}
