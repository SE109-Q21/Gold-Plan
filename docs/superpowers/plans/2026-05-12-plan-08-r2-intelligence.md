# GPLS Plan 8 — R2 Intelligence: AI Assistant + Morning Digest + Smart Alert Engine

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement F01 (AI Gold Assistant chatbot), F04 (Morning Gold Digest), and F05 (Smart Alert Engine) — the three R2 features that add AI-driven intelligence and advanced alerting.

**Architecture:**
- `AiModule`: wraps OpenAI/Gemini API; injects real-time price snapshot into system prompt; streaming responses via SSE. Guest: 10 questions/day (session cookie counter). Registered: unlimited.
- `DigestModule`: `@Cron('30 7 * * 1-5')` generates digest from DB + optional AI summary; stores to `GoldDigest` table; sends opt-in emails. Exposes public `GET /digest/latest` and `GET /digest/archive`.
- `SmartAlertModule`: extends Plan 6's `AlertEvaluatorService` with trend detection (N consecutive moves) and spread alerts. New `SmartAlert` model separate from basic `PriceAlert`.

**Tech Stack:** NestJS 11 · `openai` SDK · `@nestjs/schedule` · Nodemailer · Next.js 15 · TypeScript 5

**Depends on:** Plan 2 (live prices), Plan 5 (auth), Plan 6 (MailService, basic alert infrastructure)

**SRS Coverage:** F01 (FR-F01.1–F01.6, NFR-F01.1–F01.3), F04 (FR-F04.1–F04.5, NFR-F04.1–F04.2), F05 (FR-F05.1–F05.5, NFR-F05.1)

---

## File Map

```
apps/api/src/
├── ai/
│   ├── ai.module.ts                     NEW
│   ├── ai.service.ts                    NEW  buildSystemPrompt() + chat() streaming
│   ├── ai.controller.ts                 NEW  POST /ai/chat (SSE stream)
│   └── ai.service.spec.ts               NEW
├── digest/
│   ├── digest.module.ts                 NEW
│   ├── digest.service.ts                NEW  generate() + sendEmails() + archive
│   ├── digest.controller.ts             NEW  GET /digest/latest, /digest/archive
│   └── digest.service.spec.ts           NEW
├── smart-alerts/
│   ├── smart-alerts.module.ts           NEW
│   ├── smart-alerts.service.ts          NEW  CRUD + evaluate() with trend/spread logic
│   ├── smart-alerts.controller.ts       NEW  /smart-alerts (authenticated)
│   └── smart-alerts.service.spec.ts     NEW

apps/api/prisma/
└── schema.prisma                        MODIFY  GoldDigest, SmartAlert models; DigestSubscription on User

packages/shared/src/types/
└── gold.types.ts                        MODIFY  add AiChatMessageDto, DigestDto, SmartAlertDto

apps/web/src/
├── lib/
│   ├── ai.api.ts                        NEW  streaming fetch + useAiChat hook
│   ├── digest.api.ts                    NEW  useLatestDigest hook
│   └── smart-alerts.api.ts              NEW  smart alert CRUD hooks
├── components/
│   ├── AiChatWidget.tsx                 NEW  floating bottom-right chat widget
│   └── DigestCard.tsx                   NEW  "Today's Digest" banner for logged-in users
├── components/dashboard/
│   ├── OverviewPage.tsx                 MODIFY  add DigestCard + AiChatWidget
│   └── AlertsPage.tsx                   MODIFY  add Smart Alerts tab
└── app/digest/archive/
    └── page.tsx                         NEW  /digest/archive
```

---

## Tasks

### Task 1 — Prisma: Digest + SmartAlert Models
- [ ] `GoldDigest`:
  ```prisma
  model GoldDigest {
    id          String   @id @default(cuid())
    date        DateTime @unique // business day this digest covers
    sjcBuyVnd   BigInt
    sjcSellVnd  BigInt
    xauUsd      Float
    pctChangeSjc Float
    highlight   String   // notable market event
    aiSummary   String?  // AI-generated 2-3 sentence analysis
    generatedAt DateTime @default(now())
    @@index([date(sort: Desc)])
  }
  ```
