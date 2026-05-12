# GPLS Plan 9 — R3 Community: Forecast + Extended Charts + CSV Export

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement F07 (Community Price Forecast + Leaderboard), M03 extended charts (3M/1Y ranges + CSV export), and M04 complete brand coverage (PNJ + BTMC crawlers). These are all R3 — final release milestone.

**Architecture:**
- `ForecastModule`: daily voting sessions managed by cron; scoring the next morning; leaderboard aggregation.
- Extended price history: backend supports `3M` and `1Y` ranges by extending existing `PriceService.getHistory()`; frontend adds range options.
- CSV export: `GET /prices/history/export` streams CSV; requires auth.
- New crawlers: `PnjCrawlerService`, `BtmcCrawlerService` following existing `BaseCrawlerService` pattern.

**Tech Stack:** NestJS 11 · Prisma 7 · `@nestjs/schedule` · `papaparse` (CSV) · Next.js 15 · TypeScript 5

**Depends on:** Plan 2 (BaseCrawlerService, PriceService), Plan 5 (auth for voting + CSV export), Plan 6 (admin)

**SRS Coverage:** F07 (FR-F07.1–F07.5, NFR-F07.1), M03 extended (FR-03.3, FR-03.7), M04 full brands (FR-01.8), F07 Leaderboard

---

## File Map

```
apps/api/src/
├── crawler/
│   ├── pnj-crawler.service.ts           NEW  HTML scraper for PNJ
│   ├── pnj-crawler.service.spec.ts      NEW
│   ├── btmc-crawler.service.ts          NEW  HTML scraper for Bảo Tín Minh Châu
│   ├── btmc-crawler.service.spec.ts     NEW
│   └── crawler.module.ts                MODIFY  register PNJ + BTMC, seed DataSources
├── price/
│   ├── price.service.ts                 MODIFY  add '3M' | '1Y' to range; add exportCsv()
│   └── price.controller.ts              MODIFY  add GET /prices/history/export
├── forecast/
│   ├── forecast.module.ts               NEW
│   ├── forecast.service.ts              NEW  vote, getSession, score, leaderboard
│   ├── forecast.controller.ts           NEW  /forecast
│   └── forecast.service.spec.ts         NEW

apps/api/prisma/
└── schema.prisma                        MODIFY  ForecastSession, ForecastVote, UserScore models

packages/shared/src/types/
└── gold.types.ts                        MODIFY  add ForecastDto types

apps/web/src/
├── components/dashboard/
│   ├── MarketsPage.tsx                  MODIFY  add 3M/1Y chart range options
│   └── OverviewPage.tsx                 MODIFY  add ForecastVoteWidget (if authenticated)
└── app/
    ├── leaderboard/page.tsx             NEW  /leaderboard
    └── profile/history/page.tsx         MODIFY  add "Export CSV" button
```

---

## Tasks

### Task 1 — PNJ + BTMC Crawlers
- [ ] `pnj-crawler.service.ts`:
  - Extends `BaseCrawlerService` with `brand = GoldBrand.PNJ`
  - Scrape PNJ website HTML (inspect target URL structure) for buy/sell prices by gold type
  - Parse and call `this.saveRecords([...])` (same pattern as SJC/DOJI crawlers)
  - Unit tests: mock HTML fixture → assert parsed records
- [ ] `btmc-crawler.service.ts`:
  - Same pattern for `GoldBrand.BTMC` (Bảo Tín Minh Châu)
- [ ] Register both in `crawler.module.ts`; seed their `DataSource` records on module init
- [ ] Both crawlers should be visible in Admin dashboard data sources list (Plan 6)

### Task 2 — Extended Price History (3M + 1Y)
- [ ] Extend `HistoryQueryDto`: add `'3M' | '1Y'` to `@IsIn(['1D', '1W', '1M', '3M', '1Y'])`
- [ ] `PriceService.getHistory()`:
  - `3M`: `gte = subMonths(now, 3)`; `take: 5000`
  - `1Y`: `gte = subYears(now, 1)`; `take: 10000`
  - For longer ranges, thin data to at most one record per hour (using `recordedAt` bucketing) to keep response size reasonable
- [ ] Frontend `PriceHistoryChart.tsx`: add `3M` and `1Y` options to range selector

### Task 3 — CSV Export
- [ ] `PriceService.getHistoryCsv(brand, goldType, range, userId)`: returns CSV string using `papaparse.unparse()`
  - Columns: `timestamp,buyPrice,sellPrice,brand,goldType`
  - Requires authenticated user (FR-03.7)
- [ ] `price.controller.ts`: `GET /prices/history/export?brand=SJC&goldType=MIEN_SJC&range=1M`
  - `@UseGuards(JwtAuthGuard)`
  - Set `Content-Type: text/csv` + `Content-Disposition: attachment; filename="gold-history-SJC-1M.csv"`
- [ ] Frontend: "Export CSV" button on `PriceHistoryChart` component (only shown when authenticated); trigger download via `<a href=...>` with blob URL

