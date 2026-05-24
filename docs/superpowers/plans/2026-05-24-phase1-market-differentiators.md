# Phase 1 Market Differentiators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Arbitrage Detector (real-time cross-brand profit opportunities) and Gold vs Assets Comparison (normalized return chart vs USD/bank/VN-Index) to GoldPlan.

**Architecture:** Two new NestJS modules (`ArbitrageModule`, `AssetsComparisonModule`) backed by two new Prisma models (`ArbitrageSnapshot`, `AssetBenchmark`). Arbitrage uses existing `PriceRecord` data and hooks into the `price.updated` EventEmitter event. Assets comparison reads from `PriceRecord`, `ExchangeRate`, and `AssetBenchmark` (admin-editable mock data). Frontend adds two new tool pages plus an `ArbitrageWidget` on the dashboard.

**Tech Stack:** NestJS 11, Prisma 7, PostgreSQL 16, Next.js 16, React 19, TanStack Query v5, Recharts, socket.io-client (existing), Jest (API tests), Vitest (web tests). Node 22 required for Prisma CLI commands.

---

## File Map

### Part A — Arbitrage Detector

| Action | Path |
|---|---|
| **Modify** | `apps/api/prisma/schema.prisma` — add `ArbitrageSnapshot` model |
| **Create** | `apps/api/prisma/migrations/[ts]_add_arbitrage_snapshot/migration.sql` (generated) |
| **Modify** | `packages/shared/src/types/gold.types.ts` — add `ArbitrageOpportunityDto`, `ArbitrageHistoryDto` |
| **Modify** | `packages/shared/src/index.ts` — re-export new types |
| **Create** | `apps/api/src/arbitrage/arbitrage.service.ts` |
| **Create** | `apps/api/src/arbitrage/arbitrage.service.spec.ts` |
| **Create** | `apps/api/src/arbitrage/arbitrage.controller.ts` |
| **Create** | `apps/api/src/arbitrage/arbitrage.module.ts` |
| **Modify** | `apps/api/src/app.module.ts` — import `ArbitrageModule` |
| **Create** | `apps/web/src/lib/arbitrage.api.ts` |
| **Create** | `apps/web/src/__tests__/lib/arbitrage.test.ts` |
| **Modify** | `apps/web/src/lib/use-realtime-prices.ts` — invalidate `['prices','arbitrage']` |
| **Create** | `apps/web/src/components/ArbitrageWidget.tsx` |
| **Create** | `apps/web/src/app/tools/arbitrage/page.tsx` |
| **Modify** | `apps/web/src/components/dashboard/OverviewPage.tsx` — add `ArbitrageWidget` |

### Part B — Gold vs Assets

| Action | Path |
|---|---|
| **Modify** | `apps/api/prisma/schema.prisma` — add `AssetBenchmark` model |
| **Create** | `apps/api/prisma/migrations/[ts]_add_asset_benchmark/migration.sql` (generated) |
| **Modify** | `packages/shared/src/types/gold.types.ts` — add `DataSeriesDto`, `AssetsComparisonDto`, `AssetBenchmarkDto` |
| **Create** | `apps/api/src/assets-comparison/assets-comparison.service.ts` |
| **Create** | `apps/api/src/assets-comparison/assets-comparison.service.spec.ts` |
| **Create** | `apps/api/src/assets-comparison/assets-comparison.controller.ts` |
| **Create** | `apps/api/src/assets-comparison/assets-comparison.module.ts` |
| **Modify** | `apps/api/src/app.module.ts` — import `AssetsComparisonModule` |
| **Modify** | `apps/api/src/admin/admin.service.ts` — add benchmark CRUD methods |
| **Modify** | `apps/api/src/admin/admin.controller.ts` — add benchmark endpoints |
| **Create** | `apps/web/src/lib/assets-comparison.api.ts` |
| **Create** | `apps/web/src/app/tools/gold-vs-assets/page.tsx` |
| **Modify** | `apps/web/src/app/admin/page.tsx` — add Benchmarks tab |

---

## Part A — Arbitrage Detector

---

### Task 1: DB Schema — ArbitrageSnapshot

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1.1: Add `ArbitrageSnapshot` model to schema**

In `apps/api/prisma/schema.prisma`, append after the last model:

```prisma
// ─── Arbitrage Snapshots ──────────────────────────────────────────────────────

model ArbitrageSnapshot {
  id            String    @id @default(cuid())
  goldType      GoldType
  buyBrand      GoldBrand
  sellBrand     GoldBrand
  grossProfit   BigInt
  profitPercent Decimal   @db.Decimal(6, 3)
  recordedAt    DateTime  @default(now())

  @@index([goldType, recordedAt])
}
```

- [ ] **Step 1.2: Run migration (requires Node 22)**

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 22
cd apps/api
npx prisma migrate dev --name add_arbitrage_snapshot
```

Expected output: `✔ Generated Prisma Client` and migration file created.

- [ ] **Step 1.3: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat(db): add ArbitrageSnapshot model"
```

---

### Task 2: Shared Types — Arbitrage DTOs

**Files:**
- Modify: `packages/shared/src/types/gold.types.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 2.1: Add arbitrage types to gold.types.ts**

Append to `packages/shared/src/types/gold.types.ts`:

```typescript
export interface ArbitrageOpportunityDto {
  goldType: string;
  buyFromBrand: string;
  buyFromPrice: number;   // price you PAY to buy (brand's sellPrice)
  sellToBrand: string;
  sellToPrice: number;    // price you RECEIVE when selling (brand's buyPrice)
  grossProfit: number;    // sellToPrice - buyFromPrice
  profitPercent: number;
  updatedAt: string;
}

export interface ArbitrageHistoryDto {
  goldType: string;
  grossProfit: number;
  profitPercent: number;
  recordedAt: string;
}
```

- [ ] **Step 2.2: Re-export from shared index**

In `packages/shared/src/index.ts`, add to the existing exports:

```typescript
export type { ArbitrageOpportunityDto, ArbitrageHistoryDto } from './types/gold.types';
```

- [ ] **Step 2.3: Commit**

```bash
git add packages/shared/src/
git commit -m "feat(shared): add ArbitrageOpportunityDto, ArbitrageHistoryDto"
```

---

### Task 3: ArbitrageService — pure calculation + unit tests

**Files:**
- Create: `apps/api/src/arbitrage/arbitrage.service.ts`
- Create: `apps/api/src/arbitrage/arbitrage.service.spec.ts`

- [ ] **Step 3.1: Write the failing tests first**

Create `apps/api/src/arbitrage/arbitrage.service.spec.ts`:

```typescript
import { ArbitrageService, LatestBrandPrice } from './arbitrage.service';

