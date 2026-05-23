# Phase 1 Market Differentiators — Design Spec

**Date:** 2026-05-24  
**Project:** GoldPlan  
**Scope:** Phase 1 of 4-phase roadmap (Option D)  
**Features:** Arbitrage Detector + Gold vs Assets Comparison

---

## Context

GoldPlan is a full-stack portfolio project for the Vietnamese gold investment market. It already has: real-time WebSocket prices (4 brands), smart alerts, portfolio tracker, AI assistant, forecast community, heat index, and admin panel.

Phase 1 adds two **market differentiators** — features no existing Vietnamese gold app has:

1. **Arbitrage Detector** — real-time cross-brand profit opportunity detection
2. **Gold vs Assets Comparison** — normalized return chart vs USD/VND, bank deposits, VN-Index

---

## Feature 1: Arbitrage Detector

### What it does
For each GoldType, compares buy prices across all brands vs sell prices across all brands. If `max(sellPrice) > min(buyPrice)` for any goldType, an arbitrage opportunity exists. Shows the best route: "Buy DOJI NHAN_9999 at 78.4M → Sell at SJC for 82.8M → gross profit 4.4M/lượng."

### User-facing surfaces
- **Dashboard widget** — compact, top 2–3 opportunities, live badge, link to detail page. Updates via WebSocket `price:updated` event (already implemented).
- **`/tools/arbitrage` page** — full N×M matrix (buy-at vs sell-at), filter by GoldType, quantity calculator, detail panel for best opportunity, history chart of spread over 24h.

### Backend

**New endpoint:** `GET /api/prices/arbitrage`

Response:
```typescript
ArbitrageOpportunityDto[] = {
  goldType: GoldType;
  buyBrand: GoldBrand;
  buyPrice: number;        // latest non-anomalous buy price
  sellBrand: GoldBrand;
  sellPrice: number;       // latest non-anomalous sell price
  grossProfit: number;     // sellPrice - buyPrice
  profitPercent: number;   // grossProfit / buyPrice * 100
  updatedAt: string;       // ISO timestamp of the newer of the two records
}
```

**Logic (ArbitrageService):**
1. Fetch latest non-anomalous PriceRecord per (brand, goldType) — single query with `DISTINCT ON` or groupBy.
2. For each goldType, find `minBuy` and `maxSell` across all brands.
3. Return opportunity only if `maxSell.sellPrice > minBuy.buyPrice`.
4. Sort by `profitPercent` descending.

**History (ArbitrageSnapshot model):**
Saved every crawl cycle (after CrawlScheduler emits `price.updated`) — stores the top opportunity per goldType. Used by `/tools/arbitrage` history chart.

```prisma
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

**Module:** `ArbitrageModule` with `ArbitrageService` + `ArbitrageController`. Snapshot saving is an `@OnEvent('price.updated')` handler in `ArbitrageService`.

### Frontend

**`/tools/arbitrage` page:**
- `useArbitrageOpportunities()` hook — `useQuery` with `staleTime: 0`, no `refetchInterval` (relies on WebSocket invalidation via `price:updated`).
- Matrix table: rows = buy brands, columns = sell brands. Cell shows profit (green if positive, red if negative, `—` for same brand).
- Quantity input: multiply profit by user-entered quantity (default 1 lượng).
- History chart: line chart of `grossProfit` over last 24h from `ArbitrageSnapshot` data. `GET /api/prices/arbitrage/history?goldType=NHAN_9999&hours=24`.

**Dashboard widget:**
- `ArbitrageWidget` component — reads from same `useArbitrageOpportunities()` hook, shows top 2 rows, link to full page.
- Added to `OverviewPage.tsx` alongside existing widgets.

### Error handling
- No live prices available → show "Đang chờ dữ liệu mới nhất..." skeleton.
- All prices from same brand → no cross-brand opportunity → show "Không có cơ hội chênh lệch hiện tại."
- Anomalous price records are excluded (already filtered by `isAnomalous: false`).

---

## Feature 2: Gold vs Assets Comparison

### What it does
Shows normalized % return for 4 investment channels over a selected time range (1M / 3M / 6M / 1Y). User can input a starting capital amount to see actual VND outcome. Helps investors understand gold performance in context.

### Channels
| Channel | Data source | Update frequency |
|---|---|---|
| Vàng SJC | `PriceRecord` table (existing) | Real-time |
| USD/VND | `ExchangeRate` table (existing) | Hourly |
| Gửi ngân hàng | `AssetBenchmark` table (admin-editable) | Manual (quarterly) |
| VN-Index | `AssetBenchmark` table (admin-editable, mock data) | Manual (weekly) |

### User-facing surfaces
- **`/tools/gold-vs-assets` page** — time range selector, 4 performance cards (% return + VND outcome for entered capital), normalized Recharts line chart, auto-generated insight text.
- **No dashboard widget** for this feature (lower priority than arbitrage for dashboard real estate).

### Backend

**New endpoint:** `GET /api/prices/assets-comparison?range=1M`

Response:
```typescript
AssetsComparisonDto = {
  range: '1M' | '3M' | '6M' | '1Y';
  baseDate: string;           // ISO date of period start
  gold: DataSeriesDto;
  usd: DataSeriesDto;
  bankDeposit: DataSeriesDto; // flat line computed from annual rate
  vnIndex: DataSeriesDto;     // from AssetBenchmark mock data
}

