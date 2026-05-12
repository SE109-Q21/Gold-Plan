# GPLS Plan 7 — R2 User Features: Portfolio Tracker + Personalized Dashboard + Browsing History

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement F02 (Gold Portfolio Tracker), F09 (Personalized Dashboard), and F10 (Browsing History & Smart Suggestions) — three R2 features that together transform GPLS from a lookup tool into a personal gold management platform.

**Architecture:**
- `PortfolioModule`: transaction CRUD, P&L calculation using live prices, portfolio value chart, allocation breakdown.
- `PersonalisationModule`: fire-and-forget view event logging; reorders price table for authenticated users; pin management.
- `BrowsingHistoryModule`: logs price row views; serves inline context (last viewed + delta %); personal lowest price tracker.
- All three require Registered User auth (Plan 5).

**Tech Stack:** NestJS 11 · Prisma 7 · TanStack Query v5 · Next.js 15 · Recharts 2 · TypeScript 5

**Depends on:** Plan 5 (auth), Plan 2 (PriceRecord, live prices), Plan 3 (exchange rates for USD display)

**SRS Coverage:** F02 (FR-F02.1–F02.6), F09 (FR-F09.1–F09.6, NFR-F09.1–F09.3), F10 (FR-F10.1–F10.5, NFR-F10.1–F10.2)

---

## File Map

```
apps/api/src/
├── portfolio/
│   ├── portfolio.module.ts              NEW
│   ├── portfolio.service.ts             NEW  CRUD + P&L calc + chart data
│   ├── portfolio.controller.ts          NEW  /portfolio (authenticated)
│   └── portfolio.service.spec.ts        NEW
├── personalisation/
│   ├── personalisation.module.ts        NEW
│   ├── personalisation.service.ts       NEW  recordView, getOrder, updatePins
│   ├── personalisation.controller.ts    NEW  /personalisation
│   └── personalisation.service.spec.ts  NEW
├── browsing-history/
│   ├── browsing-history.module.ts       NEW
│   ├── browsing-history.service.ts      NEW  recordView, getContext, getHistory, getLowestSeen
│   ├── browsing-history.controller.ts   NEW  /browsing-history
│   └── browsing-history.service.spec.ts NEW

apps/api/prisma/
└── schema.prisma                        MODIFY  PortfolioTransaction, ViewPreference, ViewPin, BrowsingEvent

packages/shared/src/types/
└── gold.types.ts                        MODIFY  add PortfolioDto types, PersonalisationDto, BrowsingHistoryDto

apps/web/src/
├── lib/
│   ├── portfolio.api.ts                 NEW
│   ├── personalisation.api.ts           NEW
│   └── browsing-history.api.ts          NEW
├── components/dashboard/
│   └── OverviewPage.tsx                 MODIFY  reorder price table for logged-in users; inline history context
└── app/portfolio/
    └── page.tsx                         NEW  /portfolio full page
```

---

## Tasks

### Task 1 — Prisma: Portfolio + Personalisation + History Models
- [ ] `PortfolioTransaction`:
  ```prisma
  model PortfolioTransaction {
    id        String          @id @default(cuid())
    userId    String
    type      TransactionType // BUY | SELL
    brand     GoldBrand
    goldType  GoldType
    quantity  Float           // in tael
    priceVnd  BigInt          // price per tael at transaction time
    date      DateTime
    note      String?
    createdAt DateTime        @default(now())
    user      User            @relation(fields: [userId], references: [id], onDelete: Cascade)
    @@index([userId])
  }
  enum TransactionType { BUY SELL }
  ```
- [ ] `ViewPreference` (frequency tracking for personalisation):
  ```prisma
  model ViewPreference {
    id        String    @id @default(cuid())
    userId    String
    brand     GoldBrand
    goldType  GoldType
    viewCount Int       @default(0)
    lastViewedAt DateTime @updatedAt
    user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
    @@unique([userId, brand, goldType])
  }
  ```