describe('ArbitrageService.calculateOpportunities', () => {
  let service: ArbitrageService;

  beforeEach(() => {
    service = new ArbitrageService(null as any);
  });

  it('finds opportunity when brand A buyPrice > brand B sellPrice for same goldType', () => {
    const prices: LatestBrandPrice[] = [
      { brand: 'DOJI' as any, goldType: 'NHAN_9999' as any, buyPrice: BigInt(78_000_000), sellPrice: BigInt(80_000_000), recordedAt: new Date() },
      { brand: 'SJC'  as any, goldType: 'NHAN_9999' as any, buyPrice: BigInt(82_000_000), sellPrice: BigInt(84_000_000), recordedAt: new Date() },
    ];
    const result = service.calculateOpportunities(prices);
    expect(result).toHaveLength(1);
    expect(result[0].buyFromBrand).toBe('DOJI');   // cheapest to buy from
    expect(result[0].sellToBrand).toBe('SJC');      // highest buyback price
    expect(result[0].grossProfit).toBe(2_000_000);  // SJC buyPrice(82M) - DOJI sellPrice(80M)
    expect(result[0].profitPercent).toBeCloseTo(2.5, 1);
  });

  it('returns empty when no cross-brand profit possible', () => {
    const prices: LatestBrandPrice[] = [
      { brand: 'DOJI' as any, goldType: 'NHAN_9999' as any, buyPrice: BigInt(78_000_000), sellPrice: BigInt(80_000_000), recordedAt: new Date() },
      { brand: 'SJC'  as any, goldType: 'NHAN_9999' as any, buyPrice: BigInt(79_000_000), sellPrice: BigInt(81_000_000), recordedAt: new Date() },
    ];
    // SJC buyPrice(79M) < DOJI sellPrice(80M) → no profit
    expect(service.calculateOpportunities(prices)).toHaveLength(0);
  });

  it('skips goldTypes with only one brand', () => {
    const prices: LatestBrandPrice[] = [
      { brand: 'SJC' as any, goldType: 'MIEN_SJC' as any, buyPrice: BigInt(80_000_000), sellPrice: BigInt(82_000_000), recordedAt: new Date() },
    ];
    expect(service.calculateOpportunities(prices)).toHaveLength(0);
  });

  it('handles multiple goldTypes independently', () => {
    const prices: LatestBrandPrice[] = [
      { brand: 'DOJI' as any, goldType: 'NHAN_9999' as any, buyPrice: BigInt(78_000_000), sellPrice: BigInt(80_000_000), recordedAt: new Date() },
      { brand: 'SJC'  as any, goldType: 'NHAN_9999' as any, buyPrice: BigInt(82_000_000), sellPrice: BigInt(84_000_000), recordedAt: new Date() },
      { brand: 'PNJ'  as any, goldType: 'VANG_24K'  as any, buyPrice: BigInt(77_000_000), sellPrice: BigInt(79_000_000), recordedAt: new Date() },
      { brand: 'DOJI' as any, goldType: 'VANG_24K'  as any, buyPrice: BigInt(80_000_000), sellPrice: BigInt(82_000_000), recordedAt: new Date() },
    ];
    const result = service.calculateOpportunities(prices);
    expect(result).toHaveLength(2);
    const goldTypes = result.map(r => r.goldType);
    expect(goldTypes).toContain('NHAN_9999');
    expect(goldTypes).toContain('VANG_24K');
  });

  it('sorts by profitPercent descending', () => {
    const prices: LatestBrandPrice[] = [
      { brand: 'DOJI' as any, goldType: 'NHAN_9999' as any, buyPrice: BigInt(78_000_000), sellPrice: BigInt(80_000_000), recordedAt: new Date() },
      { brand: 'SJC'  as any, goldType: 'NHAN_9999' as any, buyPrice: BigInt(82_000_000), sellPrice: BigInt(84_000_000), recordedAt: new Date() },
      { brand: 'PNJ'  as any, goldType: 'VANG_24K'  as any, buyPrice: BigInt(77_000_000), sellPrice: BigInt(79_000_000), recordedAt: new Date() },
      { brand: 'BAO_TIN' as any, goldType: 'VANG_24K' as any, buyPrice: BigInt(90_000_000), sellPrice: BigInt(92_000_000), recordedAt: new Date() },
    ];
    const result = service.calculateOpportunities(prices);
    expect(result[0].profitPercent).toBeGreaterThanOrEqual(result[1].profitPercent);
  });
});
```

- [ ] **Step 3.2: Run tests — verify they FAIL**

```bash
cd apps/api && pnpm test -- --testPathPattern=arbitrage.service.spec --no-coverage 2>&1 | tail -10
```

Expected: `Cannot find module './arbitrage.service'`

- [ ] **Step 3.3: Implement ArbitrageService with `calculateOpportunities`**

Create `apps/api/src/arbitrage/arbitrage.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GoldBrand, GoldType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ArbitrageOpportunityDto, ArbitrageHistoryDto } from '@gpls/shared';

export interface LatestBrandPrice {
  brand: GoldBrand;
  goldType: GoldType;
  buyPrice: bigint;
  sellPrice: bigint;
  recordedAt: Date;
}

@Injectable()
export class ArbitrageService {
  private readonly logger = new Logger(ArbitrageService.name);

  constructor(private readonly prisma: PrismaService) {}

  calculateOpportunities(prices: LatestBrandPrice[]): ArbitrageOpportunityDto[] {
    const byGoldType = new Map<string, LatestBrandPrice[]>();
    for (const p of prices) {
      if (!byGoldType.has(p.goldType)) byGoldType.set(p.goldType, []);
      byGoldType.get(p.goldType)!.push(p);
    }

    const opportunities: ArbitrageOpportunityDto[] = [];

    for (const [goldType, items] of byGoldType.entries()) {
      if (items.length < 2) continue;

      // Cheapest to BUY FROM = lowest sellPrice (what you pay to the store)
      let cheapestSell = items[0];
      // Best to SELL TO = highest buyPrice (what the store pays you)
      let bestBuy = items[0];

      for (const item of items) {
        if (Number(item.sellPrice) < Number(cheapestSell.sellPrice)) cheapestSell = item;
        if (Number(item.buyPrice) > Number(bestBuy.buyPrice)) bestBuy = item;
      }

      if (cheapestSell.brand === bestBuy.brand) continue;

      const grossProfit = Number(bestBuy.buyPrice) - Number(cheapestSell.sellPrice);
      if (grossProfit <= 0) continue;

      const profitPercent =
        Math.round((grossProfit / Number(cheapestSell.sellPrice)) * 10000) / 100;

      opportunities.push({
        goldType,
        buyFromBrand: cheapestSell.brand,
        buyFromPrice: Number(cheapestSell.sellPrice),
        sellToBrand: bestBuy.brand,
        sellToPrice: Number(bestBuy.buyPrice),
        grossProfit,
        profitPercent,
        updatedAt: new Date(
          Math.max(cheapestSell.recordedAt.getTime(), bestBuy.recordedAt.getTime()),
        ).toISOString(),
      });
    }

    return opportunities.sort((a, b) => b.profitPercent - a.profitPercent);
  }

  async getOpportunities(): Promise<ArbitrageOpportunityDto[]> {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000); // last hour
    const records = await this.prisma.priceRecord.findMany({
      where: { isAnomalous: false, recordedAt: { gte: cutoff } },
      orderBy: { recordedAt: 'desc' },
      select: { brand: true, goldType: true, buyPrice: true, sellPrice: true, recordedAt: true },
    });

    // Keep only latest per (brand, goldType)
    const seen = new Set<string>();
    const latest: LatestBrandPrice[] = [];
    for (const r of records) {
      const key = `${r.brand}:${r.goldType}`;
      if (!seen.has(key)) {
        seen.add(key);
        latest.push(r);
      }
    }

    return this.calculateOpportunities(latest);
  }

  @OnEvent('price.updated')
  async onPriceUpdated(_event: { brand: string; goldType: string }): Promise<void> {
    try {
      const opportunities = await this.getOpportunities();
      for (const opp of opportunities) {
        await this.prisma.arbitrageSnapshot.create({
          data: {
            goldType: opp.goldType as GoldType,
            buyBrand: opp.buyFromBrand as GoldBrand,
            sellBrand: opp.sellToBrand as GoldBrand,
            grossProfit: BigInt(Math.round(opp.grossProfit)),
            profitPercent: opp.profitPercent,
          },
        });
      }
    } catch (err) {
      this.logger.error(`onPriceUpdated: ${(err as Error).message}`);
    }
  }

  async getHistory(goldType: string, hours = 24): Promise<ArbitrageHistoryDto[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const snaps = await this.prisma.arbitrageSnapshot.findMany({
      where: { goldType: goldType as GoldType, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
    });
    return snaps.map(s => ({
      goldType: s.goldType,
      grossProfit: Number(s.grossProfit),
      profitPercent: Number(s.profitPercent),
      recordedAt: s.recordedAt.toISOString(),
    }));
  }
}
```

- [ ] **Step 3.4: Run tests — verify they PASS**

```bash
cd apps/api && pnpm test -- --testPathPattern=arbitrage.service.spec --no-coverage 2>&1 | tail -10
```

Expected: `Tests: 5 passed, 5 total`

- [ ] **Step 3.5: Commit**

```bash
git add apps/api/src/arbitrage/
git commit -m "feat(arbitrage): ArbitrageService with calculateOpportunities + 5 tests"
```

---

### Task 4: ArbitrageController + ArbitrageModule

**Files:**
- Create: `apps/api/src/arbitrage/arbitrage.controller.ts`
- Create: `apps/api/src/arbitrage/arbitrage.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 4.1: Create controller**

