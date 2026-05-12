# GPLS Plan 4 — Analytics Widgets: Market Heat Index & DCA Simulator

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement F03 (Market Heat Index gauge widget) and F06 (DCA Simulator tool page) — both R1, no auth, purely computed from existing internal price data.

**Architecture:**
- `HeatIndexModule` (NestJS): computes a 0–100 score from existing `PriceRecord` data after each crawl. Stores result in a dedicated `HeatIndex` table (hourly snapshots for future 7-day chart). Exposes `GET /heat-index/current`.
- `DcaModule` (NestJS): stateless calculation from `PriceRecord` history. Exposes `GET /dca/simulate?brand=SJC&goldType=MIEN_SJC&startDate=2024-01-01&frequency=weekly&qtyPerPurchase=0.5`.
- Frontend: gauge widget on OverviewPage, `/tools/dca-simulator` page.

**Tech Stack:** NestJS 11 · Prisma 7 · TanStack Query v5 · Next.js 15 · TypeScript 5

**Depends on:** Plan 2 (PriceRecord data), Plan 3 (ExchangeRateService for DCA VND values)

**SRS Coverage:** F03 (FR-F03.1–FR-F03.5), F06 (FR-F06.1–FR-F06.5), NFR-F03.1, NFR-F06.1

---

## File Map

```
apps/api/src/
├── heat-index/
│   ├── heat-index.module.ts             NEW
│   ├── heat-index.service.ts            NEW  compute() + getCurrent() + store snapshot
│   ├── heat-index.controller.ts         NEW  GET /heat-index/current
│   └── heat-index.service.spec.ts       NEW
├── dca/
│   ├── dca.module.ts                    NEW
│   ├── dca.service.ts                   NEW  simulate(params): DcaResultDto
│   ├── dca.controller.ts                NEW  GET /dca/simulate
│   └── dca.service.spec.ts              NEW

apps/api/prisma/
└── schema.prisma                        MODIFY  add HeatIndexSnapshot model

packages/shared/src/types/
└── gold.types.ts                        MODIFY  add HeatIndexDto, DcaResultDto, DcaDataPointDto

apps/web/src/
├── lib/
│   ├── heat-index.api.ts                NEW  useHeatIndex() hook
│   └── dca.api.ts                       NEW  useDcaSimulate() hook
├── components/dashboard/
│   └── OverviewPage.tsx                 MODIFY  replace mock gauge with live HeatIndex widget
└── app/tools/dca-simulator/
    └── page.tsx                         NEW  /tools/dca-simulator full page
```

---

## Tasks

### Task 1 — Prisma: HeatIndexSnapshot model
- [ ] Add to `schema.prisma`:
  ```prisma
  model HeatIndexSnapshot {
    id           String   @id @default(cuid())
    score        Int      // 0-100
    velocityPct  Float    // component 1 (40%)
    spreadVnd    Float    // component 2 (30%)
    crossings    Int      // component 3 (30%)
    label        String   // "Cold" | "Warm" | "Hot"
    computedAt   DateTime @default(now())

    @@index([computedAt])
  }
  ```
- [ ] Run `pnpm --filter api prisma migrate dev --name add-heat-index-snapshot`

### Task 2 — HeatIndexService
- [ ] `heat-index.service.ts` — `compute()` method:
  - **Price Velocity (40%):** Take the last 10 SJC MIEN_SJC buy-price readings today; compute average absolute % change per step. Normalise to 0–40 scale (cap at 2% average change = 40 pts).
  - **Spread Size (30%):** Current SJC buy-sell spread. Normalise to 0–30 (0 pts = spread ≤ 200,000 VND; 30 pts = spread ≥ 500,000 VND, inverted — large spread = hotter).
  - **Threshold Crossings (30%):** Count how many times SJC price crossed a round-number boundary (every 500,000 VND increment) in the last 24h. Normalise to 0–30 (cap at 10 crossings = 30 pts).
  - Total score = velocity + spread + crossings (0–100).
  - `label`: 0–33 = "Cold", 34–66 = "Warm", 67–100 = "Hot"
  - `store()`: saves snapshot to `HeatIndexSnapshot` (runs after compute).
  - `getCurrent(): Promise<HeatIndexDto>`: returns latest snapshot from DB, or recomputes if no snapshot in last 10 min.
- [ ] Hook `compute()` into `CrawlSchedulerService.afterCrawl()` event (or a `@Cron('*/5 * * * *')` in HeatIndexService)
- [ ] Unit tests: mock PriceRecord data → assert score calculation formula for each component; assert label boundaries (33/34/66/67)

### Task 3 — HeatIndexController
- [ ] `GET /heat-index/current` → `HeatIndexDto`
- [ ] Response must complete in ≤ 100 ms (NFR-F03.1) — always served from DB snapshot, never blocking compute