- [ ] Add `digestOptIn Boolean @default(false)` to `User` model
- [ ] `SmartAlert`:
  ```prisma
  model SmartAlert {
    id            String          @id @default(cuid())
    userId        String
    brand         GoldBrand
    goldType      GoldType
    condition1    Json            // { type: 'TREND' | 'SPREAD' | 'THRESHOLD', params: {...} }
    condition2    Json?           // optional AND condition
    status        AlertStatus     @default(ACTIVE)
    lastFiredAt   DateTime?
    createdAt     DateTime        @default(now())
    user          User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  }
  ```
- [ ] Migration: `pnpm --filter api prisma migrate dev --name add-ai-digest-smart-alerts`

### Task 2 — AiService
- [ ] `buildSystemPrompt()`:
  - Fetch current SJC, DOJI prices + XAU/USD via `PriceService` + `InternationalService`
  - Build system prompt: "You are a Vietnamese gold market assistant... Current prices: SJC buy=79M VND, sell=79.5M VND; XAU/USD=2345..."
  - End with: "Decline all questions unrelated to gold. Append 'For reference only — not financial advice.' to any response containing price values."
  - NFR-F01.3: no user PII in prompt
- [ ] `chat(messages, userId?)`:
  - Call OpenAI `gpt-4o-mini` (or Gemini) with streaming enabled
  - Guest rate: check `aiQuestionsToday` in session/Redis; throw 429 if ≥10
  - Return async iterable for SSE streaming
- [ ] NFR-F01.2: use `gpt-4o-mini` to keep costs low; system prompt under 500 tokens
- [ ] Add `OPENAI_API_KEY` to `env.validation.ts` as `Joi.string().default('')`

### Task 3 — AiController
- [ ] `POST /ai/chat` body `{ messages: [{role, content}[]] }`:
  - Response: `text/event-stream` (SSE)
  - Each chunk: `data: { delta: "..." }\n\n`
  - Final chunk: `data: [DONE]\n\n`
  - Guest limit enforcement: check + increment counter per IP/session

### Task 4 — DigestService
- [ ] `generate()`:
  - Query DB: latest SJC price, yesterday SJC price → compute `pctChange`
  - Query latest XAU/USD from `InternationalService`
  - `highlight`: auto-generate as "SJC price moved X% vs yesterday" (simple template; AI only if available)
  - If `OPENAI_API_KEY` set: call AI for 2-3 sentence analysis (max 500 tokens, NFR-F04.2)
  - Save `GoldDigest` record for today's date
  - If today already exists: skip (idempotent)
- [ ] `sendEmails()`:
  - Find all users with `digestOptIn=true` and `status=ACTIVE`
  - Send HTML email using `MailService` with digest content
- [ ] Cron: `@Cron('30 7 * * 1-5')` (7:30 weekdays ICT = `'30 0 * * 1-5'` UTC) calls `generate()` + `sendEmails()`
- [ ] NFR-F04.1: if generation fails, log error; retry once after 5 min; send alert to admin if fails 2 consecutive days
- [ ] `getLatest()`: returns today's or most recent `GoldDigest`
- [ ] `getArchive(page)`: paginated list ordered by date DESC

### Task 5 — DigestController
- [ ] `GET /digest/latest` (public)
- [ ] `GET /digest/archive?page=1` (public)
- [ ] `POST /digest/subscribe` (authenticated) — set `digestOptIn=true`
- [ ] `DELETE /digest/subscribe` (authenticated) — set `digestOptIn=false`