Create `apps/api/src/arbitrage/arbitrage.controller.ts`:

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { ArbitrageService } from './arbitrage.service';

@Controller('prices/arbitrage')
export class ArbitrageController {
  constructor(private readonly arbitrageService: ArbitrageService) {}

  @Get()
  getOpportunities() {
    return this.arbitrageService.getOpportunities();
  }

  @Get('history')
  getHistory(
    @Query('goldType') goldType: string,
    @Query('hours') hours?: string,
  ) {
    return this.arbitrageService.getHistory(goldType, hours ? Number(hours) : 24);
  }
}
```

- [ ] **Step 4.2: Create module**

Create `apps/api/src/arbitrage/arbitrage.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ArbitrageService } from './arbitrage.service';
import { ArbitrageController } from './arbitrage.controller';

@Module({
  providers: [ArbitrageService],
  controllers: [ArbitrageController],
})
export class ArbitrageModule {}
```

- [ ] **Step 4.3: Register in AppModule**

In `apps/api/src/app.module.ts`, add:

```typescript
import { ArbitrageModule } from './arbitrage/arbitrage.module';
```

And add `ArbitrageModule` to the `imports` array (after `ForecastModule`).

- [ ] **Step 4.4: TypeScript check**

```bash
cd apps/api && npx tsc --noEmit 2>&1
```

Expected: no output (zero errors).

- [ ] **Step 4.5: Commit**

```bash
git add apps/api/src/arbitrage/ apps/api/src/app.module.ts
git commit -m "feat(arbitrage): ArbitrageController, ArbitrageModule, AppModule registration"
```

---

### Task 5: Frontend — arbitrage.api.ts + test

**Files:**
- Create: `apps/web/src/lib/arbitrage.api.ts`
- Create: `apps/web/src/__tests__/lib/arbitrage.test.ts`
- Modify: `apps/web/src/lib/use-realtime-prices.ts`

- [ ] **Step 5.1: Write the failing frontend test**

Create `apps/web/src/__tests__/lib/arbitrage.test.ts`:

```typescript
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
```

- [ ] **Step 5.2: Run tests — verify they FAIL**

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 22
cd apps/web && pnpm test 2>&1 | grep -E "FAIL|PASS|arbitrage" | head -5
```

Expected: `Cannot find module '@/lib/arbitrage.api'`

- [ ] **Step 5.3: Implement arbitrage.api.ts**

Create `apps/web/src/lib/arbitrage.api.ts`:

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type { ArbitrageOpportunityDto, ArbitrageHistoryDto } from '@gpls/shared';