### Task 4 — DcaService
- [ ] `dca.service.ts` — `simulate(params): DcaResultDto`:
  - Query `PriceRecord` for `brand + goldType` between `startDate` and today, ordered by `recordedAt`
  - Select purchase points based on `frequency`: weekly = every 7 days, monthly = every 30 days
  - For each purchase point: buy `qtyPerPurchase` tael at that day's `buyPrice`
  - Calculate:
    - `averageCostVnd`: total spent / total tael bought
    - `totalGoldTael`: sum of all purchases
    - `totalSpentVnd`: sum of all (qty × price)
    - `currentValueVnd`: `totalGoldTael × latestBuyPrice`
    - `dcaPnlVnd` + `dcaPnlPct`: vs average cost
    - `lumpSumCostVnd`: if user had bought all on startDate instead
    - `lumpSumCurrentValueVnd` + `lumpSumPnlPct`
  - `dataPoints: DcaDataPointDto[]`: each purchase with `{ date, price, cumulativeValue, lumpSumValue }`
- [ ] Validate: startDate ≤ today, qty > 0, period has enough data (min 2 data points)
- [ ] NFR-F06.1: calculation for 2 years × weekly (≈104 points) completes in ≤ 1 second
- [ ] Unit tests: 3-point fixture → assert all 5 metrics; assert lump-sum vs DCA comparison

### Task 5 — DcaController
- [ ] `GET /dca/simulate?brand=SJC&goldType=MIEN_SJC&startDate=2024-01-01&frequency=weekly&qtyPerPurchase=0.5`
- [ ] Validate query params with DTO (`@IsEnum(GoldBrand)`, `@IsEnum(GoldType)`, `@IsDateString()`, `@IsIn(['weekly','monthly'])`, `@IsPositive()`)

### Task 6 — Shared Types
- [ ] Add to `packages/shared/src/types/gold.types.ts`:
  ```typescript
  export interface HeatIndexDto {
    score: number;        // 0-100
    label: 'Cold' | 'Warm' | 'Hot';
    velocityPct: number;
    spreadVnd: number;
    crossings: number;
    computedAt: string;
  }
  export interface DcaDataPointDto {
    date: string;
    price: number;
    cumulativeGold: number;
    cumulativeSpent: number;
    cumulativeValue: number;
    lumpSumValue: number;
  }
  export interface DcaResultDto {
    averageCostVnd: number;
    totalGoldTael: number;
    totalSpentVnd: number;
    currentValueVnd: number;
    dcaPnlVnd: number;
    dcaPnlPct: number;
    lumpSumCostVnd: number;
    lumpSumCurrentValueVnd: number;
    lumpSumPnlPct: number;
    dataPoints: DcaDataPointDto[];
  }
  ```

### Task 7 — Frontend API Hooks
- [ ] `apps/web/src/lib/heat-index.api.ts`:
  - `fetchHeatIndex()` + `useHeatIndex()` — `refetchInterval: 5 * 60 * 1000`
- [ ] `apps/web/src/lib/dca.api.ts`:
  - `fetchDcaSimulate(params)` + `useDcaSimulate(params)` — `enabled: !!params.startDate`, `staleTime: 60_000`

### Task 8 — HeatIndex Gauge widget on OverviewPage
- [ ] Replace the hardcoded mock gauge in `OverviewPage.tsx` with a live component:
  - SVG arc gauge (180° half-circle); needle points to `score`
  - 3 colour zones: 0–33 = `#60A5FA` (blue/Cold), 34–66 = `#FBBF24` (yellow/Warm), 67–100 = `#EF4444` (red/Hot)
  - Label below: score + "Cold / Warm / Hot" text
  - Hover tooltip: breakdown of 3 components (velocity X%, spread Y VND, N crossings today)
  - Shows skeleton while loading

### Task 9 — /tools/dca-simulator Page
- [ ] `apps/web/src/app/tools/dca-simulator/page.tsx`:
  - Brand dropdown (SJC / DOJI)
  - Gold type dropdown
  - Start date picker (max = today − 14 days to ensure at least 2 data points)
  - Frequency toggle: Weekly / Monthly
  - Quantity input (tael per purchase, step = 0.1)
  - "Simulate" button triggers query
  - Results section:
    - 5 stat cards: Avg Cost / Total Gold / Total Spent / Current Value / P&L vs Lump Sum
    - P&L shown with ▲/▼ and green/red colouring
    - Dual-line SVG chart: blue = DCA cumulative value, orange = Lump Sum value; hover tooltip at each data point showing date + both values
  - No login required (FR-F06.1)

### Task 10 — Nav Link for Tools
- [ ] Add "tools" section to `DashboardShell.tsx` sidebar with links to `/tools/converter` and `/tools/dca-simulator`
  - Or extend the existing nav to include a "Tools" tab that navigates to a tools landing page

### Task 11 — Acceptance Checks
- [ ] `GET /heat-index/current` responds in ≤ 100 ms with valid score 0–100 and correct label
- [ ] Score components add up to total
- [ ] `GET /dca/simulate` for 1 year weekly returns in ≤ 1 second, all 5 metrics present
- [ ] Gauge widget shows correct colour zone and tooltip breakdown
- [ ] DCA page: changing qty reruns simulation; dual-line chart renders with hover tooltips
- [ ] `pnpm --filter web build` succeeds with zero TS errors