- [ ] `ViewPin`:
  ```prisma
  model ViewPin {
    id       String    @id @default(cuid())
    userId   String
    brand    GoldBrand
    goldType GoldType
    position Int       // 1-5
    user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
    @@unique([userId, brand, goldType])
    @@index([userId])
  }
  ```
- [ ] `BrowsingEvent`:
  ```prisma
  model BrowsingEvent {
    id         String    @id @default(cuid())
    userId     String
    brand      GoldBrand
    goldType   GoldType
    priceVnd   BigInt    // buyPrice at view time
    viewedAt   DateTime  @default(now())
    user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
    @@index([userId, viewedAt(sort: Desc)])
  }
  ```
- [ ] Migration: `pnpm --filter api prisma migrate dev --name add-r2-user-features`

### Task 2 — PortfolioService
- [ ] `addTransaction(userId, dto)`: validate qty > 0, date ≤ today; save
- [ ] `editTransaction(userId, txId, dto)`: ownership check; update
- [ ] `deleteTransaction(userId, txId)`: ownership check; delete
- [ ] `getPortfolio(userId)`:
  - Load all BUY/SELL transactions; net quantity and weighted average cost per (brand, goldType)
  - Fetch live prices for each holding via `PriceService.getCurrentPrices()`
  - Per holding: `currentValueVnd = netQty × currentBuyPrice`, `costBasisVnd = netQty × avgCostPrice`, `pnlVnd`, `pnlPct`
  - Total portfolio: sum of all holdings
