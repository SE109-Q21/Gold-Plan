# GPLS Plan 6 — Price Alerts & Admin Dashboard (M07 + M08)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement M07 (price alert CRUD + background evaluator + email notifications) and M08 (admin dashboard — data source management, user management, anomaly review, system stats). Both require the auth system from Plan 5.

**Architecture:**
- `AlertModule`: CRUD for `PriceAlert` records; `AlertEvaluatorService` runs as a NestJS cron after each crawl cycle, checks all active alerts against latest prices, fires emails and deactivates.
- `AdminModule`: protected by `@Roles('admin')` guard; exposes management endpoints for DataSources, Users, anomaly records, system stats.
- Frontend: Alerts page wired to real API; dedicated `/admin` route group (separate from main dashboard).

**Tech Stack:** NestJS 11 · Prisma 7 · `@nestjs/schedule` · Nodemailer (via MailModule) · TanStack Query v5 · Next.js 15 · TypeScript 5

**Depends on:** Plan 5 (auth, JwtAuthGuard, RolesGuard, MailService), Plan 2 (PriceRecord, CrawlSession)

**SRS Coverage:** M07 (FR-07.1–FR-07.9), M08 (FR-08.1–FR-08.10), NFR-P05

---

## File Map

```
apps/api/src/
├── alerts/
│   ├── alerts.module.ts                 NEW
│   ├── alerts.service.ts                NEW  CRUD + evaluate()
│   ├── alert-evaluator.service.ts       NEW  @Cron — runs after each crawl
│   ├── alerts.controller.ts             NEW  /alerts (authenticated)
│   ├── alerts.service.spec.ts           NEW
│   ├── alert-evaluator.service.spec.ts  NEW
│   └── dto/
│       ├── create-alert.dto.ts          NEW
│       └── update-alert.dto.ts          NEW
├── admin/
│   ├── admin.module.ts                  NEW
│   ├── admin.service.ts                 NEW  stats, user management, anomaly review
│   ├── admin.controller.ts              NEW  /admin/* (admin role only)
│   └── admin.service.spec.ts            NEW

apps/api/prisma/
└── schema.prisma                        MODIFY  PriceAlert, AlertHistory models; AnomalyFlag on PriceRecord

packages/shared/src/types/
└── gold.types.ts                        MODIFY  add PriceAlertDto, AlertHistoryDto, AdminStatsDto

apps/web/src/
├── lib/
│   ├── alerts.api.ts                    NEW  useAlerts, useCreateAlert, useToggleAlert, useDeleteAlert
│   └── admin.api.ts                     NEW  useAdminStats, useDataSources, useUsers hooks
├── components/dashboard/
│   └── AlertsPage.tsx                   MODIFY  wire to real API
└── app/admin/
    ├── layout.tsx                       NEW  admin shell (sidebar links to sub-pages)
    ├── page.tsx                         NEW  /admin → stats overview
    ├── data-sources/page.tsx            NEW
    ├── users/page.tsx                   NEW
    └── anomalies/page.tsx               NEW
```

---

## Tasks

### Task 1 — Prisma: Alert & Admin Models
- [ ] Add `PriceAlert` and `AlertHistory`:
  ```prisma
  model PriceAlert {
    id              String      @id @default(cuid())
    userId          String
    brand           GoldBrand
    goldType        GoldType
    condition       AlertCondition  // GTE | LTE
    thresholdVnd    BigInt
    repeatMode      Boolean     @default(false)
    status          AlertStatus @default(ACTIVE)  // ACTIVE | TRIGGERED | PAUSED
    lastFiredAt     DateTime?
    createdAt       DateTime    @default(now())
    user            User        @relation(fields: [userId], references: [id], onDelete: Cascade)
    history         AlertHistory[]
    @@index([userId])
    @@index([status])
  }
  enum AlertCondition { GTE LTE }
  enum AlertStatus    { ACTIVE TRIGGERED PAUSED }

  model AlertHistory {
    id          String   @id @default(cuid())
    alertId     String
    firedAt     DateTime @default(now())
    priceVnd    BigInt
    emailStatus String   // "sent" | "failed"
    alert       PriceAlert @relation(fields: [alertId], references: [id], onDelete: Cascade)
    @@index([alertId])
  }
  ```
- [ ] Add `anomalyFlag Boolean @default(false)` + `anomalyNote String?` to `PriceRecord`
- [ ] Add `AnomalyReview` model:
  ```prisma
  model AnomalyReview {
    id            String   @id @default(cuid())
    priceRecordId String   @unique
    reviewedBy    String   // admin userId
    action        String   // "approved" | "rejected"
    reviewedAt    DateTime @default(now())
    priceRecord   PriceRecord @relation(fields: [priceRecordId], references: [id])
  }
  ```
- [ ] Migration: `pnpm --filter api prisma migrate dev --name add-alerts-admin`

### Task 2 — AlertsService (CRUD)
- [ ] `createAlert(userId, dto)`:
  - Validate `thresholdVnd >= 100_000` (FR-07.2)
  - Count user's ACTIVE alerts; if ≥10 → throw 400 (FR-07.7)
  - Save to DB
- [ ] `findAllForUser(userId)`: returns active alerts + last 5 history entries each
- [ ] `updateAlert(userId, alertId, dto)`: ownership check; partial update
- [ ] `toggleAlert(userId, alertId)`: flip ACTIVE ↔ PAUSED
- [ ] `deleteAlert(userId, alertId)`: hard delete; ownership check
- [ ] `getHistory(userId)`: all AlertHistory for user's alerts, paginated

