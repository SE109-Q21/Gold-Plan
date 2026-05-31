import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  setApiAccessToken: vi.fn(),
}));

import {
  usePortfolio,
  useAddTransaction,
  useDeleteTransaction,
  useEditTransaction,
} from '@/lib/portfolio.api';
import { apiClient } from '@/lib/api-client';

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const TestWrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  TestWrapper.displayName = 'PortfolioQueryClientWrapper';
  return TestWrapper;
}

describe('usePortfolio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches portfolio summary from GET /portfolio', async () => {
    const mockSummary = {
      holdings: [],
      totalValueVnd: 0,
      totalCostVnd: 0,
      totalPnlVnd: 0,
      totalPnlPct: 0,
    };
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockSummary });

    const { result } = renderHook(() => usePortfolio(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockSummary);
    expect(apiClient.get).toHaveBeenCalledWith('/portfolio');
  });

  it('exposes isLoading while request is in flight', () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockReturnValueOnce(new Promise(() => {}));

    const { result } = renderHook(() => usePortfolio(), { wrapper: wrapper() });

    expect(result.current.isLoading).toBe(true);
  });
});

describe('useAddTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POSTs to /portfolio/transactions with the provided payload', async () => {
    const payload = {
      type: 'BUY' as const,
      brand: 'SJC',
      goldType: 'MIEN_SJC',
      quantity: 1,
      pricePerTael: 80_000_000,
      transactedAt: '2026-05-23T00:00:00.000Z',
    };
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { id: 'new-tx' } });

    const { result } = renderHook(() => useAddTransaction(), { wrapper: wrapper() });
    await result.current.mutateAsync(payload);

    expect(apiClient.post).toHaveBeenCalledWith('/portfolio/transactions', payload);
  });
});

describe('useDeleteTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('DELETEs the correct transaction endpoint', async () => {
    (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: {} });

    const { result } = renderHook(() => useDeleteTransaction(), { wrapper: wrapper() });
    await result.current.mutateAsync('tx-abc-123');

    expect(apiClient.delete).toHaveBeenCalledWith('/portfolio/transactions/tx-abc-123');
  });
});

describe('useEditTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PATCHes the correct transaction with partial payload', async () => {
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: {} });

    const { result } = renderHook(() => useEditTransaction(), { wrapper: wrapper() });
    await result.current.mutateAsync({ id: 'tx-xyz', quantity: 2 });

    expect(apiClient.patch).toHaveBeenCalledWith(
      '/portfolio/transactions/tx-xyz',
      { quantity: 2 },
    );
  });
});