- [ ] `getValueChart(userId)`: daily portfolio value from first transaction date to today (one value per day = positions × that day's closing price)
- [ ] `getAllocationBreakdown(userId)`: % by brand and % by goldType
- [ ] NFR-F02.1: portfolio data filtered by userId; Admin has no access to transaction content

### Task 3 — PortfolioController
- [ ] All routes `@UseGuards(JwtAuthGuard)`
- [ ] `GET /portfolio` → portfolio summary + holdings
- [ ] `GET /portfolio/chart` → daily value data points
- [ ] `GET /portfolio/allocation` → allocation breakdown
- [ ] `POST /portfolio/transactions`
- [ ] `PATCH /portfolio/transactions/:id`
- [ ] `DELETE /portfolio/transactions/:id`
- [ ] `GET /portfolio/transactions` → paginated transaction list

### Task 4 — PersonalisationService
- [ ] `recordView(userId, brand, goldType)`:
  - Fire-and-forget (don't `await` — fire as Promise, catch error silently)
  - `ViewPreference.upsert`: increment `viewCount` by 1; update `lastViewedAt`
  - NFR-F09.1: must not add > 50 ms to API response — use `setImmediate()` pattern
- [ ] `getTableOrder(userId)`:
  - Get top 3 by `viewCount` (min 3 sessions must have occurred — tracked via UserSession count or simple login count)
  - Get all pins ordered by `position`
  - Return ordered list: pins first, then top viewed, then rest in default order
- [ ] `addPin(userId, brand, goldType, position)`: validate ≤ 5 pins per user
- [ ] `removePin(userId, brand, goldType)`
- [ ] `reorderPins(userId, orderedPairs)`: update positions
- [ ] `resetPreferences(userId)`: delete all `ViewPreference` + `ViewPin` for user

### Task 5 — PersonalisationController
- [ ] `GET /personalisation/order` → ordered list for price table
- [ ] `POST /personalisation/view` (fire-and-forget, always returns 202)
- [ ] `GET /personalisation/pins`
- [ ] `POST /personalisation/pins`
- [ ] `DELETE /personalisation/pins/:brand/:goldType`
- [ ] `PATCH /personalisation/pins/reorder`
- [ ] `DELETE /personalisation/reset`

### Task 6 — BrowsingHistoryService
- [ ] `recordView(userId, brand, goldType, priceVnd)`:
  - Insert `BrowsingEvent`; enforce max 500 per user (delete oldest if exceeded)
- [ ] `getInlineContext(userId, brand, goldType, currentPriceVnd)`:
  - Last event for this pair: `lastViewedAt`, `lastPriceVnd`, `deltaPct = (current - last) / last * 100`
  - Returns `null` if user has never viewed this pair
- [ ] `getHistory(userId, page, brand?, goldType?)`: paginated 20/page, newest first
- [ ] `getLowestSeen(userId, brand, goldType)`: `MIN(priceVnd)` from all events for that pair; compare to `currentPriceVnd` → `isNewPersonalLow: boolean`
- [ ] `clearHistory(userId)`: delete all `BrowsingEvent` for user
- [ ] NFR-F10.2: history page ≤ 800 ms — index on `(userId, viewedAt DESC)` in schema

### Task 7 — BrowsingHistoryController
- [ ] `POST /browsing-history/record` body `{ brand, goldType, priceVnd }` → 202 (fire and forget)
- [ ] `GET /browsing-history/context?brand=SJC&goldType=MIEN_SJC&currentPrice=79000000`
- [ ] `GET /browsing-history?page=1&brand=SJC&goldType=MIEN_SJC`
- [ ] `DELETE /browsing-history` → clear all

### Task 8 — Shared Types
- [ ] Add to `packages/shared/src/types/gold.types.ts`:
  - `PortfolioHoldingDto`, `PortfolioSummaryDto`, `PortfolioTransactionDto`, `PortfolioChartPointDto`
  - `PersonalisationOrderDto`, `ViewPinDto`
  - `BrowsingEventDto`, `BrowsingContextDto`

### Task 9 — Frontend: Portfolio Page
- [ ] `apps/web/src/app/portfolio/page.tsx`:
  - "Add Transaction" button → modal with type (Buy/Sell), brand, goldType, quantity, price, date, note
  - Portfolio summary cards: Total Value / Total Cost / P&L / P&L %
  - Holdings table: each row = brand+type, qty, avg cost, current price, current value, P&L (green/red)
  - P&L line chart (Recharts): portfolio value over time; hover tooltip
  - Allocation pie chart (Recharts): by brand + by goldType tabs
  - Transaction history table with edit/delete
- [ ] Add "Portfolio" nav item to `DashboardShell.tsx` sidebar (only shown when authenticated)

### Task 10 — Frontend: Personalised PriceTable & Browsing Context
- [ ] In `OverviewPage.tsx`:
  - On mount (if authenticated): `POST /personalisation/view` for each viewed pair (fire-and-forget)
  - Fetch `/personalisation/order` → reorder price table rows accordingly
  - Show "Personalised for you" badge when reordering is active
  - Per price row: fetch `/browsing-history/context` and show sub-text "Last viewed Xd ago at Y VND (±Z%)" if available
  - Pin icon on each row (authenticated only): calls `POST /personalisation/pins`; pinned rows show pin indicator
- [ ] `/profile/history` page: full browsing history with filter + lowest-ever-seen column (green highlight if new personal low)
- [ ] Profile/Account page: add "Clear browsing history" and "Reset personalisation" actions

### Task 11 — Privacy: Data Cleanup Cron
- [ ] `@Cron('0 3 * * *')` (daily at 3am) in `PersonalisationService`:
  - Delete `BrowsingEvent` older than 90 days (NFR-F09.3)
- [ ] Soft-deleted users (`deletedAt != null` and `deletedAt` > 30 days ago): delete all personal data (NFR-F10.1)

### Task 12 — Acceptance Checks
- [ ] Add BUY transaction → holding appears; P&L = 0 (cost = current price initially)
- [ ] After price update cycle: P&L reflects new live price
- [ ] Delete transaction → holding disappears from portfolio
- [ ] View SJC price 5 times → table reorders SJC to top on next load; "Personalised" badge appears
- [ ] Pin DOJI → always appears first regardless of view frequency
- [ ] 6th pin attempt → 400
- [ ] Reset preferences → default order restored
- [ ] Browsing history shows "Last viewed 2d ago at X" sub-text for previously viewed pairs
- [ ] "Clear history" → sub-text disappears immediately
- [ ] Portfolio page loads; chart renders; allocation pie shows percentages
- [ ] `pnpm --filter web build` zero TS errors