### Task 3 — AlertEvaluatorService
- [ ] `@Cron('*/5 * * * *')` or hook into CrawlScheduler afterCrawl event
- [ ] `evaluate()`:
  - Load all ACTIVE alerts
  - For each alert: get latest `PriceRecord` for that `brand + goldType`
  - Check condition: GTE → `buyPrice >= threshold`, LTE → `buyPrice <= threshold`
  - If condition met:
    - Check cooldown: `alert.lastFiredAt` was < 30 min ago + `repeatMode=true` → skip (FR-07.6)
    - Send email via MailService with price details
    - Create `AlertHistory` record with emailStatus
    - If `repeatMode=false` → set `status=TRIGGERED` (FR-07.5)
    - If `repeatMode=true` → set `lastFiredAt=now()`
- [ ] NFR-P05: email must reach inbox ≤ 2 min after condition trigger — service sends immediately; delivery time is provider-dependent
- [ ] Unit tests: 3-alert fixture → assert correct alerts fire; assert cooldown logic; assert status transitions

### Task 4 — AlertsController
- [ ] All routes: `@UseGuards(JwtAuthGuard)`
- [ ] `GET /alerts` → user's alerts
- [ ] `POST /alerts` body: `{ brand, goldType, condition, thresholdVnd, repeatMode }`
- [ ] `PATCH /alerts/:id` partial update
- [ ] `PATCH /alerts/:id/toggle`
- [ ] `DELETE /alerts/:id`
- [ ] `GET /alerts/history`

### Task 5 — AdminService
- [ ] `getStats()`: `{ totalUsers, todayVisits, crawlerStatusPerSource, alertsSentToday, crawlSuccessRate }`
  - `totalUsers`: `User.count({ where: { status: { not: 'DELETED' } } })`
  - `crawlerStatusPerSource`: join `DataSource` + latest `CrawlSession` per source
  - `alertsSentToday`: `AlertHistory.count({ where: { firedAt: { gte: today } } })`
- [ ] `listDataSources()`, `createDataSource(dto)`, `updateDataSource(id, dto)`, `disableDataSource(id)`, `testConnection(url)`
- [ ] `listUsers(page, filter)`, `lockUser(id)`, `unlockUser(id)`
- [ ] `listAnomalies()`: `PriceRecord.findMany({ where: { anomalyFlag: true } })`
- [ ] `reviewAnomaly(priceRecordId, action, adminId)`: create `AnomalyReview`; if approved → set `anomalyFlag=false`; if rejected → keep flagged + hidden from price table

### Task 6 — AdminController
- [ ] All routes: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')`
- [ ] `GET /admin/stats`
- [ ] `GET/POST/PATCH/DELETE /admin/data-sources`
- [ ] `POST /admin/data-sources/:id/test`
- [ ] `GET /admin/users`, `PATCH /admin/users/:id/lock`, `PATCH /admin/users/:id/unlock`
- [ ] `GET /admin/anomalies`, `POST /admin/anomalies/:id/review`
- [ ] `GET /admin/reports?period=day|week|month`

### Task 7 — Shared Types
- [ ] Add `PriceAlertDto`, `AlertHistoryDto`, `CreateAlertDto`, `AdminStatsDto`, `DataSourceAdminDto`, `AnomalyRecordDto` to `packages/shared/src/types/`

### Task 8 — Wire AlertsPage to Real API
- [ ] `apps/web/src/lib/alerts.api.ts`: TanStack Query hooks for all alert CRUD operations
- [ ] `apps/web/src/components/dashboard/AlertsPage.tsx`:
  - Replace mock data with `useAlerts()` hook
  - Wire toggle switches to `useToggleAlert()` mutation
  - Wire delete buttons to `useDeleteAlert()` mutation (with confirm dialog)
  - Wire "Add Alert" button → `AddAlertModal` which posts `useCreateAlert()` mutation
  - Wire `AddAlertModal` form to real brand/goldType/condition/threshold fields
  - Show alert history tab: triggered alerts with timestamps

### Task 9 — Admin UI
- [ ] `apps/web/src/app/admin/layout.tsx`: separate admin shell (independent of main dashboard), links to sub-pages; visible only to `role=ADMIN`
- [ ] `/admin` stats page: 4 stat cards (users, today visits, crawler status, alerts sent), table of crawler sources with status indicators
- [ ] `/admin/data-sources`: CRUD table, "Test connection" button, enable/disable toggles
- [ ] `/admin/users`: paginated table with lock/unlock action buttons
- [ ] `/admin/anomalies`: flagged records table with Approve/Reject buttons; shows old/new price + % deviation

### Task 10 — Acceptance Checks
- [ ] Create alert → appears in list; duplicate alert past 10 limit → 400
- [ ] Alert with `thresholdVnd < 100,000` → 400 server-side
- [ ] Evaluator fires within 5 min of condition being met; `AlertHistory` record created
- [ ] Fired alert (repeatMode=false) → status = TRIGGERED; no second email
- [ ] Fired alert with cooldown < 30 min → no second email even though condition still met
- [ ] Admin can lock a user → that user gets 401 on next request
- [ ] Admin can approve anomaly → record reappears in price table
- [ ] `pnpm --filter web build` zero TS errors