### Task 6 — SmartAlertsService
- [ ] `createSmartAlert(userId, dto)`: validate ≤ 10 total (basic + smart) active alerts
- [ ] `evaluate()` (runs alongside basic alert evaluator):
  - **Trend Alert** (`condition1.type = 'TREND'`): get last N `PriceRecord` entries for brand+goldType; check if buy prices are monotonically increasing or decreasing; if so → fire
  - **Spread Alert** (`condition1.type = 'SPREAD'`): compute `spreadVnd = sellPrice - buyPrice`; check if `spread <= params.threshold`
  - **AND logic**: if `condition2` present, both must be true simultaneously
  - FR-F05.4: `naturalLanguage` field auto-generated: "SJC price drops 3 times in a row AND spread below 200,000 VND"
  - FR-F05.5: send email with 24h buy-price chart as inline PNG (generate SVG server-side, convert with `sharp` or send as pre-rendered SVG in email)
- [ ] Unit tests: trend detection for N=3 ascending/descending; spread threshold check; AND combination

### Task 7 — SmartAlertsController
- [ ] All routes `@UseGuards(JwtAuthGuard)`
- [ ] `GET /smart-alerts`
- [ ] `POST /smart-alerts` body `{ brand, goldType, condition1, condition2? }`
- [ ] `PATCH /smart-alerts/:id/toggle`
- [ ] `DELETE /smart-alerts/:id`

### Task 8 — Frontend: AiChatWidget
- [ ] `apps/web/src/components/AiChatWidget.tsx`:
  - Fixed bottom-right floating button (chat bubble icon, `--gold` colour)
  - Click → expands to 340×480 chat panel (above the button, z-index high)
  - Message list with user/assistant bubbles
  - 3–5 suggested question chips shown on first open (refreshed daily from static list)
  - Input + Send button; "Typing..." indicator during stream
  - SSE streaming: connect to `POST /ai/chat`; update assistant message in real time
  - Guest: show counter "X/10 questions remaining today"; on limit → "Register for unlimited"
  - "For reference only" disclaimer style: `font-size: 10px; color: var(--mute)` at bottom of each AI message containing prices
- [ ] Add `<AiChatWidget/>` to `apps/web/src/app/page.tsx` (always visible, all pages)

### Task 9 — Frontend: DigestCard
- [ ] `apps/web/src/components/DigestCard.tsx`:
  - Shows only when authenticated and today's digest exists
  - Banner card above price table: "Today's Digest · 01/06/2026" with collapsible content
  - Content: SJC prices, % change, XAU/USD, highlight text, AI analysis
  - Dismiss button (stores dismissed state in session; reappears next day)
- [ ] Wire to `useLatestDigest()` hook; show skeleton while loading
- [ ] Opt-in/opt-out toggle in AccountPage preferences section

### Task 10 — Frontend: Smart Alerts UI
- [ ] Add "Smart Alerts" sub-tab to `AlertsPage.tsx`
- [ ] Builder form for smart alerts:
  - Condition 1 type: Price Threshold / Trend / Spread
  - For Trend: N selector (2–5) + direction (Up/Down)
  - For Spread: threshold input (VND)
  - For Threshold: same as basic alert
  - Optional: AND Condition 2 toggle → shows second condition builder
  - Live preview: auto-generates Vietnamese natural-language summary
- [ ] Smart alerts list: shows natural language description, status, delete/toggle

### Task 11 — /digest/archive Page
- [ ] `apps/web/src/app/digest/archive/page.tsx`:
  - List of digests by date, newest first, paginated
  - Each item: date, SJC price, % change, highlight
  - Click → expands full digest with AI analysis

### Task 12 — Acceptance Checks
- [ ] AI chat sends message → streams response; response contains price disclaimer
- [ ] Off-topic question → polite refusal (test with "What's the weather?")
- [ ] Guest sends 10 messages → 11th returns 429 with registration prompt
- [ ] Morning Digest generated at 7:30; `GET /digest/latest` returns today's entry
- [ ] Subscribed user receives email with digest content
- [ ] Smart Trend alert fires after 3 consecutive price drops in price history
- [ ] Smart AND alert: both conditions must be true simultaneously before firing
- [ ] Digest card appears for logged-in users; dismisses on click; reappears next day
- [ ] `pnpm --filter web build` zero TS errors