### Task 4 — Prisma: Forecast Models
- [ ] `ForecastSession`:
  ```prisma
  model ForecastSession {
    id          String          @id @default(cuid())
    date        DateTime        @unique  // the trading day being forecast
    opensAt     DateTime        // 17:00 day before
    closesAt    DateTime        // 07:00 on date
    scoredAt    DateTime?
    isClosed    Boolean         @default(false)
    actualResult ForecastDir?   // scored next morning
    votes       ForecastVote[]
    @@index([date(sort: Desc)])
  }
  enum ForecastDir { UP DOWN FLAT }
  ```
- [ ] `ForecastVote`:
  ```prisma
  model ForecastVote {
    id        String       @id @default(cuid())
    sessionId String
    userId    String
    direction ForecastDir
    votedAt   DateTime     @default(now())
    updatedAt DateTime     @updatedAt
    session   ForecastSession @relation(fields: [sessionId], references: [id])
    user      User            @relation(fields: [userId], references: [id], onDelete: Cascade)
    @@unique([sessionId, userId])
  }
  ```
- [ ] `UserScore`:
  ```prisma
  model UserScore {
    id            String   @id @default(cuid())
    userId        String   @unique
    totalPoints   Int      @default(0)
    currentStreak Int      @default(0)
    month         String   // "2026-06"
    monthlyPoints Int      @default(0)
    user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  }
  ```
- [ ] Migration: `pnpm --filter api prisma migrate dev --name add-r3-forecast`

### Task 5 — ForecastService
- [ ] Session management crons:
  - `@Cron('0 17 * * 1-5')`: create next-day `ForecastSession` with `opensAt=now`, `closesAt=next_day_07:00`
  - `@Cron('0 7 * * 1-5')`: close today's session → set `isClosed=true` (NFR-F07.1: DB constraint prevents further votes)
  - `@Cron('0 9 * * 1-5')`: score yesterday's session → compare today's opening SJC price vs yesterday's close → set `actualResult`; award points
- [ ] `vote(userId, sessionId, direction)`:
  - Session must be open (`!isClosed`); upsert vote (FR-F07.2)
  - Returns session after voting (with ratio visible)
- [ ] `getActiveSession()`: current open session with vote counts (direction revealed only after user has voted)
- [ ] `scoreSession(sessionId)`:
  - Determine `actualResult` from SJC price change
  - For each correct vote: `UserScore.totalPoints += 10`, `monthlyPoints += 10`, `currentStreak++`
  - For incorrect: `currentStreak = 0`
- [ ] `getLeaderboard(month)`: top 20 users by `monthlyPoints` for that month; includes `displayName`, `points`, `currentStreak`
- [ ] `getUserPredictionHistory(userId, page)`: all of user's past votes with `actualResult` and points earned

### Task 6 — ForecastController
- [ ] `GET /forecast/session` → current session (vote ratio hidden until user votes or after 12:00 for guests)
- [ ] `POST /forecast/vote` body `{ sessionId, direction }` → requires auth
- [ ] `GET /forecast/leaderboard?month=2026-06`
- [ ] `GET /forecast/history` → user's vote history (requires auth)

### Task 7 — Frontend: ForecastVoteWidget
- [ ] `apps/web/src/components/ForecastVoteWidget.tsx`:
  - Shows for authenticated users when a session is open
  - 3 buttons: ▲ Up / → Flat / ▼ Down (styled with gold/grey)
  - After voting: shows ratio bars (% Up / Down / Flat) with smooth animation
  - Before voting: ratio hidden
  - Points history: small "you've earned X pts this month" stat
- [ ] Add to `OverviewPage.tsx` below the hero price card

### Task 8 — /leaderboard Page
- [ ] `apps/web/src/app/leaderboard/page.tsx`:
  - Month selector (defaults to current month)
  - Top 20 table: rank, display name (anonymised if user hasn't set one), points, streak
  - User's own rank highlighted if they're in the list
  - Paginates to show all months' archives

### Task 9 — Frontend: Extended Charts + CSV Button
- [ ] `MarketsPage.tsx` + `PriceHistoryChart.tsx`:
  - Add `3M` and `1Y` tabs to range selector
  - For 1Y range: thin rendering (don't render 10,000 SVG points — sample to 365 max for chart)
- [ ] Export CSV button (authenticated only): `<a>` tag downloads directly

### Task 10 — Acceptance Checks
- [ ] PNJ crawler fetches data and stores PriceRecord rows with `brand=PNJ`; visible in ComparisonTable
- [ ] BTMC crawler same for `brand=BTMC`
- [ ] `GET /prices/history?range=3M` returns data spanning 3 months
- [ ] `GET /prices/history/export` without auth → 401; with auth → downloads valid CSV
- [ ] Forecast session opens at 17:00; closes at 07:00 next day; votes blocked after close
- [ ] Vote → ratio becomes visible; vote again before close → updates (not duplicates)
- [ ] Score cron runs at 09:00; correct predictions award 10 points
- [ ] Leaderboard shows top 20 for current month ordered by points
- [ ] `pnpm --filter web build` zero TS errors
