# GPLS Plan 3 — Exchange Rate, Converter & Spread Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement M05 (exchange rate display + basic converter), F08 (advanced 6-unit/4-purity converter), and F11 (spread comparison dashboard) — all R1, no auth required, all users.

**Architecture:**
- `ExchangeRateModule` (NestJS): caches USD/VND + EUR/VND rates (piggybacks on InternationalModule's FX call or fetches independently). Exposes `GET /exchange-rate/rates`.
- `ConverterModule`: stateless endpoint `GET /converter/calculate?unit=TAEL&qty=2&purity=24K&currency=VND` that returns values in all 3 currencies using live rates.
- `SpreadModule`: derives spread data from existing `PriceRecord` table — no new crawling needed. Exposes `GET /spread/ranking?goldType=MIEN_SJC`.
- Frontend: `/tools/converter` page, spread section on MarketsPage, exchange rate card on OverviewPage.

**Tech Stack:** NestJS 11 · Prisma 7 · TanStack Query v5 · Next.js 15 App Router · TypeScript 5

**Depends on:** Plan 2 — InternationalService (FX rates already fetched), PriceRecord schema, `useComparison` hook.

**SRS Coverage:** M05 (FR-05.1, FR-05.2), F08 (FR-F08.1–F08.4), F11 (FR-F11.1–FR-F11.5)

---

## File Map

```
apps/api/src/
├── exchange-rate/
│   ├── exchange-rate.module.ts          NEW
│   ├── exchange-rate.service.ts         NEW  cache USD/VND + EUR/VND; refresh every 15 min
│   ├── exchange-rate.controller.ts      NEW  GET /exchange-rate/rates
│   └── exchange-rate.service.spec.ts    NEW
├── converter/
│   ├── converter.module.ts              NEW
│   ├── converter.service.ts             NEW  stateless calculation logic
│   ├── converter.controller.ts          NEW  GET /converter/calculate
│   └── converter.service.spec.ts        NEW
├── spread/
│   ├── spread.module.ts                 NEW
│   ├── spread.service.ts                NEW  getSpreadRanking(goldType) from PriceRecord
│   ├── spread.controller.ts             NEW  GET /spread/ranking
│   └── spread.service.spec.ts           NEW

packages/shared/src/types/
└── gold.types.ts                        MODIFY  add ExchangeRateDto, SpreadRankingDto, ConverterResultDto

apps/web/src/
├── lib/
│   ├── exchange-rate.api.ts             NEW  useExchangeRates() hook
│   ├── spread.api.ts                    NEW  useSpreadRanking() hook
│   └── converter.api.ts                 NEW  useConverterResult() hook (or client-side calc)
├── components/dashboard/
│   ├── OverviewPage.tsx                 MODIFY  add ExchangeRateCard widget
│   └── MarketsPage.tsx                  MODIFY  add SpreadRankingSection with bar chart
└── app/tools/converter/
    └── page.tsx                         NEW  /tools/converter full-page converter
```

---

## Tasks

### Task 1 — ExchangeRateService + Controller
- [ ] Create `exchange-rate.service.ts`:
  - Caches `{ usdVnd: number, eurVnd: number, updatedAt: Date }` in memory with 15-min TTL
  - On cache miss: fetch USD/VND from existing `InternationalService` or direct API call to `https://api.exchangerate-api.com/v4/latest/USD`
  - Method: `getRates(): Promise<ExchangeRateDto>`
- [ ] Create `exchange-rate.controller.ts`: `GET /exchange-rate/rates` → `{ usdVnd, eurVnd, updatedAt, source }`
- [ ] Register `ExchangeRateModule` in `AppModule`
- [ ] Write unit tests (mock HTTP; test cache hit/miss; test stale fallback on error)

### Task 2 — ConverterService + Controller
- [ ] Conversion constants (exact to 6 decimal places per NFR-F08.1):
  - 1 Tael (Lượng) = 37.500000 g
  - 1 Chỉ = 3.750000 g
  - 1 Phân = 0.375000 g
  - 1 Troy Ounce = 31.103477 g
  - 1 Gram = 1.000000 g
  - 1 Kilogram = 1000.000000 g
  - Purity multipliers: 24K=1.000, 22K=0.9167, 18K=0.750, 14K=0.5833
- [ ] `converter.service.ts`:
  - `calculate(unit, qty, purity, pricePerTaelVnd, usdVnd, eurVnd): ConverterResultDto`
  - Returns `{ weightInGrams, weightInTael, valuations: { VND, USD, EUR } }`
  - Pulls live `pricePerTaelVnd` from `PriceService.getCurrentPrices()` for the selected brand (default SJC MIEN_SJC)
- [ ] `converter.controller.ts`: `GET /converter/calculate?unit=TAEL&qty=2&purity=24K&brand=SJC&goldType=MIEN_SJC`
- [ ] Unit tests: exact value assertions for 1 Tael 24K SJC price

### Task 3 — SpreadService + Controller
- [ ] `spread.service.ts`:
  - `getSpreadRanking(goldType: GoldType): Promise<SpreadRankingDto[]>`
  - Query: for each brand, latest PriceRecord where `goldType = ?`; compute `spreadVnd = sellPrice - buyPrice`, `spreadPct = (sellPrice - buyPrice) / buyPrice * 100`; sort ascending
  - NFR-F11.1: only records from the same `crawlSessionId` contribute; if buy/sell from different sessions, skip that brand
- [ ] `spread.controller.ts`: `GET /spread/ranking?goldType=MIEN_SJC`
- [ ] Unit tests: multi-brand fixture; assert sorted order; assert null spread when sessions differ

### Task 4 — Shared Types
- [ ] Add to `packages/shared/src/types/gold.types.ts`:
  ```typescript
  export interface ExchangeRateDto {
    usdVnd: number;
    eurVnd: number;
    updatedAt: string;
    source: string;
  }
  export interface SpreadRankingDto {
    brand: GoldBrand;
    goldType: GoldType;
    buyPrice: number;
    sellPrice: number;
    spreadVnd: number;
    spreadPct: number;
    isMostEfficient: boolean;
  }
  export interface ConverterResultDto {
    weightInGrams: number;
    weightInTael: number;
    valuations: { VND: number; USD: number; EUR: number };
    priceUsed: number;
    priceUpdatedAt: string;
  }
  ```

### Task 5 — Frontend API Hooks
- [ ] `apps/web/src/lib/exchange-rate.api.ts`:
  - `fetchExchangeRates()` + `useExchangeRates()` — `staleTime: 14 * 60 * 1000` (14 min)
- [ ] `apps/web/src/lib/spread.api.ts`:
  - `fetchSpreadRanking(goldType)` + `useSpreadRanking(goldType)` — `refetchInterval: 5 * 60 * 1000`
- [ ] `apps/web/src/lib/converter.api.ts`:
  - Client-side calculation only (no server round-trip needed for unit conversion math)
  - Export `calculateConversion(qty, unit, purityK, pricePerTaelVnd, rates): ConverterResultDto`

### Task 6 — ExchangeRateCard widget on OverviewPage
- [ ] Add small card below hero price showing:
  - USD/VND and EUR/VND rates
  - Source label + "Updated Xm ago" timestamp
  - Wired to `useExchangeRates()`

### Task 7 — SpreadRankingSection on MarketsPage
- [ ] Add "Spread Ranking" section to `MarketsPage.tsx`:
  - Gold-type dropdown (defaults to MIEN_SJC)
  - Horizontal SVG bar chart: Y=brand, X=spreadVnd; green→red gradient (smallest→largest)
  - Top brand gets "Most cost-efficient" badge + green highlight
  - "?" info icon with tooltip: "Spread is how much you lose if you buy and sell immediately. Smaller spread = less cost."
  - Wired to `useSpreadRanking(goldType)`

### Task 8 — /tools/converter Page
- [ ] Create `apps/web/src/app/tools/converter/page.tsx`:
  - Weight unit selector: 6 options (Tael/Chỉ/Phân/Troy oz/Gram/Kg)
  - Quantity input: numeric, updates all conversions in real time
  - Purity selector: 24K / 22K / 18K / 14K chips
  - Brand selector: SJC / DOJI (for price reference)
  - Results table: 3 rows (VND / USD / EUR), values update as user types
  - "Copy result" button per row — copies text like "2 Tael 22K = 148,500,000 VND (SJC at 09:15)"
  - Toast confirmation on copy
  - Link this page from the sidebar nav (add "tools" section or extend existing nav)

### Task 9 — Acceptance Checks
- [ ] `GET /exchange-rate/rates` returns valid rates and `updatedAt` within 15 min
- [ ] `GET /converter/calculate?unit=TAEL&qty=1&purity=24K&brand=SJC&goldType=MIEN_SJC` returns correct VND value
- [ ] `GET /spread/ranking?goldType=MIEN_SJC` returns brands sorted by spreadVnd ascending; top brand `isMostEfficient: true`
- [ ] Converter page: typing 2 in quantity field immediately updates all 6 unit displays and all 3 currency values
- [ ] Spread bar chart renders and "Most cost-efficient" badge appears on smallest-spread brand
- [ ] `pnpm --filter web build` succeeds with zero TS errors
