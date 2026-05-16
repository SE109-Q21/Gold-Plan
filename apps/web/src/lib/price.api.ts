import { useQuery } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type {
  DomesticPriceDto,
  InternationalPriceDto,
  ChartPointDto,
  ComparisonRowDto,
  GoldBrand,
  GoldType,
} from '@gpls/shared';

export async function fetchDomesticPrices(brand?: GoldBrand): Promise<DomesticPriceDto[]> {
  const params = brand ? { brand } : {};
  const { data } = await apiClient.get<DomesticPriceDto[]>('/prices/domestic', { params });
  return data;
}

export async function fetchInternationalPrice(): Promise<InternationalPriceDto> {
  const { data } = await apiClient.get<InternationalPriceDto>('/prices/international');
  return data;
}

export type HistoryRange = '1D' | '1W' | '1M' | '3M' | '1Y';

export async function fetchPriceHistory(
  brand: GoldBrand,
  goldType: GoldType,
  range: HistoryRange,
): Promise<ChartPointDto[]> {
  const { data } = await apiClient.get<ChartPointDto[]>('/prices/history', {
    params: { brand, goldType, range },
  });
  return data;
}

export async function fetchComparison(goldType: GoldType): Promise<ComparisonRowDto[]> {
  const { data } = await apiClient.get<ComparisonRowDto[]>('/prices/comparison', {
    params: { goldType },
  });
  return data;
}

export function useDomesticPrices(brand?: GoldBrand) {
  return useQuery({
    queryKey: ['prices', 'domestic', brand],
    queryFn: () => fetchDomesticPrices(brand),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useInternationalPrice() {
  return useQuery({
    queryKey: ['prices', 'international'],
    queryFn: fetchInternationalPrice,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}

export function usePriceHistory(
  brand: GoldBrand,
  goldType: GoldType,
  range: HistoryRange,
) {
  return useQuery({
    queryKey: ['prices', 'history', brand, goldType, range],
    queryFn: () => fetchPriceHistory(brand, goldType, range),
    staleTime: 60_000,
  });
}

export function useComparison(goldType: GoldType) {
  return useQuery({
    queryKey: ['prices', 'comparison', goldType],
    queryFn: () => fetchComparison(goldType),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
