# Backend Test Coverage Report

**Project:** Gold Price Tracking System

**Backend:** NestJS REST API

**Test Framework:** Jest (unit + integration) and Supertest (e2e)

**Author:** Nguyễn Trung Kiên

**Date:** 2026-05-24

---

## 1. Introduction

This report documents the backend test coverage for the Gold Price Tracking System. Its purpose is to summarise what parts of the NestJS backend are tested, how tests were implemented and mocked, and where gaps remain. The tests verify API correctness, validation and authentication, business logic, background jobs, crawler parsing, and edge cases that could lead to regressions.

## 2. Test Environment

- Backend framework: NestJS 11 (TypeScript)
- Testing framework: Jest for unit/integration tests, Supertest for HTTP/e2e tests
- Database: Prisma (PostgreSQL in production). In tests the PrismaService is mocked (see mocking section).
- Mocking strategy: key services are replaced with Jest mocks in tests; database calls via Prisma are generally mocked by overriding `PrismaService` with a minimal mock object. External HTTP calls (axios), bcrypt, JWT, and mail transport are mocked.
- Time control: `jest.useFakeTimers()` and `jest.setSystemTime()` are used in many tests to make time-dependent logic deterministic.
- How to run tests:
  - Unit tests: `pnpm --filter api test`
  - E2E tests: `pnpm --filter api test:e2e`
  - Coverage: `pnpm --filter api test:cov`

Note: tests live under `apps/api/test` and internal unit tests under `apps/api/test/internal`.

## 3. Backend Modules Covered (summary table)

- Columns: Module | Test File | Test Type | Main Functions Tested | Status