export function useArbitrageOpportunities() {
  return useQuery({
    queryKey: ['prices', 'arbitrage'],
    queryFn: async () => {
      const { data } = await apiClient.get<ArbitrageOpportunityDto[]>('/prices/arbitrage');
      return data;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useArbitrageHistory(goldType: string, hours = 24) {
  return useQuery({
    queryKey: ['prices', 'arbitrage', 'history', goldType, hours],
    queryFn: async () => {
      const { data } = await apiClient.get<ArbitrageHistoryDto[]>(
        `/prices/arbitrage/history?goldType=${goldType}&hours=${hours}`,
      );
      return data;
    },
    staleTime: 60_000,
    enabled: !!goldType,
  });
}
```

- [ ] **Step 5.4: Update use-realtime-prices.ts to also invalidate arbitrage**

In `apps/web/src/lib/use-realtime-prices.ts`, update the `price:updated` handler:

```typescript
    socket.on('price:updated', (_data: PriceUpdatedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['prices', 'domestic'] });
      queryClient.invalidateQueries({ queryKey: ['prices', 'comparison'] });
      queryClient.invalidateQueries({ queryKey: ['prices', 'arbitrage'] });
    });
```

- [ ] **Step 5.5: Run tests — verify they PASS**

```bash
cd apps/web && pnpm test 2>&1 | tail -6
```

Expected: `Tests: 34 passed` (32 existing + 2 new)

- [ ] **Step 5.6: Commit**

```bash
git add apps/web/src/lib/arbitrage.api.ts apps/web/src/__tests__/lib/arbitrage.test.ts apps/web/src/lib/use-realtime-prices.ts
git commit -m "feat(web): arbitrage.api.ts hook + 2 tests, invalidate arbitrage on ws event"
```

---

### Task 6: ArbitrageWidget component

**Files:**
- Create: `apps/web/src/components/ArbitrageWidget.tsx`

- [ ] **Step 6.1: Create ArbitrageWidget**

Create `apps/web/src/components/ArbitrageWidget.tsx`:

```typescript
'use client';

import { useArbitrageOpportunities } from '@/lib/arbitrage.api';
import Link from 'next/link';

function fmt(n: number) {
  return n.toLocaleString('vi-VN');
}

export function ArbitrageWidget() {
  const { data: opps, isLoading } = useArbitrageOpportunities();

  return (
    <div style={{
      background: 'var(--ink-2)',
      border: '1px solid var(--line)',
      borderRadius: 12,
      padding: 20,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 15 }}>
          ⚡ Chênh lệch giá
        </span>
        <span style={{
          background: '#9DCC6E22',
          color: '#9DCC6E',
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 11,
        }}>● LIVE</span>
      </div>

      {isLoading && (
        <p style={{ color: 'var(--chalk-3)', fontSize: 13 }}>Đang tải...</p>
      )}

      {!isLoading && (!opps || opps.length === 0) && (
        <p style={{ color: 'var(--chalk-3)', fontSize: 13 }}>
          Không có cơ hội chênh lệch hiện tại.
        </p>
      )}

      {opps && opps.slice(0, 3).map((opp, i) => (
        <div key={i} style={{
          background: 'var(--ink-3, #14141A)',
          border: '1px solid var(--line)',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}>
          <div>
            <div style={{ color: 'var(--chalk-3)', fontSize: 11, marginBottom: 4 }}>
              {opp.goldType.replace('_', ' ')}
            </div>
            <div style={{ fontSize: 13 }}>
              <span style={{ color: '#58C896' }}>Mua {opp.buyFromBrand}</span>
              <span style={{ color: 'var(--chalk-3)', margin: '0 6px' }}>→</span>
              <span style={{ color: '#E5484D' }}>Bán {opp.sellToBrand}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ color: '#9DCC6E', fontWeight: 700, fontSize: 17 }}>
              +{fmt(opp.grossProfit)}₫
            </div>
            <div style={{ color: 'var(--chalk-3)', fontSize: 11 }}>
              +{opp.profitPercent.toFixed(2)}% / lượng
            </div>
          </div>
        </div>
      ))}

      <div style={{ textAlign: 'right', marginTop: 8 }}>
        <Link href="/tools/arbitrage" style={{ color: 'var(--gold)', fontSize: 12, textDecoration: 'none' }}>
          Xem chi tiết →
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 6.2: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 6.3: Commit**

```bash
git add apps/web/src/components/ArbitrageWidget.tsx
git commit -m "feat(web): ArbitrageWidget component"
```

---

### Task 7: /tools/arbitrage full page

**Files:**
- Create: `apps/web/src/app/tools/arbitrage/page.tsx`

- [ ] **Step 7.1: Create arbitrage page**

Create `apps/web/src/app/tools/arbitrage/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useArbitrageOpportunities, useArbitrageHistory } from '@/lib/arbitrage.api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { ArbitrageOpportunityDto } from '@gpls/shared';

const GOLD_TYPES = ['NHAN_9999', 'MIEN_SJC', 'VANG_24K', 'VANG_18K'] as const;

function fmt(n: number) {
  return n.toLocaleString('vi-VN');
}

function OpportunityRow({ opp, quantity }: { opp: ArbitrageOpportunityDto; quantity: number }) {
  return (
    <div style={{
      background: 'var(--ink-2)',
      border: '1px solid #9DCC6E44',
      borderRadius: 10,
      padding: 16,
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ color: 'var(--chalk-3)', fontSize: 12, marginBottom: 6 }}>
            {opp.goldType.replace('_', ' ')}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: 'var(--chalk-3)', fontSize: 11 }}>Mua từ</div>
              <div style={{ color: '#58C896', fontWeight: 600 }}>{opp.buyFromBrand}</div>
              <div style={{ fontSize: 12, color: 'var(--chalk-3)' }}>{fmt(opp.buyFromPrice)}₫</div>
            </div>
            <div style={{ alignSelf: 'center', color: 'var(--chalk-3)', fontSize: 18 }}>→</div>
            <div>
              <div style={{ color: 'var(--chalk-3)', fontSize: 11 }}>Bán cho</div>
              <div style={{ color: '#E5484D', fontWeight: 600 }}>{opp.sellToBrand}</div>
              <div style={{ fontSize: 12, color: 'var(--chalk-3)' }}>{fmt(opp.sellToPrice)}₫</div>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#9DCC6E', fontSize: 22, fontWeight: 700 }}>
            +{fmt(opp.grossProfit * quantity)}₫
          </div>
          <div style={{ color: 'var(--chalk-3)', fontSize: 12 }}>
            +{opp.profitPercent.toFixed(2)}% · {quantity} lượng
          </div>
          <div style={{ color: 'var(--chalk-3)', fontSize: 11, marginTop: 4 }}>
            Cập nhật: {new Date(opp.updatedAt).toLocaleTimeString('vi-VN')}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ArbitragePage() {
  const [goldTypeFilter, setGoldTypeFilter] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const { data: opps, isLoading } = useArbitrageOpportunities();
  const { data: history } = useArbitrageHistory(
    goldTypeFilter || (opps?.[0]?.goldType ?? 'NHAN_9999'),
    24,
  );

  const filtered = opps
    ? goldTypeFilter ? opps.filter(o => o.goldType === goldTypeFilter) : opps
    : [];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ color: 'var(--gold)', marginBottom: 4, fontSize: 24 }}>⚡ Chênh lệch giá vàng</h1>
      <p style={{ color: 'var(--chalk-3)', fontSize: 14, marginBottom: 24 }}>
        So sánh giá mua/bán giữa các thương hiệu real-time. Mua nơi rẻ nhất, bán nơi cao nhất.
      </p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['', ...GOLD_TYPES] as const).map(gt => (
          <button key={gt} onClick={() => setGoldTypeFilter(gt)} style={{
            padding: '5px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
            background: goldTypeFilter === gt ? 'var(--gold)' : 'var(--ink-2)',
            color: goldTypeFilter === gt ? '#000' : 'var(--chalk-3)',
            border: `1px solid ${goldTypeFilter === gt ? 'var(--gold)' : 'var(--line)'}`,
          }}>
            {gt || 'Tất cả'}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--chalk-3)', fontSize: 13 }}>Số lượng:</span>
          <input
            type="number" min={1} max={100} value={quantity}
            onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
            style={{
              width: 60, padding: '4px 8px', borderRadius: 6,
              background: 'var(--ink-2)', border: '1px solid var(--line)',
              color: 'var(--chalk)', fontSize: 13, textAlign: 'center',
            }}
          />
          <span style={{ color: 'var(--chalk-3)', fontSize: 13 }}>lượng</span>
        </div>
      </div>

      {/* Opportunities list */}
      {isLoading && <p style={{ color: 'var(--chalk-3)' }}>Đang tải...</p>}
      {!isLoading && filtered.length === 0 && (
        <div style={{
          background: 'var(--ink-2)', border: '1px solid var(--line)',
          borderRadius: 10, padding: 24, textAlign: 'center', color: 'var(--chalk-3)',
        }}>
          Không có cơ hội chênh lệch giá hiện tại.
          <br /><span style={{ fontSize: 12 }}>Thị trường đang ở trạng thái cân bằng.</span>
        </div>
      )}
      {filtered.map((opp, i) => (
        <OpportunityRow key={i} opp={opp} quantity={quantity} />
      ))}

      {/* 24h history chart */}
      {history && history.length > 1 && (
        <div style={{
          background: 'var(--ink-2)', border: '1px solid var(--line)',
          borderRadius: 10, padding: 16, marginTop: 24,
        }}>
          <div style={{ color: 'var(--chalk-3)', fontSize: 13, marginBottom: 12 }}>
            Lịch sử chênh lệch 24h — {goldTypeFilter || opps?.[0]?.goldType}
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={history}>
              <XAxis dataKey="recordedAt" hide />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip
                formatter={(v: number) => [`${fmt(v)}₫`, 'Lợi nhuận']}
                labelFormatter={l => new Date(l as string).toLocaleTimeString('vi-VN')}
                contentStyle={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 6 }}
              />
              <Line type="monotone" dataKey="grossProfit" stroke="#D4AF37" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <p style={{ color: 'var(--chalk-3)', fontSize: 11, marginTop: 16, textAlign: 'center' }}>
        * Giá tham khảo, chưa tính phí giao dịch và thuế TNCN. Đơn vị có thể khác nhau giữa các thương hiệu.
      </p>
    </div>
  );
}
```

- [ ] **Step 7.2: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 7.3: Commit**

```bash
git add apps/web/src/app/tools/arbitrage/
git commit -m "feat(web): /tools/arbitrage page with matrix view, calculator, 24h chart"
```

---

### Task 8: Add ArbitrageWidget to Dashboard

**Files:**
- Modify: `apps/web/src/components/dashboard/OverviewPage.tsx`

- [ ] **Step 8.1: Read current OverviewPage**

Read `apps/web/src/components/dashboard/OverviewPage.tsx` to understand current widget layout. Find a logical place to insert `ArbitrageWidget` (typically after the price table or heat index widget section).

- [ ] **Step 8.2: Add import and widget**

Add import at top of the file:
```typescript
import { ArbitrageWidget } from '@/components/ArbitrageWidget';
```

Insert `<ArbitrageWidget />` inside the JSX where it fits the layout — typically in the right column or after the main price table:
```typescript
<ArbitrageWidget />
```

- [ ] **Step 8.3: TypeScript check + full test run**

```bash
cd apps/web && npx tsc --noEmit 2>&1 && echo "tsc: OK"
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 22 && pnpm test 2>&1 | tail -5
```

Expected: `tsc: OK` and `Tests: 34 passed`.

- [ ] **Step 8.4: Commit**

```bash
git add apps/web/src/components/dashboard/OverviewPage.tsx
git commit -m "feat(web): add ArbitrageWidget to dashboard overview"
```

---

## Part B — Gold vs Assets Comparison

---

### Task 9: DB Schema — AssetBenchmark

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 9.1: Add `AssetBenchmark` model**

Append to `apps/api/prisma/schema.prisma`:

```prisma
// ─── Asset Benchmarks (admin-editable mock data) ─────────────────────────────

model AssetBenchmark {
  id          String   @id @default(cuid())
  assetType   String   // 'VN_INDEX' | 'BANK_DEPOSIT'
  date        DateTime @db.Date
  value       Decimal  @db.Decimal(12, 4)
  // For VN_INDEX: index points (e.g. 1250.5)
  // For BANK_DEPOSIT: annual rate % (e.g. 5.5)
  note        String?
  createdAt   DateTime @default(now())

  @@unique([assetType, date])
  @@index([assetType, date])
}
```

- [ ] **Step 9.2: Run migration**

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 22
cd apps/api && npx prisma migrate dev --name add_asset_benchmark
```

Expected: migration applied, Prisma Client regenerated.

- [ ] **Step 9.3: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat(db): add AssetBenchmark model"
```

---

### Task 10: Shared Types — Assets Comparison DTOs

**Files:**
- Modify: `packages/shared/src/types/gold.types.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 10.1: Add types to gold.types.ts**

Append to `packages/shared/src/types/gold.types.ts`:

```typescript
export interface DataSeriesDto {
  label: string;
  returnPercent: number;
  dataPoints: { date: string; value: number }[];
}

export interface AssetsComparisonDto {
  range: string;
  baseDate: string;
  gold: DataSeriesDto;
  usd: DataSeriesDto;
  bankDeposit: DataSeriesDto;
  vnIndex: DataSeriesDto | null;  // null when no mock data available
  insight: string;
}

export interface AssetBenchmarkDto {
  id: string;
  assetType: string;
  date: string;
  value: number;
  note: string | null;
}
```

- [ ] **Step 10.2: Re-export from shared index**

Add to `packages/shared/src/index.ts`:

```typescript
export type { DataSeriesDto, AssetsComparisonDto, AssetBenchmarkDto } from './types/gold.types';
```

- [ ] **Step 10.3: Commit**

```bash
git add packages/shared/src/
git commit -m "feat(shared): add DataSeriesDto, AssetsComparisonDto, AssetBenchmarkDto"
```

---

### Task 11: AssetsComparisonService — pure helpers + unit tests

**Files:**
- Create: `apps/api/src/assets-comparison/assets-comparison.service.ts`
- Create: `apps/api/src/assets-comparison/assets-comparison.service.spec.ts`

- [ ] **Step 11.1: Write failing tests**

Create `apps/api/src/assets-comparison/assets-comparison.service.spec.ts`:

```typescript
import { AssetsComparisonService } from './assets-comparison.service';

describe('AssetsComparisonService — pure helpers', () => {
  let service: AssetsComparisonService;

  beforeEach(() => {
    service = new AssetsComparisonService(null as any);
  });

  describe('normalizeToBase100', () => {
    it('first point becomes 100', () => {
      const input = [
        { date: '2026-01-01', value: 80_000_000 },
        { date: '2026-01-02', value: 82_000_000 },
        { date: '2026-01-03', value: 78_000_000 },
      ];
      const result = service.normalizeToBase100(input);
      expect(result[0].value).toBe(100);
      expect(result[1].value).toBeCloseTo(102.5, 1);
      expect(result[2].value).toBeCloseTo(97.5, 1);
    });

    it('returns empty array for empty input', () => {
      expect(service.normalizeToBase100([])).toEqual([]);
    });

    it('preserves date strings', () => {
      const input = [
        { date: '2026-03-01', value: 100 },
        { date: '2026-03-02', value: 110 },
      ];
      const result = service.normalizeToBase100(input);
      expect(result[0].date).toBe('2026-03-01');
      expect(result[1].date).toBe('2026-03-02');
    });
  });

  describe('computeBankSeries', () => {
    it('day 0 value is 100', () => {
      const base = new Date('2026-01-01');
      const end = new Date('2026-01-03');
      const result = service.computeBankSeries(5.5, base, end);
      expect(result[0].value).toBe(100);
    });

    it('returns one point per day inclusive', () => {
      const base = new Date('2026-01-01');
      const end = new Date('2026-01-05');
      const result = service.computeBankSeries(5.5, base, end);
      expect(result).toHaveLength(5);
    });

    it('day 365 value ≈ 105.5 for 5.5% annual rate', () => {
      const base = new Date('2026-01-01');
      const end = new Date('2027-01-01'); // 365 days
      const result = service.computeBankSeries(5.5, base, end);
      expect(result[result.length - 1].value).toBeCloseTo(105.65, 0);
    });

    it('date strings are ISO date format YYYY-MM-DD', () => {
      const base = new Date('2026-06-15');
      const end = new Date('2026-06-16');
      const result = service.computeBankSeries(5.5, base, end);
      expect(result[0].date).toBe('2026-06-15');
      expect(result[1].date).toBe('2026-06-16');
    });
  });
});
```

- [ ] **Step 11.2: Run tests — verify they FAIL**

```bash
cd apps/api && pnpm test -- --testPathPattern=assets-comparison.service.spec --no-coverage 2>&1 | tail -5
```

Expected: `Cannot find module './assets-comparison.service'`

- [ ] **Step 11.3: Implement service with pure helpers + getComparison**

Create `apps/api/src/assets-comparison/assets-comparison.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { GoldBrand, GoldType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AssetsComparisonDto, DataSeriesDto } from '@gpls/shared';

export type ComparisonRange = '1M' | '3M' | '6M' | '1Y';

const RANGE_DAYS: Record<ComparisonRange, number> = {
  '1M': 30, '3M': 90, '6M': 180, '1Y': 365,
};

@Injectable()
export class AssetsComparisonService {
  constructor(private readonly prisma: PrismaService) {}

  normalizeToBase100(
    dataPoints: { date: string; value: number }[],
  ): { date: string; value: number }[] {
    if (dataPoints.length === 0) return [];
    const base = dataPoints[0].value;
    return dataPoints.map(p => ({
      date: p.date,
      value: Math.round((p.value / base) * 10000) / 100,
    }));
  }

  computeBankSeries(
    annualRatePercent: number,
    baseDate: Date,
    endDate: Date,
  ): { date: string; value: number }[] {
    const dailyRate = annualRatePercent / 100 / 365;
    const result: { date: string; value: number }[] = [];
    const current = new Date(baseDate);
    let day = 0;
    while (current <= endDate) {
      result.push({
        date: current.toISOString().slice(0, 10),
        value: Math.round(100 * (1 + dailyRate) ** day * 100) / 100,
      });
      current.setDate(current.getDate() + 1);
      day++;
    }
    return result;
  }

  async getComparison(range: ComparisonRange = '1M'): Promise<AssetsComparisonDto> {
    const days = RANGE_DAYS[range];
    const endDate = new Date();
    const baseDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // ── Gold (SJC NHAN_9999) ──
    const goldRecords = await this.prisma.priceRecord.findMany({
      where: {
        brand: GoldBrand.SJC,
        goldType: GoldType.NHAN_9999,
        isAnomalous: false,
        recordedAt: { gte: baseDate },
      },
      orderBy: { recordedAt: 'asc' },
      select: { recordedAt: true, sellPrice: true },
    });
    const goldRaw = goldRecords.map(r => ({
      date: r.recordedAt.toISOString().slice(0, 10),
      value: Number(r.sellPrice),
    }));
    // Deduplicate to one point per day (last of the day)
    const goldDaily = this.lastPerDay(goldRaw);
    const goldPoints = this.normalizeToBase100(goldDaily);

    // ── USD/VND ──
    const usdRecords = await this.prisma.exchangeRate.findMany({
      where: {
        fromCurrency: 'USD',
        toCurrency: 'VND',
        recordedAt: { gte: baseDate },
      },
      orderBy: { recordedAt: 'asc' },
      select: { recordedAt: true, rate: true },
    });
    const usdRaw = usdRecords.map(r => ({
      date: r.recordedAt.toISOString().slice(0, 10),
      value: Number(r.rate),
    }));
    const usdPoints = this.normalizeToBase100(this.lastPerDay(usdRaw));

    // ── Bank Deposit ──
    const bankBenchmark = await this.prisma.assetBenchmark.findFirst({
      where: { assetType: 'BANK_DEPOSIT' },
      orderBy: { date: 'desc' },
    });
    const bankRate = bankBenchmark ? Number(bankBenchmark.value) : 5.5;
    const bankPoints = this.computeBankSeries(bankRate, baseDate, endDate);

    // ── VN-Index ──
    const vnRecords = await this.prisma.assetBenchmark.findMany({
      where: { assetType: 'VN_INDEX', date: { gte: baseDate } },
      orderBy: { date: 'asc' },
    });
    let vnIndex: DataSeriesDto | null = null;
    if (vnRecords.length >= 2) {
      const vnRaw = vnRecords.map(r => ({
        date: (r.date as Date).toISOString().slice(0, 10),
        value: Number(r.value),
      }));
      vnIndex = {
        label: 'VN-Index',
        returnPercent: Math.round(((vnRaw[vnRaw.length - 1].value / vnRaw[0].value) - 1) * 10000) / 100,
        dataPoints: this.normalizeToBase100(vnRaw),
      };
    }

    // ── Assemble ──
    const goldReturn = goldPoints.length > 1
      ? Math.round((goldPoints[goldPoints.length - 1].value - 100) * 100) / 100
      : 0;
    const usdReturn = usdPoints.length > 1
      ? Math.round((usdPoints[usdPoints.length - 1].value - 100) * 100) / 100
      : 0;
    const bankReturn = bankPoints.length > 1
      ? Math.round((bankPoints[bankPoints.length - 1].value - 100) * 100) / 100
      : 0;

    const insight = this.generateInsight(goldReturn, usdReturn, bankReturn, vnIndex?.returnPercent ?? null, range);

    return {
      range,
      baseDate: baseDate.toISOString().slice(0, 10),
      gold: { label: 'Vàng SJC', returnPercent: goldReturn, dataPoints: goldPoints },
      usd: { label: 'USD/VND', returnPercent: usdReturn, dataPoints: usdPoints },
      bankDeposit: { label: `Gửi NH (${bankRate}%/năm)`, returnPercent: bankReturn, dataPoints: bankPoints },
      vnIndex,
      insight,
    };
  }

  private lastPerDay(points: { date: string; value: number }[]): { date: string; value: number }[] {
    const map = new Map<string, number>();
    for (const p of points) map.set(p.date, p.value);
    return Array.from(map.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private generateInsight(gold: number, usd: number, bank: number, vni: number | null, range: string): string {
    const channels = [
      { name: 'Vàng SJC', r: gold },
      { name: 'USD/VND', r: usd },
      { name: 'Gửi ngân hàng', r: bank },
      ...(vni !== null ? [{ name: 'VN-Index', r: vni }] : []),
    ].sort((a, b) => b.r - a.r);

    const winner = channels[0];
    const rangeLabel = { '1M': '1 tháng', '3M': '3 tháng', '6M': '6 tháng', '1Y': '1 năm' }[range] ?? range;

    if (winner.r > 0) {
      return `Trong ${rangeLabel} qua, ${winner.name} dẫn đầu với ${winner.r > 0 ? '+' : ''}${winner.r.toFixed(2)}%.`;
    }
    return `Trong ${rangeLabel} qua, tất cả kênh đều giảm. ${winner.name} giảm ít nhất (${winner.r.toFixed(2)}%).`;
  }
}
```

- [ ] **Step 11.4: Run tests — verify they PASS**

```bash
cd apps/api && pnpm test -- --testPathPattern=assets-comparison.service.spec --no-coverage 2>&1 | tail -8
```

Expected: `Tests: 8 passed, 8 total`

- [ ] **Step 11.5: Commit**

```bash
git add apps/api/src/assets-comparison/
git commit -m "feat(assets-comparison): AssetsComparisonService with pure helpers + 8 tests"
```

---

### Task 12: AssetsComparisonController + Module + AppModule

**Files:**
- Create: `apps/api/src/assets-comparison/assets-comparison.controller.ts`
- Create: `apps/api/src/assets-comparison/assets-comparison.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 12.1: Create controller**

Create `apps/api/src/assets-comparison/assets-comparison.controller.ts`:

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { AssetsComparisonService, ComparisonRange } from './assets-comparison.service';

@Controller('prices/assets-comparison')
export class AssetsComparisonController {
  constructor(private readonly service: AssetsComparisonService) {}

  @Get()
  getComparison(@Query('range') range?: string) {
    const validRanges: ComparisonRange[] = ['1M', '3M', '6M', '1Y'];
    const r = validRanges.includes(range as ComparisonRange) ? (range as ComparisonRange) : '1M';
    return this.service.getComparison(r);
  }
}
```

- [ ] **Step 12.2: Create module**

Create `apps/api/src/assets-comparison/assets-comparison.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AssetsComparisonService } from './assets-comparison.service';
import { AssetsComparisonController } from './assets-comparison.controller';

@Module({
  providers: [AssetsComparisonService],
  controllers: [AssetsComparisonController],
})
export class AssetsComparisonModule {}
```

- [ ] **Step 12.3: Register in AppModule**

In `apps/api/src/app.module.ts`, add:

```typescript
import { AssetsComparisonModule } from './assets-comparison/assets-comparison.module';
```

Add `AssetsComparisonModule` to the `imports` array.

- [ ] **Step 12.4: TypeScript check**

```bash
cd apps/api && npx tsc --noEmit 2>&1 && echo "OK"
```

Expected: `OK`

- [ ] **Step 12.5: Commit**

```bash
git add apps/api/src/assets-comparison/ apps/api/src/app.module.ts
git commit -m "feat(assets-comparison): controller, module, AppModule registration"
```

---

### Task 13: Admin — AssetBenchmark CRUD

**Files:**
- Modify: `apps/api/src/admin/admin.service.ts`
- Modify: `apps/api/src/admin/admin.controller.ts`

- [ ] **Step 13.1: Read current admin service/controller**

Read `apps/api/src/admin/admin.service.ts` and `apps/api/src/admin/admin.controller.ts` to understand existing patterns (method naming, auth guards used).

- [ ] **Step 13.2: Add CRUD methods to AdminService**

Append these methods to `AdminService` class in `apps/api/src/admin/admin.service.ts`:

```typescript
  async getBenchmarks(assetType?: string) {
    return this.prisma.assetBenchmark.findMany({
      where: assetType ? { assetType } : undefined,
      orderBy: [{ assetType: 'asc' }, { date: 'desc' }],
    });
  }

  async upsertBenchmark(dto: { assetType: string; date: string; value: number; note?: string }) {
    const date = new Date(dto.date);
    return this.prisma.assetBenchmark.upsert({
      where: { assetType_date: { assetType: dto.assetType, date } },
      create: { assetType: dto.assetType, date, value: dto.value, note: dto.note },
      update: { value: dto.value, note: dto.note },
    });
  }

  async deleteBenchmark(id: string) {
    return this.prisma.assetBenchmark.delete({ where: { id } });
  }
```

- [ ] **Step 13.3: Add endpoints to AdminController**

Append these endpoints to `AdminController` class in `apps/api/src/admin/admin.controller.ts` (use the same `@UseGuards` and role check pattern already present in the file):

```typescript
  @Get('benchmarks')
  @UseGuards(JwtAuthGuard)
  getBenchmarks(@Query('assetType') assetType?: string) {
    return this.adminService.getBenchmarks(assetType);
  }

  @Post('benchmarks')
  @UseGuards(JwtAuthGuard)
  upsertBenchmark(
    @Body() body: { assetType: string; date: string; value: number; note?: string },
  ) {
    return this.adminService.upsertBenchmark(body);
  }

  @Delete('benchmarks/:id')
  @UseGuards(JwtAuthGuard)
  deleteBenchmark(@Param('id') id: string) {
    return this.adminService.deleteBenchmark(id);
  }
```

Add `@Param` to the imports from `@nestjs/common` if not already present.

- [ ] **Step 13.4: TypeScript check**

```bash
cd apps/api && npx tsc --noEmit 2>&1 && echo "OK"
```

Expected: `OK`

- [ ] **Step 13.5: Commit**

```bash
git add apps/api/src/admin/
git commit -m "feat(admin): AssetBenchmark CRUD endpoints (GET/POST/DELETE /admin/benchmarks)"
```

---

### Task 14: Frontend — assets-comparison.api.ts

**Files:**
- Create: `apps/web/src/lib/assets-comparison.api.ts`

- [ ] **Step 14.1: Create hook**

Create `apps/web/src/lib/assets-comparison.api.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type { AssetsComparisonDto, AssetBenchmarkDto } from '@gpls/shared';

export type ComparisonRange = '1M' | '3M' | '6M' | '1Y';

export function useAssetsComparison(range: ComparisonRange = '1M') {
  return useQuery({
    queryKey: ['prices', 'assets-comparison', range],
    queryFn: async () => {
      const { data } = await apiClient.get<AssetsComparisonDto>(
        `/prices/assets-comparison?range=${range}`,
      );
      return data;
    },
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  });
}

export function useBenchmarks(assetType?: string) {
  return useQuery({
    queryKey: ['admin', 'benchmarks', assetType],
    queryFn: async () => {
      const params = assetType ? `?assetType=${assetType}` : '';
      const { data } = await apiClient.get<AssetBenchmarkDto[]>(`/admin/benchmarks${params}`);
      return data;
    },
  });
}

export function useUpsertBenchmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { assetType: string; date: string; value: number; note?: string }) =>
      apiClient.post('/admin/benchmarks', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'benchmarks'] }),
  });
}