DataSeriesDto = {
  label: string;
  returnPercent: number;      // total return for period
  dataPoints: { date: string; value: number }[];  // normalized to 100 at baseDate
}
```

**AssetBenchmark model** (admin-editable):
```prisma
model AssetBenchmark {
  id          String   @id @default(cuid())
  assetType   String   // 'BANK_DEPOSIT' | 'VN_INDEX'
  date        DateTime @db.Date
  value       Decimal  @db.Decimal(12, 4)  // index level or annual rate %
  note        String?
  createdAt   DateTime @default(now())

  @@unique([assetType, date])
  @@index([assetType, date])
}
```

Admin panel gets a new "Benchmarks" tab: table of AssetBenchmark records, add/edit/delete rows for VN-Index daily values and bank deposit rates.

**AssetsComparisonService logic:**
1. Gold: query `PriceRecord` for SJC NHAN_9999, compute daily close prices, normalize to 100 at `baseDate`.
2. USD: query `ExchangeRate` for USD→VND, normalize similarly.
3. Bank: single annual rate from latest `AssetBenchmark` where `assetType = 'BANK_DEPOSIT'`. Compute daily compound: `100 * (1 + rate/365)^day`.
4. VN-Index: query `AssetBenchmark` where `assetType = 'VN_INDEX'`, normalize to 100 at `baseDate`.
5. Auto-insight: compare returnPercent values, generate Vietnamese string: "Vàng vượt trội X% so với kênh tốt thứ 2 trong kỳ này."

**Module:** `AssetsComparisonModule` with `AssetsComparisonService` + `AssetsComparisonController`.

### Frontend

**`/tools/gold-vs-assets` page:**
- `useAssetsComparison(range)` hook — `useQuery`, `staleTime: 5min`.
- 4 performance cards with color-coded % return (green/red) and VND outcome.
- Capital input: user types starting amount, cards recalculate reactively (no API call needed, just multiply dataPoint values).
- Recharts `LineChart` with 4 lines, custom tooltip showing all 4 values at hovered date.
- Insight banner auto-rendered from API response string.

### Error handling
- Insufficient gold history for selected range → show available range with note "Chỉ có dữ liệu từ [date]."
- No VN-Index mock data → hide VN-Index line, show notice "VN-Index chưa được cập nhật."

---

## Architecture Overview

```
CrawlScheduler → price.updated event
    │
    ├─► PriceGateway (WebSocket broadcast — existing)
    ├─► ArbitrageService.onPriceUpdated() → save ArbitrageSnapshot
    └─► SmartAlertsService.onPriceUpdated() (existing)

GET /api/prices/arbitrage         → ArbitrageService.getOpportunities()
GET /api/prices/arbitrage/history → ArbitrageService.getHistory()
GET /api/prices/assets-comparison → AssetsComparisonService.getComparison()
GET /api/admin/benchmarks         → AdminService (CRUD for AssetBenchmark)
```

No new external APIs. All data from existing DB tables + new `ArbitrageSnapshot` and `AssetBenchmark` tables.

---

## Shared Types (packages/shared)

```typescript
// Add to gold.types.ts
export interface ArbitrageOpportunityDto {
  goldType: string;
  buyBrand: string;
  buyPrice: number;
  sellBrand: string;
  sellPrice: number;
  grossProfit: number;
  profitPercent: number;
  updatedAt: string;
}

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
  vnIndex: DataSeriesDto;
  insight: string;
}
```

---

## Database Migrations

1. `add_arbitrage_snapshot` — creates `ArbitrageSnapshot` table
2. `add_asset_benchmark` — creates `AssetBenchmark` table

Both run via `prisma migrate dev` locally, `prisma migrate deploy` on Railway (already in `startCommand`).

---

## Testing

- `ArbitrageService` unit test: given mock PriceRecords for 4 brands, assert correct min/max selection and profit calculation.
- `AssetsComparisonService` unit test: given mock PriceRecords + ExchangeRates + AssetBenchmarks, assert correct normalization to base 100.
- Frontend: `useArbitrageOpportunities` hook test (Vitest) — mock apiClient.get, assert correct data shape.

---

## Out of Scope (Phase 1)

- Fee/tax deduction from arbitrage profit (Phase 4 Tax Calculator)
- Actual VN-Index API integration (Phase 2 or later)
- Mobile push notification for arbitrage opportunities (can reuse existing push infrastructure later)
- Price alerts based on arbitrage spread threshold (future smart alert condition type)