| Module | Test File | Test Type | Main Functions Tested | Status |
|---|---|---:|---|---|
| Auth & Users | auth.e2e-spec.ts, users.e2e-spec.ts | E2E / Integration | register, login, refresh, logout, forgot/reset, get profile, update profile, change-password, delete | Covered |
| Portfolio | portfolio.e2e-spec.ts | E2E / Integration | get portfolio, chart, allocation, transactions CRUD and validation | Covered |
| Alerts | alerts.e2e-spec.ts, test/internal/alert-evaluator.service.spec.ts | E2E + Unit | Alerts CRUD, history, evaluator logic (threshold, repeatMode, cooldown) | Covered |
| Smart Alerts | test/internal/smart-alerts.service.spec.ts | Unit | Condition evaluation (THRESHOLD, SPREAD, TREND), evaluate() flow, email generation | Covered |
| Forecast | forecast.e2e-spec.ts, test/internal/forecast.service.spec.ts | E2E + Unit | session retrieval, voting, scoring and leaderboard | Covered |
| Prices | price.e2e-spec.ts | E2E / Integration | domestic prices, history, thinning, export CSV, comparison | Covered |
| International Price | test/internal/digest.service.spec.ts (intl failure test) | Unit | fallback when API fails, integration within digest generation | Partially Covered |
| Exchange Rate | exchange-rate.e2e-spec.ts | E2E / Integration | GET rates, error handling | Covered |
| Converter | converter.e2e-spec.ts | E2E / Integration | input validation, compute and parameter transformation | Covered |
| Spread | price.e2e-spec.ts (comparison) | E2E | per-brand spread comparisons | Partially Covered |
| Heat Index | test/internal/heat-index.service.spec.ts | Unit | compute() velocity/spread/crossings and helpers; getCurrent/getHistory | Covered |
| DCA Simulator | (not yet in test folder) | - | - | Not Covered |
| Digest | test/internal/digest.service.spec.ts | Unit | daily digest generation, pct-change logic, international fallback, email delivery, retry scheduling | Covered |
| Admin | various admin controllers (limited e2e coverage) | Partial | admin stats/crawl triggers (some endpoints stubbed in e2e) | Partially Covered |
| Crawler | test/internal/*-crawler.service.spec.ts, base-crawler.service.spec.ts | Unit | parse responses, data-source registration, crawl session lifecycle, persistence, anomaly flagging | Covered |
| Scheduler / Background Jobs | test/internal/crawl-scheduler.service.spec.ts, digest scheduledRun | Unit | trading hours gate, runNow, scheduled retry behavior | Covered |
| Anomaly Detector | test/internal/anomaly-detector.service.spec.ts | Unit | anomaly detection and deviation percent helper | Covered |
| Mail | mocked across tests (MailService) | Unit / Integration (mocked) | sendAlertEmail, sendDigestEmail behaviour under failure | Partially Covered |
| AI Service | mentioned in digest tests (AI fallback) | Unit (partial) | AI summary failure paths and fallback | Partially Covered |

## 4. Detailed Test Coverage

Note: only files present in the repository were used to prepare the following module-level summaries. Test file names are listed; large code excerpts were intentionally omitted.

### Auth & Users
- Responsibilities: User registration, email verification, login/logout, refresh tokens, password reset, profile management, account deletion.
- Test files: `apps/api/test/auth.e2e-spec.ts`, `apps/api/test/users.e2e-spec.ts`.
- Covered cases:
  - Happy paths: registration payload validation, login returns access token and refresh cookie, refresh with valid cookie returns access token, profile endpoints return and update data as expected.
  - Failure cases: invalid payloads, duplicate email during registration (409), pending account during login (401), rate limiting (429), invalid/absent refresh cookie (401), invalid tokens.
- Edge cases: social-login (no password), missing cookie behaviour, verification/reset token validation.
- Mocking: `PrismaService` mocked for database operations, `MailService` mocked for verification/reset emails, `JwtService` mocked for token signing and verification; `bcrypt` is mocked in auth e2e tests.

### Portfolio
- Responsibilities: Portfolio aggregation, transactions CRUD, charts and allocation breakdowns.
- Test files: `apps/api/test/portfolio.e2e-spec.ts`.
- Covered cases:
  - Happy paths: retrieving portfolio summary and charts, paginated transactions, creating/editing/deleting transactions.
  - Failure tests: invalid quantities, invalid dates, invalid gold types are validated (400), unauthenticated access (401).
- Mocking: `PortfolioService` stubbed in e2e to isolate controller validation and auth.

### Alerts
- Responsibilities: Price alerts CRUD and evaluation to send notifications.
- Test files: `apps/api/test/alerts.e2e-spec.ts`, `apps/api/test/internal/alert-evaluator.service.spec.ts`.
- Covered cases:
  - Happy paths: create/list/toggle/delete alert flows, authorized access.
  - Failure tests: bad payloads (400), unauthorized requests (401), ownership checks.
  - Edge cases (internal): cooldown logic, repeatMode true/false behavior, exact 30-minute boundary, missing lastTriggeredAt, gte vs lte conditions, email send failure handled.
- Mocking: `PrismaService`, `MailService` mocked in unit tests.

### Smart Alerts
- Responsibilities: Evaluate composite conditions (threshold, spread, trend) and generate natural language / email alerts.
- Test files: `apps/api/test/internal/smart-alerts.service.spec.ts`.
- Covered cases:
  - Happy path: condition evaluation triggers mail and updates status.
  - Failure cases: missing user (skips email but updates), condition2 fail prevents firing.
  - Edge cases: no price records (skip), insufficient data for trend conditions, single-point chart SVG returns empty string.
- Mocking: `PrismaService` and `MailService`.

### Forecast
- Responsibilities: manage forecast sessions, accept votes, score sessions and maintain leaderboard.
- Test files: `apps/api/test/forecast.e2e-spec.ts`, `apps/api/test/internal/forecast.service.spec.ts`.
- Covered cases:
  - Happy paths: retrieve active session, vote happy path, leaderboard retrieval.
  - Failure: voting when session closed or missing, invalid payloads.
  - Edge cases: scoring logic for up/down/flat outcomes, openNextSession when existing session found, skip scoring when price bracket missing.
- Mocking: `PrismaService`, `PriceService` mocked in unit tests; `ForecastService` stubbed in e2e.

### Prices
- Responsibilities: provide domestic price listing, historical charts, CSV export and comparison across brands.
- Test files: `apps/api/test/price.e2e-spec.ts`.
- Covered cases:
  - Happy paths: domestic endpoint returns status/live/outdated, history returns points, comparison highlights best buy/sell, CSV export with auth.
  - Failure: invalid query params (400), missing auth for export (401).
  - Edge cases: history thinning for 1Y and 3M ranges, single record marking as outdated and changePercent null, large export `take` behaviour.
- Mocking: `PrismaService` priceRecord queries mocked to provide deterministic datasets.

### International Price
- Responsibilities: fetch XAU/USD and compute derived values used in digest.
- Test files: digest unit tests exercise international fallback: `apps/api/test/internal/digest.service.spec.ts`.
- Covered cases: successful retrieval, failure fallback where xauUsd set to 0.

### Exchange Rate
- Responsibilities: fetch latest FX rates used for conversions.
- Test files: `apps/api/test/exchange-rate.e2e-spec.ts`.
- Covered cases: success and service error (500) conditions.

### Converter
- Responsibilities: calculate weights and valuations using price inputs and purity.
- Test files: `apps/api/test/converter.e2e-spec.ts`.
- Covered cases: input validation errors (unit, qty, purity, brand, goldType), numeric transformation of qty, and positive conversion result.

### Spread
- Covered indirectly through `price.e2e-spec.ts` comparisons; more dedicated tests may improve coverage.

### Heat Index
- Responsibilities: compute composite market heat index (velocity, spread, threshold crossings).
- Test files: `apps/api/test/internal/heat-index.service.spec.ts`.
- Covered cases:
  - Velocity behaviour with 2% avg change (score cap), 0% change (zero velocity), empty data (zeroed scores).
  - Spread scoring boundaries and label mapping (Cold/Warm/Hot) using carefully constructed inputs.
  - Threshold crossings counting and label thresholds.
  - getCurrent recompute and computeAndStore flows.

### Digest
- Responsibilities: daily digest generation, pct-change computation, international price usage, AI summary integration, email sending, scheduled retry.
- Test files: `apps/api/test/internal/digest.service.spec.ts`.
- Covered cases:
  - Idempotent generation when today's digest exists
  - pctChange calculation with and without previous price
  - AI summary failure fallback
  - sendEmails resilient to individual email failures
  - scheduledRun retry scheduling on failure

### Crawlers
- Responsibilities: parsing upstream site APIs (SJC, DOJI, PNJ, BTMC), creating crawl sessions, persisting price records and data-source registration.
- Test files: `apps/api/test/internal/*-crawler.service.spec.ts`, `base-crawler.service.spec.ts`.
- Covered cases: parsing correctness, skipping malformed rows, deduplication, empty responses, persistence failures and session status updates, anomaly flagging.

### Scheduler / Background Jobs
- Responsibilities: enforce trading-hour windows and trigger crawlers, scheduled digest run and retries.
- Test files: `apps/api/test/internal/crawl-scheduler.service.spec.ts`, digest scheduledRun tests.
- Covered cases: trading hour boundaries, `SKIP_TRADING_HOURS` override, runNow counting and resilience to single crawler failures.

### Anomaly Detector
- Responsibilities: detect anomalous price spikes/ drops (>15%).
- Test files: `apps/api/test/internal/anomaly-detector.service.spec.ts`.
- Covered cases: first record (no prev), prevPrice zero, boundary 15% not anomalous, positive/negative spikes detected, deviation percent helper.

### Mail
- Mail sending is mocked across unit tests; tests verify that MailService is invoked where appropriate and that failures do not crash background jobs. Specific mail transport tests are not present (mocked-only).

### AI service
- AI usage is exercised via `DigestService` tests: AI summary failure path is handled gracefully. Full integration with OpenAI is not executed in tests (import and runtime calls are guarded and mocked).

## 5. API / Endpoint Coverage Table (selected)

| Endpoint | Method | Required Auth | Test File | Cases Covered | Status |
|---|---:|---|---|---|---|
| /api/health | GET | No | app.e2e-spec.ts | returns {status: 'ok'} | Covered |
| /api/auth/register | POST | No | auth.e2e-spec.ts | invalid payload (400), duplicate email (409) | Covered |
| /api/auth/login | POST | No | auth.e2e-spec.ts | success (200), pending user (401), rate limit (429) | Covered |
| /api/auth/refresh | POST | Cookie | auth.e2e-spec.ts | missing cookie (401), valid cookie returns access | Covered |
| /api/alerts | GET/POST | Yes | alerts.e2e-spec.ts | CRUD flows, validation errors | Covered |
| /api/alerts/history | GET | Yes | alerts.e2e-spec.ts | paginated history | Covered |
| /api/forecast/session | GET | No | forecast.e2e-spec.ts | session returned, ratios handling | Covered |
| /api/forecast/vote | POST | Yes | forecast.e2e-spec.ts | vote validation, auth checks | Covered |
| /api/prices/domestic | GET | No | price.e2e-spec.ts | latest prices, status, changePercent | Covered |
| /api/prices/history | GET | No | price.e2e-spec.ts | parameter validation, thinning behaviour | Covered |
| /api/prices/history/export | GET | Yes | price.e2e-spec.ts | CSV export, large range export take=10000 | Covered |
| /api/converter/calculate | GET | No | converter.e2e-spec.ts | validation and conversion result | Covered |
| /api/exchange-rate/rates | GET | No | exchange-rate.e2e-spec.ts | success and error handling | Covered |

(For full endpoint matrix refer to test file list under `apps/api/test`.)

## 6. Business Logic Coverage

Key business rules covered by tests:
- User registration/login: password hashing, validation rules, login attempt rate-limiting logic, cookie refresh token behavior.
- JWT / refresh token: refresh endpoint expects cookie, invalid tokens rejected, verifyAccess/verifyRefresh mocked in e2e.
- Portfolio transactions: validation on quantity (>0), valid goldType, date parsing; transaction creation path tested.
- Alert threshold logic: lte/gte checks, repeatMode cooldown logic (30 minutes), history persistence and status updates.
- Smart alert condition evaluation: threshold, spread and trend evaluation; trend requires sufficient points; chart generation returns empty when insufficient records.
- Forecast voting and scoring: open/close sessions, vote recording, scoreOneSession handling of up/down/flat results and user score upserts.
- Price conversion logic: converter validates inputs and transforms string qty to number before calling service.
- Heat index calculation: velocity, spread and crossing scores with label mapping; empty-data behavior.
- Scheduler behaviour: trading hours gating and SKIP_TRADING_HOURS override.
- Admin authorization (controllers are guarded in e2e by role checks where applicable; some admin flows stubbed).

## 7. Mocking and Test Data

- External APIs mocked:
  - Crawler upstream HTTP calls (axios) are mocked in unit tests or replaced by parse helpers using sample fixtures.
  - International and exchange-rate services are stubbed in tests that depend on them.
- Services mocked:
  - PrismaService: mocked across almost every test (unit and e2e), replacing DB calls with jest mocks.
  - MailService: mocked to assert calls and to simulate failures.
  - JwtService: mocked to sign/verify tokens in e2e flows.
  - Bcrypt: mocked in auth tests to avoid expensive hashing and flakiness.
- Database calls: tests either stub Prisma methods or construct in-memory fixtures returned by mocked `findMany`/`findFirst` calls.
- Time/date control: `jest.useFakeTimers()` and `jest.setSystemTime()` are used in tests that depend on time windows (digest generation, scheduler, cooldown checks).
- Determinism: mocking external dependencies and controlling time ensures tests are deterministic and suitable for CI.

## 8. Coverage Result

Coverage data was not automatically generated as part of this report. To produce coverage metrics run:

```
cd apps/api
pnpm run test:cov
```

This will run `jest --coverage` and write results into `apps/api/coverage` (location configured in `package.json`). If you prefer a single-step run for all tests: `pnpm --filter api test:cov`.

If you want me to run coverage here and include the numeric results, I can run the coverage script and embed the results into the DOCX/markdown.

## 9. Test Execution Result (recent run)

- Command used: `pnpm --filter api test`
- Last known run (from session summary): `26 suites, 210 tests` — all unit tests passed. (This summary was produced earlier in the session.)
- No failing tests reported in the last run. Some intentionally mocked services produce WARN/ERROR logs but tests passed.
- Known skipped tests: `.e2e-spec.ts` files are excluded from `jest` root run by config; run separately via `test:e2e` if needed.

## 10. Limitations

- Frontend tests are not present in this workspace (no Jest or Playwright configuration for UI tests).
- Real third-party API behaviour is not fully reproduced — external services are mocked or stubbed.
- Mail transport and OpenAI integration are mocked; no integration tests with real SMTP or OpenAI keys are included.
- Production database behaviour (transaction conflicts, migrations, concurrency) is not exercised by unit tests.
- Some admin flows and data-heavy scenarios would benefit from additional integration tests.

## 11. Conclusion

The backend test suite provides good coverage for core business flows: authentication, price ingestion and parsing, alert evaluation, forecasting voting/scoring, heat-index computation, and digest generation. Mocking strategies and time control make tests deterministic and CI-friendly. Remaining work includes adding real integration tests for external services, increasing coverage for admin features, and introducing frontend integration or e2e flows for critical user journeys.

---

End of report.