export function useDeleteBenchmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/benchmarks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'benchmarks'] }),
  });
}
```

- [ ] **Step 14.2: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 && echo "OK"
```

Expected: `OK`

- [ ] **Step 14.3: Commit**

```bash
git add apps/web/src/lib/assets-comparison.api.ts
git commit -m "feat(web): assets-comparison.api.ts hooks (useAssetsComparison, benchmark CRUD)"
```

---

### Task 15: Frontend — /tools/gold-vs-assets page

**Files:**
- Create: `apps/web/src/app/tools/gold-vs-assets/page.tsx`

- [ ] **Step 15.1: Create page**

Create `apps/web/src/app/tools/gold-vs-assets/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useAssetsComparison, ComparisonRange } from '@/lib/assets-comparison.api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { DataSeriesDto } from '@gpls/shared';

const RANGES: ComparisonRange[] = ['1M', '3M', '6M', '1Y'];
const RANGE_LABELS: Record<ComparisonRange, string> = {
  '1M': '1 tháng', '3M': '3 tháng', '6M': '6 tháng', '1Y': '1 năm',
};

const COLORS = {
  gold: '#D4AF37',
  usd: '#58C896',
  bankDeposit: '#888888',
  vnIndex: '#E5484D',
};

function PerformanceCard({
  series, capital, color,
}: { series: DataSeriesDto; capital: number; color: string }) {
  const isPositive = series.returnPercent >= 0;
  const outcome = capital * (1 + series.returnPercent / 100);
  return (
    <div style={{
      background: 'var(--ink-2)',
      border: `1px solid ${color}44`,
      borderRadius: 10,
      padding: 16,
      flex: 1,
      minWidth: 140,
    }}>
      <div style={{ color: 'var(--chalk-3)', fontSize: 12, marginBottom: 8 }}>{series.label}</div>
      <div style={{
        fontSize: 24,
        fontWeight: 700,
        color: isPositive ? '#9DCC6E' : '#E5484D',
      }}>
        {isPositive ? '+' : ''}{series.returnPercent.toFixed(2)}%
      </div>
      <div style={{ color: 'var(--chalk-3)', fontSize: 12, marginTop: 6 }}>
        {outcome.toLocaleString('vi-VN')}₫
      </div>
      <div style={{ marginTop: 8, height: 3, background: '#2a2a35', borderRadius: 2 }}>
        <div style={{
          width: `${Math.min(100, Math.abs(series.returnPercent) * 5)}%`,
          height: '100%',
          background: isPositive ? '#9DCC6E' : '#E5484D',
          borderRadius: 2,
        }} />
      </div>
    </div>
  );
}

export default function GoldVsAssetsPage() {
  const [range, setRange] = useState<ComparisonRange>('1M');
  const [capital, setCapital] = useState(100_000_000);
  const { data, isLoading } = useAssetsComparison(range);

  // Build unified chart data
  const chartData = (() => {
    if (!data) return [];
    const allDates = new Set<string>();
    for (const s of [data.gold, data.usd, data.bankDeposit, data.vnIndex].filter(Boolean)) {
      s!.dataPoints.forEach(p => allDates.add(p.date));
    }
    return Array.from(allDates).sort().map(date => {
      const row: Record<string, string | number> = { date };
      const lookup = (s: DataSeriesDto | null) =>
        s?.dataPoints.find(p => p.date === date)?.value;
      row.gold = lookup(data.gold) ?? '';
      row.usd = lookup(data.usd) ?? '';
      row.bankDeposit = lookup(data.bankDeposit) ?? '';
      if (data.vnIndex) row.vnIndex = lookup(data.vnIndex) ?? '';
      return row;
    });
  })();

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ color: 'var(--gold)', marginBottom: 4, fontSize: 24 }}>
        📊 Vàng vs Các Kênh Đầu Tư
      </h1>
      <p style={{ color: 'var(--chalk-3)', fontSize: 14, marginBottom: 24 }}>
        So sánh hiệu suất vàng với USD, gửi ngân hàng và VN-Index theo từng kỳ.
      </p>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {RANGES.map(r => (
            <button key={r} onClick={() => setRange(r)} style={{
              padding: '5px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
              background: range === r ? 'var(--gold)' : 'var(--ink-2)',
              color: range === r ? '#000' : 'var(--chalk-3)',
              border: `1px solid ${range === r ? 'var(--gold)' : 'var(--line)'}`,
            }}>
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--chalk-3)', fontSize: 13 }}>Vốn:</span>
          <input
            type="number" value={capital} step={10_000_000}
            onChange={e => setCapital(Math.max(0, Number(e.target.value)))}
            style={{
              width: 130, padding: '4px 8px', borderRadius: 6,
              background: 'var(--ink-2)', border: '1px solid var(--line)',
              color: 'var(--chalk)', fontSize: 13, textAlign: 'right',
            }}
          />
          <span style={{ color: 'var(--chalk-3)', fontSize: 13 }}>₫</span>
        </div>
      </div>

      {isLoading && <p style={{ color: 'var(--chalk-3)' }}>Đang tải dữ liệu...</p>}

      {data && (
        <>
          {/* Performance cards */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <PerformanceCard series={data.gold} capital={capital} color={COLORS.gold} />
            <PerformanceCard series={data.usd} capital={capital} color={COLORS.usd} />
            <PerformanceCard series={data.bankDeposit} capital={capital} color={COLORS.bankDeposit} />
            {data.vnIndex && (
              <PerformanceCard series={data.vnIndex} capital={capital} color={COLORS.vnIndex} />
            )}
          </div>

          {/* Normalized line chart */}
          <div style={{
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            borderRadius: 10, padding: 20, marginBottom: 16,
          }}>
            <div style={{ color: 'var(--chalk-3)', fontSize: 13, marginBottom: 12 }}>
              Hiệu suất chuẩn hoá (gốc = 100) — {RANGE_LABELS[range]}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#888' }} tickLine={false}
                  tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#888' }}
                  tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(v: number, name: string) => [v.toFixed(2), name]}
                  contentStyle={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 6 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="gold" name="Vàng SJC"
                  stroke={COLORS.gold} dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="usd" name="USD/VND"
                  stroke={COLORS.usd} dot={false} strokeWidth={1.5} />
                <Line type="monotone" dataKey="bankDeposit" name="Gửi NH"
                  stroke={COLORS.bankDeposit} dot={false} strokeWidth={1.5} strokeDasharray="4 4" />
                {data.vnIndex && (
                  <Line type="monotone" dataKey="vnIndex" name="VN-Index"
                    stroke={COLORS.vnIndex} dot={false} strokeWidth={1.5} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Insight banner */}
          <div style={{
            background: '#D4AF3710', border: '1px solid #D4AF3730',
            borderRadius: 8, padding: 14,
          }}>
            <span style={{ color: '#D4AF37' }}>💡 </span>
            <span style={{ color: 'var(--chalk)', fontSize: 13 }}>{data.insight}</span>
          </div>

          {!data.vnIndex && (
            <p style={{ color: 'var(--chalk-3)', fontSize: 12, marginTop: 8 }}>
              * VN-Index: chưa có dữ liệu. Admin có thể nhập tại trang quản trị → Benchmarks.
            </p>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 15.2: TypeScript check + full test run**

```bash
cd apps/web && npx tsc --noEmit 2>&1 && echo "tsc: OK"
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 22 && pnpm test 2>&1 | tail -5
```

Expected: `tsc: OK` and `Tests: 34 passed`.

- [ ] **Step 15.3: Commit**

```bash
git add apps/web/src/app/tools/gold-vs-assets/
git commit -m "feat(web): /tools/gold-vs-assets page with performance cards, chart, insight"
```

---

### Task 16: Admin — Benchmarks tab

**Files:**
- Modify: `apps/web/src/app/admin/page.tsx`

- [ ] **Step 16.1: Read current admin page**

Read `apps/web/src/app/admin/page.tsx` to understand existing tab structure and component patterns.

- [ ] **Step 16.2: Add BenchmarksSection component and tab**

In `apps/web/src/app/admin/page.tsx`:

1. Add imports at the top:
```typescript
import { useBenchmarks, useUpsertBenchmark, useDeleteBenchmark } from '@/lib/assets-comparison.api';
```

2. Add `BenchmarksSection` component (inside the file, before the default export):
```typescript
function BenchmarksSection() {
  const { data: items, isLoading } = useBenchmarks();
  const upsert = useUpsertBenchmark();
  const del = useDeleteBenchmark();
  const [form, setForm] = useState({ assetType: 'VN_INDEX', date: '', value: '', note: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await upsert.mutateAsync({
      assetType: form.assetType,
      date: form.date,
      value: Number(form.value),
      note: form.note || undefined,
    });
    setForm(f => ({ ...f, date: '', value: '', note: '' }));
  };

  return (
    <div>
      <h3 style={{ color: 'var(--chalk)', marginBottom: 16 }}>Asset Benchmarks</h3>
      <p style={{ color: 'var(--chalk-3)', fontSize: 13, marginBottom: 20 }}>
        Nhập dữ liệu VN-Index (điểm) và lãi suất ngân hàng (%/năm) để hiển thị trên trang Gold vs Assets.
      </p>

      {/* Add form */}
      <form onSubmit={handleSubmit} style={{
        background: 'var(--ink-2)', border: '1px solid var(--line)',
        borderRadius: 8, padding: 16, marginBottom: 20,
        display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        <div>
          <div style={{ color: 'var(--chalk-3)', fontSize: 12, marginBottom: 4 }}>Loại</div>
          <select value={form.assetType} onChange={e => setForm(f => ({ ...f, assetType: e.target.value }))}
            style={{ padding: '6px 10px', borderRadius: 6, background: 'var(--ink-3, #14141A)', border: '1px solid var(--line)', color: 'var(--chalk)', fontSize: 13 }}>
            <option value="VN_INDEX">VN-Index</option>
            <option value="BANK_DEPOSIT">Gửi ngân hàng</option>
          </select>
        </div>
        <div>
          <div style={{ color: 'var(--chalk-3)', fontSize: 12, marginBottom: 4 }}>Ngày</div>
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            required style={{ padding: '6px 10px', borderRadius: 6, background: 'var(--ink-3, #14141A)', border: '1px solid var(--line)', color: 'var(--chalk)', fontSize: 13 }} />
        </div>
        <div>
          <div style={{ color: 'var(--chalk-3)', fontSize: 12, marginBottom: 4 }}>
            {form.assetType === 'VN_INDEX' ? 'Điểm chỉ số' : 'Lãi suất (%/năm)'}
          </div>
          <input type="number" step="0.01" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
            required placeholder={form.assetType === 'VN_INDEX' ? '1250.5' : '5.5'}
            style={{ width: 100, padding: '6px 10px', borderRadius: 6, background: 'var(--ink-3, #14141A)', border: '1px solid var(--line)', color: 'var(--chalk)', fontSize: 13 }} />
        </div>
        <button type="submit" disabled={upsert.isPending} style={{
          padding: '7px 16px', borderRadius: 6, background: 'var(--gold)', color: '#000',
          border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
        }}>
          {upsert.isPending ? 'Đang lưu...' : 'Lưu'}
        </button>
      </form>

      {/* Records table */}
      {isLoading ? <p style={{ color: 'var(--chalk-3)' }}>Đang tải...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: 'var(--chalk-3)', borderBottom: '1px solid var(--line)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Loại</th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Ngày</th>
              <th style={{ padding: '8px 12px', textAlign: 'right' }}>Giá trị</th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Ghi chú</th>
              <th style={{ padding: '8px 12px' }}></th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '8px 12px' }}>{item.assetType}</td>
                <td style={{ padding: '8px 12px' }}>{item.date.slice(0, 10)}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{item.value}</td>
                <td style={{ padding: '8px 12px', color: 'var(--chalk-3)' }}>{item.note ?? '—'}</td>
                <td style={{ padding: '8px 12px' }}>
                  <button onClick={() => del.mutate(item.id)} style={{
                    padding: '3px 10px', borderRadius: 4, background: '#E5484D22',
                    color: '#E5484D', border: '1px solid #E5484D44', cursor: 'pointer', fontSize: 12,
                  }}>Xóa</button>
                </td>
              </tr>
            ))}
            {(items ?? []).length === 0 && (
              <tr><td colSpan={5} style={{ padding: 16, color: 'var(--chalk-3)', textAlign: 'center' }}>Chưa có dữ liệu</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

3. Add `'benchmarks'` to the tab list and render `<BenchmarksSection />` when that tab is active. Follow the exact same tab-switching pattern already in the file.

- [ ] **Step 16.2: TypeScript check + full test run**

```bash
cd apps/web && npx tsc --noEmit 2>&1 && echo "tsc: OK"
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 22 && pnpm test 2>&1 | tail -5
```

Expected: `tsc: OK`, `Tests: 34 passed`.

- [ ] **Step 16.3: Final API tsc check**

```bash
cd apps/api && npx tsc --noEmit 2>&1 && echo "API tsc: OK"
```

Expected: `API tsc: OK`

- [ ] **Step 16.4: Final commit**

```bash
git add apps/web/src/app/admin/page.tsx
git commit -m "feat(admin): add Benchmarks tab for VN-Index and bank rate CRUD"
```

---

## Done ✓

After all tasks complete:

- `GET /api/prices/arbitrage` — real-time cross-brand opportunities
- `GET /api/prices/arbitrage/history` — 24h snapshot history
- `GET /api/prices/assets-comparison?range=1M` — normalized comparison
- `GET|POST|DELETE /api/admin/benchmarks` — VN-Index + bank rate CRUD
- `/tools/arbitrage` — full arbitrage page with matrix + calculator + history chart
- `/tools/gold-vs-assets` — performance cards + normalized chart + insight
- `ArbitrageWidget` on dashboard — live updates via WebSocket
- Admin Benchmarks tab for entering mock VN-Index data
