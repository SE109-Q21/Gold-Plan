import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useArbitrageOpportunities } from '@/lib/arbitrage.api';

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn() },
}));

import { apiClient } from '@/lib/api-client';
const mockGet = vi.mocked(apiClient.get);

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => vi.clearAllMocks());

describe('useArbitrageOpportunities', () => {
  it('fetches from GET /prices/arbitrage', async () => {
    const mockData = [
      { goldType: 'NHAN_9999', buyFromBrand: 'DOJI', buyFromPrice: 80_000_000,
        sellToBrand: 'SJC', sellToPrice: 82_000_000, grossProfit: 2_000_000,
        profitPercent: 2.5, updatedAt: '2026-05-24T00:00:00Z' },
    ];
    mockGet.mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => useArbitrageOpportunities(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGet).toHaveBeenCalledWith('/prices/arbitrage');
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].grossProfit).toBe(2_000_000);
  });

  it('returns isLoading true initially', () => {
    mockGet.mockReturnValueOnce(new Promise(() => {}));
    const { result } = renderHook(() => useArbitrageOpportunities(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });
});
