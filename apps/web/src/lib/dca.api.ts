import { useQuery } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type { DcaResultDto } from '@gpls/shared';

interface DcaParams {
  brand: string;
  goldType: string;
  startDate: string;
  frequency: 'weekly' | 'monthly';
  qtyPerPurchase: number;
}

export async function fetchDcaSimulate(params: DcaParams): Promise<DcaResultDto> {
  const { data } = await apiClient.get<DcaResultDto>('/dca/simulate', { params });
  return data;
}

export function useDcaSimulate(params: DcaParams | null) {
  return useQuery({
    queryKey: ['dca', 'simulate', params],
    queryFn: () => fetchDcaSimulate(params!),
    enabled: !!params && !!params.startDate,
    staleTime: 60_000,
  });
}
