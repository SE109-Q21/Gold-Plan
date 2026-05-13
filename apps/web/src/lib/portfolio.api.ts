import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type {
  PortfolioSummaryDto,
  PortfolioChartPointDto,
  AllocationBreakdownDto,
  PortfolioTransactionDto,
  PaginatedDto,
} from '@gpls/shared';

export interface AddTransactionPayload {
  type: 'BUY' | 'SELL';
  brand: string;
  goldType: string;
  quantity: number;
  pricePerTael: number;
  transactedAt: string;
  note?: string;
}

export function usePortfolio() {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: () => apiClient.get<PortfolioSummaryDto>('/portfolio').then(r => r.data),
    staleTime: 30_000,
  });
}

export function usePortfolioChart() {
  return useQuery({
    queryKey: ['portfolio', 'chart'],
    queryFn: () => apiClient.get<PortfolioChartPointDto[]>('/portfolio/chart').then(r => r.data),
    staleTime: 60_000,
  });
}

export function usePortfolioAllocation() {
  return useQuery({
    queryKey: ['portfolio', 'allocation'],
    queryFn: () => apiClient.get<AllocationBreakdownDto>('/portfolio/allocation').then(r => r.data),
    staleTime: 60_000,
  });
}

export function useTransactions(page = 1) {
  return useQuery({
    queryKey: ['portfolio', 'transactions', page],
    queryFn: () => apiClient.get<PaginatedDto<PortfolioTransactionDto>>('/portfolio/transactions', { params: { page } }).then(r => r.data),
    staleTime: 30_000,
  });
}

export function useAddTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: AddTransactionPayload) => apiClient.post('/portfolio/transactions', dto).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio'] }),
  });
}

export function useEditTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: Partial<AddTransactionPayload> & { id: string }) =>
      apiClient.patch(`/portfolio/transactions/${id}`, dto).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio'] }),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/portfolio/transactions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio'] }),
  });
}
