# GPLS Plan 1 — Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the full GPLS monorepo — pnpm workspaces, NestJS API app, Next.js 14 web app, complete PostgreSQL schema (Prisma), shared TypeScript types, crawler infrastructure (scheduler + anomaly detector + base crawler), and Next.js providers — so every subsequent plan can build on a working, tested foundation.

**Architecture:** pnpm monorepo (Turborepo) with `apps/api` (NestJS 10, TypeScript) and `apps/web` (Next.js 14 App Router, TypeScript, Tailwind CSS). The API uses Prisma 5 for all DB access via a global `DatabaseModule`. Crawlers are abstract classes scheduled by `@nestjs/schedule` (5-min cron, trading-hours gate). All plans after this one add NestJS modules to `AppModule` and Next.js pages/components to the web app — they never touch the scaffold files created here.

**Tech Stack:** pnpm 9 · Turborepo 2 · NestJS 10 · Next.js 14 (App Router) · PostgreSQL 15 · Prisma 5 · @nestjs/schedule · @nestjs/config · TanStack Query 5 · Axios · Tailwind CSS 3 · Jest · Supertest · TypeScript 5

---

## File Map

```
gpls/
├── package.json                          # workspace root
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.build.json
│   │   ├── nest-cli.json
│   │   ├── .eslintrc.js
│   │   ├── prisma/
│   │   │   └── schema.prisma             # full schema (all releases)
│   │   ├── src/
│   │   │   ├── main.ts                   # bootstrap + CORS + validation
│   │   │   ├── app.module.ts             # root module
│   │   │   ├── database/
│   │   │   │   ├── prisma.service.ts     # PrismaClient + OnModuleInit
│   │   │   │   └── database.module.ts    # @Global module exporting PrismaService
│   │   │   └── crawler/
│   │   │       ├── anomaly-detector.service.ts
│   │   │       ├── base-crawler.service.ts
│   │   │       ├── crawl-scheduler.service.ts
│   │   │       └── crawler.module.ts
│   │   └── test/
│   │       └── app.e2e-spec.ts
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── tailwind.config.ts
│       ├── next.config.ts
│       └── src/
│           ├── app/
│           │   ├── layout.tsx             # root layout with providers
│           │   └── page.tsx               # placeholder home page
│           └── lib/
│               ├── api-client.ts          # axios instance + base URL
│               └── query-client.ts        # TanStack QueryClient factory
└── packages/
    └── shared/
        ├── package.json
        └── src/
            ├── index.ts
            └── types/
                ├── gold.types.ts          # GoldBrand, GoldType, PriceRecord
                ├── user.types.ts          # UserRole, UserStatus
                └── api.types.ts           # ApiResponse<T> wrapper
```

---

### Task 1: Monorepo Root Scaffold

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.gitignore`

- [ ] **Step 1: Initialize workspace root**

```bash
mkdir gpls && cd gpls
git init
pnpm init -y
```

- [ ] **Step 2: Write root `package.json`**

```json
{
  "name": "gpls",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.4.5"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

- [ ] **Step 3: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 4: Write `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "persistent": true,
      "cache": false
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "test:e2e": {
      "cache": false
    },
    "lint": {
      "outputs": []
    }
  }
}
```

- [ ] **Step 5: Write `.gitignore`**

```
node_modules/
.next/
dist/
.env
.env.local
*.local
coverage/
prisma/migrations/*.sql.bak
```

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json .gitignore
git commit -m "chore: initialize pnpm monorepo with Turborepo"
```

---

### Task 2: Shared Types Package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types/gold.types.ts`
- Create: `packages/shared/src/types/user.types.ts`
- Create: `packages/shared/src/types/api.types.ts`

- [ ] **Step 1: Create shared package**

```bash
mkdir -p packages/shared/src/types
```

- [ ] **Step 2: Write `packages/shared/package.json`**

```json
{
  "name": "@gpls/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "echo 'no lint'"
  }
}
```

- [ ] **Step 3: Write `packages/shared/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Write `packages/shared/src/types/gold.types.ts`**

```typescript
export type GoldBrand = 'SJC' | 'DOJI' | 'PNJ' | 'BAO_TIN';

export type GoldType = 'MIEN_SJC' | 'NHAN_9999' | 'VANG_24K' | 'VANG_18K';

export type PriceStatus = 'live' | 'recent' | 'outdated';

export type HeatCategory = 'cold' | 'warm' | 'hot';

export interface DomesticPriceDto {
  brand: GoldBrand;
  goldType: GoldType;
  buyPrice: number;   // VND, stored as number in DTO (BigInt serialised)
  sellPrice: number;
  recordedAt: string; // ISO string
  status: PriceStatus;
  changePercent: number | null;
}

export interface InternationalPriceDto {
  spotPriceUsd: number;
  spotPriceVnd: number;
  exchangeRate: number;
  recordedAt: string;
}

export interface HeatIndexDto {
  value: number;           // 0–100
  category: HeatCategory;
  priceVelocity: number;   // normalised 0–100
  spreadSize: number;      // VND
  thresholdCrossings: number;
  calculatedAt: string;
}

export interface SpreadDto {
  brand: GoldBrand;
  goldType: GoldType;
  spreadVnd: number;
  spreadPercent: number;
  crawlSessionId: string;
}
```

- [ ] **Step 5: Write `packages/shared/src/types/user.types.ts`**

```typescript
export type UserRole = 'user' | 'admin';
export type UserStatus = 'pending' | 'active' | 'locked' | 'deleted';

export interface AuthTokenDto {
  accessToken: string;
  expiresIn: number;
}

export interface UserDto {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}
```

- [ ] **Step 6: Write `packages/shared/src/types/api.types.ts`**

```typescript
export interface ApiResponse<T> {
  data: T;
  timestamp: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

- [ ] **Step 7: Write `packages/shared/src/index.ts`**

```typescript
export * from './types/gold.types';
export * from './types/user.types';
export * from './types/api.types';
```

- [ ] **Step 8: Commit**

```bash
git add packages/shared/
git commit -m "feat: add shared TypeScript types package (gold, user, api)"
```

---

### Task 3: NestJS API App Setup

**Files:**
- Create: `apps/api/` (full NestJS scaffold)
- Create: `apps/api/.env.example`

- [ ] **Step 1: Scaffold NestJS app**

```bash
cd apps
pnpm dlx @nestjs/cli new api --package-manager pnpm --skip-git --strict
cd api
```

- [ ] **Step 2: Add dependencies**

```bash
pnpm add @nestjs/config @nestjs/schedule class-validator class-transformer
pnpm add @prisma/client bcrypt jsonwebtoken nodemailer axios
pnpm add -D prisma @types/bcrypt @types/jsonwebtoken @types/nodemailer @types/supertest supertest
```

- [ ] **Step 3: Add `@gpls/shared` to API dependencies**

Edit `apps/api/package.json`, add to `dependencies`:
```json
{
  "dependencies": {
    "@gpls/shared": "workspace:*"
  }
}
```

- [ ] **Step 4: Write `.env.example`** in repo root

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gpls_dev"

# Redis (for BullMQ if needed)
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="change-me-minimum-32-chars-long-secret"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_SECRET="change-me-refresh-secret"

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="noreply@gpls.vn"

# App
APP_URL="http://localhost:3000"
API_URL="http://localhost:4000"
PORT=4000

# External APIs
GOLD_API_KEY=""
EXCHANGE_RATE_API_KEY=""

# AI (for F01, F04 — R2)
OPENAI_API_KEY=""
GEMINI_API_KEY=""
```

- [ ] **Step 5: Verify NestJS scaffolds and starts**

```bash
pnpm run start:dev
```
Expected: `Application is running on: http://[::1]:3000` (or 4000 after we configure it)

Stop the server with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
cd ../..
git add apps/api/ .env.example
git commit -m "chore: scaffold NestJS API app with dependencies"
```

---

### Task 4: Next.js Web App Setup

**Files:**
- Create: `apps/web/` (Next.js 14 App Router)
- Create: `apps/web/src/lib/api-client.ts`
- Create: `apps/web/src/lib/query-client.ts`
- Create: `apps/web/src/app/providers.tsx`
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd apps
pnpm create next-app@latest web \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-git
```

- [ ] **Step 2: Add dependencies**

```bash
cd web
pnpm add @tanstack/react-query axios
pnpm add -D @tanstack/react-query-devtools
```

- [ ] **Step 3: Add `@gpls/shared` to web dependencies**

Edit `apps/web/package.json`, add to `dependencies`:
```json
{
  "dependencies": {
    "@gpls/shared": "workspace:*"
  }
}
```

- [ ] **Step 4: Write `apps/web/src/lib/api-client.ts`**

```typescript
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // for httpOnly refresh cookie
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

- [ ] **Step 5: Write `apps/web/src/lib/query-client.ts`**

```typescript
import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute default
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
```

- [ ] **Step 6: Write `apps/web/src/app/providers.tsx`**

```tsx
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { getQueryClient } from '@/lib/query-client';

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 7: Update `apps/web/src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin', 'vietnamese'] });

export const metadata: Metadata = {
  title: 'GPLS — Giá Vàng Việt Nam',
  description: 'Tra cứu giá vàng SJC, DOJI theo thời gian thực',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Update `apps/web/src/app/page.tsx`** (placeholder)

```tsx
export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold text-yellow-600">GPLS</h1>
      <p className="mt-2 text-gray-500">Giá Vàng Lookup System — đang phát triển</p>
    </main>
  );
}
```

- [ ] **Step 9: Add `NEXT_PUBLIC_API_URL` to `.env.example`**

The `.env.example` already has `API_URL`. Add for Next.js:
```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
```
Edit the root `.env.example` and append this line.

- [ ] **Step 10: Verify Next.js builds**

```bash
cd apps/web && pnpm dev
```
Expected: App runs at `http://localhost:3000`, shows "GPLS" heading.

Stop with Ctrl+C.

- [ ] **Step 11: Commit**

```bash
cd ../..
git add apps/web/
git commit -m "chore: scaffold Next.js 14 web app with TanStack Query and API client"
```

---

### Task 5: Database Schema (Prisma)

**Files:**
- Create: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Initialize Prisma**

```bash
cd apps/api
pnpm dlx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Write `apps/api/prisma/schema.prisma`**

Replace the generated file with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum GoldBrand {
  SJC
  DOJI
  PNJ
  BAO_TIN
}

enum GoldType {
  MIEN_SJC
  NHAN_9999
  VANG_24K
  VANG_18K
}

enum CrawlStatus {
  pending
  running
  completed
  failed
}

enum UserStatus {
  pending
  active
  locked
  deleted
}

enum UserRole {
  user
  admin
}

enum AlertCondition {
  lte  // price ≤ threshold
  gte  // price ≥ threshold
}

enum AlertStatus {
  active
  triggered
  inactive
}

enum ForecastDirection {
  up
  down
  flat
}

// ─── Crawl Sources & Sessions ────────────────────────────────────────────────

model DataSource {
  id            String      @id @default(cuid())
  name          String
  brand         GoldBrand
  url           String
  crawlType     String      // "scrape" | "api"
  frequencyMin  Int         @default(5)
  isActive      Boolean     @default(true)
  lastCrawledAt DateTime?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  crawlSessions CrawlSession[]
}

model CrawlSession {
  id           String      @id @default(cuid())
  dataSourceId String
  startedAt    DateTime    @default(now())
  completedAt  DateTime?
  status       CrawlStatus @default(pending)

  dataSource   DataSource    @relation(fields: [dataSourceId], references: [id])
  priceRecords PriceRecord[]

  @@index([dataSourceId, startedAt])
}

// ─── Prices ───────────────────────────────────────────────────────────────────

model PriceRecord {
  id             String       @id @default(cuid())
  crawlSessionId String
  brand          GoldBrand
  goldType       GoldType
  buyPrice       BigInt       // VND in đồng
  sellPrice      BigInt       // VND in đồng
  recordedAt     DateTime     @default(now())
  isAnomalous    Boolean      @default(false)
  anomalyReason  String?
  approvedAt     DateTime?
  rejectedAt     DateTime?

  crawlSession   CrawlSession @relation(fields: [crawlSessionId], references: [id])

  @@index([brand, goldType, recordedAt])
  @@index([isAnomalous, approvedAt])
}

model ExchangeRate {
  id           String   @id @default(cuid())
  fromCurrency String   // "USD", "EUR"
  toCurrency   String   // "VND"
  rate         Decimal  @db.Decimal(20, 6)
  source       String   @default("api")
  recordedAt   DateTime @default(now())

  @@index([fromCurrency, toCurrency, recordedAt])
}

// ─── Heat Index (F03) ─────────────────────────────────────────────────────────

model HeatIndexRecord {
  id                 String   @id @default(cuid())
  indexValue         Int      // 0–100
  category           String   // "cold" | "warm" | "hot"
  priceVelocity      Decimal  @db.Decimal(10, 4)
  spreadSize         BigInt   // VND
  thresholdCrossings Int
  calculatedAt       DateTime @default(now())

  @@index([calculatedAt])
}

// ─── Users & Auth (M06) ───────────────────────────────────────────────────────

model User {
  id           String     @id @default(cuid())
  email        String     @unique
  passwordHash String
  status       UserStatus @default(pending)
  role         UserRole   @default(user)
  displayName  String?
  digestOptIn  Boolean    @default(false)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  deletedAt    DateTime?

  emailVerifications  EmailVerification[]
  passwordResets      PasswordReset[]
  loginAttempts       LoginAttempt[]
  priceAlerts         PriceAlert[]
  portfolioTransactions PortfolioTransaction[]
  userPreferences     UserPreference[]
  behavioralEvents    BehavioralEvent[]
  viewHistory         ViewHistory[]
  forecastVotes       ForecastVote[]
  forecastScores      UserForecastScore[]
}

model EmailVerification {
  id        String    @id @default(cuid())
  userId    String
  token     String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  user      User      @relation(fields: [userId], references: [id])
}

model PasswordReset {
  id        String    @id @default(cuid())
  userId    String
  token     String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  user      User      @relation(fields: [userId], references: [id])
}

model LoginAttempt {
  id          String   @id @default(cuid())
  userId      String?
  email       String
  ipAddress   String?
  success     Boolean
  attemptedAt DateTime @default(now())

  user        User?    @relation(fields: [userId], references: [id])

  @@index([email, attemptedAt])
}

// ─── Price Alerts (M07, F05) ──────────────────────────────────────────────────

model PriceAlert {
  id              String         @id @default(cuid())
  userId          String
  brand           GoldBrand
  goldType        GoldType
  thresholdPrice  BigInt
  condition       AlertCondition
  status          AlertStatus    @default(active)
  repeatMode      Boolean        @default(false)
  lastTriggeredAt DateTime?
  // Smart alert fields (F05)
  trendN          Int?           // N consecutive drops/rises
  spreadThreshold BigInt?        // spread ≤ X VND
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  user            User           @relation(fields: [userId], references: [id])
  triggerHistory  AlertTriggerHistory[]

  @@index([userId, status])
}

model AlertTriggerHistory {
  id           String     @id @default(cuid())
  alertId      String
  triggeredAt  DateTime   @default(now())
  priceAtTrigger BigInt
  emailSentAt  DateTime?

  alert        PriceAlert @relation(fields: [alertId], references: [id])
}

// ─── Portfolio Tracker (F02) ──────────────────────────────────────────────────

model PortfolioTransaction {
  id          String    @id @default(cuid())
  userId      String
  type        String    // "buy" | "sell"
  brand       GoldBrand
  goldType    GoldType
  quantity    Decimal   @db.Decimal(10, 4) // in tael
  pricePerTael BigInt   // VND
  transactedAt DateTime
  note        String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user        User      @relation(fields: [userId], references: [id])

  @@index([userId, transactedAt])
}

// ─── Morning Digest (F04) ─────────────────────────────────────────────────────

model MorningDigest {
  id          String   @id @default(cuid())
  date        String   // "YYYY-MM-DD"
  content     String   @db.Text
  sjcBuyPrice BigInt
  sjcSellPrice BigInt
  xauUsd      Decimal  @db.Decimal(10, 2)
  changeVsPrev Decimal @db.Decimal(6, 2) // %
  aiGenerated Boolean  @default(false)
  generatedAt DateTime @default(now())

  @@unique([date])
  @@index([generatedAt])
}

// ─── Personalisation (F09) ────────────────────────────────────────────────────

model UserPreference {
  id        String    @id @default(cuid())
  userId    String
  brand     GoldBrand
  goldType  GoldType
  viewCount Int       @default(0)
  isPinned  Boolean   @default(false)
  pinOrder  Int?
  updatedAt DateTime  @updatedAt

  user      User      @relation(fields: [userId], references: [id])

  @@unique([userId, brand, goldType])
}

model BehavioralEvent {
  id         String    @id @default(cuid())
  userId     String
  brand      GoldBrand
  goldType   GoldType
  eventType  String    @default("view")
  occurredAt DateTime  @default(now())

  user       User      @relation(fields: [userId], references: [id])

  @@index([userId, occurredAt])
}

// ─── View History (F10) ───────────────────────────────────────────────────────

model ViewHistory {
  id         String    @id @default(cuid())
  userId     String
  brand      GoldBrand
  goldType   GoldType
  buyPrice   BigInt    // price at view time
  viewedAt   DateTime  @default(now())

  user       User      @relation(fields: [userId], references: [id])

  @@index([userId, viewedAt])
}

// ─── Community Forecast (F07) ─────────────────────────────────────────────────

model ForecastSession {
  id          String    @id @default(cuid())
  date        String    // "YYYY-MM-DD" (the day being voted on)
  opensAt     DateTime
  closesAt    DateTime
  sessionClosed Boolean @default(false)
  scoredAt    DateTime?
  createdAt   DateTime  @default(now())

  votes       ForecastVote[]

  @@unique([date])
}

model ForecastVote {
  id               String            @id @default(cuid())
  sessionId        String
  userId           String
  direction        ForecastDirection
  votedAt          DateTime          @default(now())
  isCorrect        Boolean?

  session          ForecastSession   @relation(fields: [sessionId], references: [id])
  user             User              @relation(fields: [userId], references: [id])

  @@unique([sessionId, userId])
}

model UserForecastScore {
  id            String   @id @default(cuid())
  userId        String
  month         String   // "YYYY-MM"
  totalPoints   Int      @default(0)
  correctCount  Int      @default(0)
  streak        Int      @default(0)
  updatedAt     DateTime @updatedAt

  user          User     @relation(fields: [userId], references: [id])

  @@unique([userId, month])
}

// ─── Admin (M08) ──────────────────────────────────────────────────────────────

model AdminAuditLog {
  id         String   @id @default(cuid())
  adminId    String
  action     String   // "approve_anomaly" | "reject_anomaly" | "lock_user" | etc.
  entityType String
  entityId   String?
  oldValue   Json?
  newValue   Json?
  createdAt  DateTime @default(now())

  @@index([adminId, createdAt])
}
```

- [ ] **Step 3: Create `.env` from example and fill DATABASE_URL**

```bash
cp ../../.env.example ../../.env
# Edit .env: set DATABASE_URL to your local Postgres instance
# e.g. DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gpls_dev"
```

- [ ] **Step 4: Run migration**

```bash
pnpm dlx prisma migrate dev --name init
```
Expected output:
```
Applying migration `20260512000000_init`
Your database is now in sync with your schema.
```

- [ ] **Step 5: Verify tables exist**

```bash
pnpm dlx prisma studio
```
Expected: Browser opens Prisma Studio showing all tables (DataSource, PriceRecord, User, etc.).
Close the studio tab.

- [ ] **Step 6: Commit**

```bash
cd ../..
git add apps/api/prisma/
git commit -m "feat: add complete Prisma schema covering all GPLS releases (R1-R3)"
```

---

### Task 6: PrismaService + DatabaseModule

**Files:**
- Create: `apps/api/src/database/prisma.service.ts`
- Create: `apps/api/src/database/database.module.ts`
- Test: `apps/api/src/database/prisma.service.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/src/database/prisma.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();
    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call $connect on module init', async () => {
    const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue();
    await service.onModuleInit();
    expect(connectSpy).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/api && pnpm test --testPathPattern="prisma.service"
```
Expected: `FAIL` — `Cannot find module './prisma.service'`

- [ ] **Step 3: Implement PrismaService**

Create `apps/api/src/database/prisma.service.ts`:

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test --testPathPattern="prisma.service"
```
Expected: `PASS`

- [ ] **Step 5: Create DatabaseModule**

Create `apps/api/src/database/database.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/database/
git commit -m "feat: add PrismaService and global DatabaseModule"
```

---

### Task 7: NestJS App Bootstrap (main.ts + AppModule)

**Files:**
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Test: `apps/api/test/app.e2e-spec.ts`

- [ ] **Step 1: Write failing E2E test**

Create `apps/api/test/app.e2e-spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health returns 200 with status ok', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok' });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test:e2e
```
Expected: `FAIL` — `Cannot GET /api/health`

- [ ] **Step 3: Create HealthController**

Create `apps/api/src/health/health.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
```

- [ ] **Step 4: Update AppModule**

Replace `apps/api/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

- [ ] **Step 5: Update main.ts**

Replace `apps/api/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: process.env.APP_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api`);
}
bootstrap();
```

- [ ] **Step 6: Run E2E test to verify it passes**

```bash
pnpm test:e2e
```
Expected: `PASS` — `GET /api/health returns 200`

- [ ] **Step 7: Commit**

```bash
cd ../..
git add apps/api/src/
git commit -m "feat: bootstrap NestJS app with health endpoint, CORS, validation pipe"
```

---

### Task 8: AnomalyDetectorService

**Files:**
- Create: `apps/api/src/crawler/anomaly-detector.service.ts`
- Test: `apps/api/src/crawler/anomaly-detector.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/crawler/anomaly-detector.service.spec.ts`:

```typescript
import { AnomalyDetectorService } from './anomaly-detector.service';

describe('AnomalyDetectorService', () => {
  let service: AnomalyDetectorService;

  beforeEach(() => {
    service = new AnomalyDetectorService();
  });

  describe('isAnomalous', () => {
    it('returns false when no previous price (first record)', () => {
      expect(service.isAnomalous(null, 8_500_000n)).toBe(false);
    });

    it('returns false for normal movement within 15%', () => {
      const prev = 8_500_000n;
      const curr = 8_600_000n; // +1.18%
      expect(service.isAnomalous(prev, curr)).toBe(false);
    });

    it('returns true for upward spike > 15%', () => {
      const prev = 8_500_000n;
      const curr = 10_000_000n; // +17.6%
      expect(service.isAnomalous(prev, curr)).toBe(true);
    });

    it('returns true for downward spike > 15%', () => {
      const prev = 8_500_000n;
      const curr = 7_000_000n; // -17.6%
      expect(service.isAnomalous(prev, curr)).toBe(true);
    });

    it('returns false at exactly 15% boundary', () => {
      const prev = 8_000_000n;
      const curr = 9_200_000n; // exactly +15%
      expect(service.isAnomalous(prev, curr)).toBe(false);
    });
  });

  describe('getDeviationPercent', () => {
    it('calculates positive deviation correctly', () => {
      const result = service.getDeviationPercent(8_000_000n, 8_800_000n);
      expect(result).toBeCloseTo(10, 1);
    });

    it('calculates negative deviation correctly', () => {
      const result = service.getDeviationPercent(8_000_000n, 7_200_000n);
      expect(result).toBeCloseTo(-10, 1);
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd apps/api && pnpm test --testPathPattern="anomaly-detector"
```
Expected: `FAIL` — `Cannot find module`

- [ ] **Step 3: Implement AnomalyDetectorService**

Create `apps/api/src/crawler/anomaly-detector.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';

const ANOMALY_THRESHOLD = 0.15; // 15%

@Injectable()
export class AnomalyDetectorService {
  isAnomalous(prevPrice: bigint | null, newPrice: bigint): boolean {
    if (prevPrice === null || prevPrice === 0n) return false;
    const deviation = Math.abs(
      (Number(newPrice) - Number(prevPrice)) / Number(prevPrice),
    );
    return deviation > ANOMALY_THRESHOLD;
  }

  getDeviationPercent(prevPrice: bigint, newPrice: bigint): number {
    return ((Number(newPrice) - Number(prevPrice)) / Number(prevPrice)) * 100;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test --testPathPattern="anomaly-detector"
```
Expected: `PASS` — all 6 tests green

- [ ] **Step 5: Commit**

```bash
cd ../..
git add apps/api/src/crawler/anomaly-detector.service.ts \
        apps/api/src/crawler/anomaly-detector.service.spec.ts
git commit -m "feat: add AnomalyDetectorService with 15% deviation threshold (TDD)"
```

---

### Task 9: BaseCrawlerService

**Files:**
- Create: `apps/api/src/crawler/base-crawler.service.ts`
- Test: `apps/api/src/crawler/base-crawler.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/crawler/base-crawler.service.spec.ts`:

```typescript
import { BaseCrawlerService, RawPriceData } from './base-crawler.service';
import { PrismaService } from '../database/prisma.service';
import { AnomalyDetectorService } from './anomaly-detector.service';
import { GoldBrand, GoldType } from '@prisma/client';

class TestCrawler extends BaseCrawlerService {
  readonly brand: GoldBrand = 'SJC';
  fetchPrices = jest.fn<Promise<RawPriceData[]>, []>();
}

const mockPrisma = {
  crawlSession: {
    create: jest.fn(),
    update: jest.fn(),
  },
  priceRecord: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
};

describe('BaseCrawlerService', () => {
  let crawler: TestCrawler;
  let anomalyDetector: AnomalyDetectorService;

  beforeEach(() => {
    anomalyDetector = new AnomalyDetectorService();
    crawler = new TestCrawler(
      mockPrisma as unknown as PrismaService,
      anomalyDetector,
    );
    jest.clearAllMocks();
  });

  it('creates a crawl session, persists records, and marks session complete', async () => {
    const session = { id: 'session-1' };
    mockPrisma.crawlSession.create.mockResolvedValue(session);
    mockPrisma.crawlSession.update.mockResolvedValue({});
    mockPrisma.priceRecord.findFirst.mockResolvedValue(null);
    mockPrisma.priceRecord.create.mockResolvedValue({});

    crawler.fetchPrices.mockResolvedValue([
      { goldType: 'MIEN_SJC' as GoldType, buyPrice: 8_500_000n, sellPrice: 8_600_000n },
    ]);

    await crawler.crawl('source-1');

    expect(mockPrisma.crawlSession.create).toHaveBeenCalledWith({
      data: { dataSourceId: 'source-1', status: 'running' },
    });
    expect(mockPrisma.priceRecord.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.crawlSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'completed' }) }),
    );
  });

  it('marks session failed when fetchPrices throws', async () => {
    const session = { id: 'session-2' };
    mockPrisma.crawlSession.create.mockResolvedValue(session);
    mockPrisma.crawlSession.update.mockResolvedValue({});
    crawler.fetchPrices.mockRejectedValue(new Error('network error'));

    await crawler.crawl('source-1');

    expect(mockPrisma.crawlSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) }),
    );
  });

  it('flags anomalous records but still persists them', async () => {
    mockPrisma.crawlSession.create.mockResolvedValue({ id: 's3' });
    mockPrisma.crawlSession.update.mockResolvedValue({});
    mockPrisma.priceRecord.findFirst.mockResolvedValue({
      buyPrice: 8_500_000n,
    });
    mockPrisma.priceRecord.create.mockResolvedValue({});

    crawler.fetchPrices.mockResolvedValue([
      { goldType: 'MIEN_SJC' as GoldType, buyPrice: 10_500_000n, sellPrice: 10_600_000n }, // +23%
    ]);

    await crawler.crawl('source-1');

    expect(mockPrisma.priceRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isAnomalous: true }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run to verify fails**

```bash
pnpm test --testPathPattern="base-crawler"
```
Expected: `FAIL`

- [ ] **Step 3: Implement BaseCrawlerService**

Create `apps/api/src/crawler/base-crawler.service.ts`:

```typescript
import { Logger } from '@nestjs/common';
import { GoldBrand, GoldType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AnomalyDetectorService } from './anomaly-detector.service';

export interface RawPriceData {
  goldType: GoldType;
  buyPrice: bigint;
  sellPrice: bigint;
}

export abstract class BaseCrawlerService {
  protected readonly logger: Logger;
  protected abstract readonly brand: GoldBrand;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly anomalyDetector: AnomalyDetectorService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  abstract fetchPrices(): Promise<RawPriceData[]>;

  async crawl(dataSourceId: string): Promise<void> {
    const session = await this.prisma.crawlSession.create({
      data: { dataSourceId, status: 'running' },
    });

    try {
      const rawPrices = await this.fetchPrices();

      for (const price of rawPrices) {
        const prevRecord = await this.prisma.priceRecord.findFirst({
          where: { brand: this.brand, goldType: price.goldType, isAnomalous: false },
          orderBy: { recordedAt: 'desc' },
        });

        const isAnomalous = this.anomalyDetector.isAnomalous(
          prevRecord?.buyPrice ?? null,
          price.buyPrice,
        );

        await this.prisma.priceRecord.create({
          data: {
            crawlSessionId: session.id,
            brand: this.brand,
            goldType: price.goldType,
            buyPrice: price.buyPrice,
            sellPrice: price.sellPrice,
            isAnomalous,
            anomalyReason: isAnomalous ? 'deviation > 15%' : null,
          },
        });
      }

      await this.prisma.crawlSession.update({
        where: { id: session.id },
        data: { status: 'completed', completedAt: new Date() },
      });

      this.logger.log(`Crawl OK: ${this.brand} — ${rawPrices.length} records`);
    } catch (error) {
      await this.prisma.crawlSession.update({
        where: { id: session.id },
        data: { status: 'failed', completedAt: new Date() },
      });
      this.logger.error(`Crawl FAILED: ${this.brand} — ${(error as Error).message}`);
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test --testPathPattern="base-crawler"
```
Expected: `PASS` — 3 tests

- [ ] **Step 5: Commit**

```bash
cd ../..
git add apps/api/src/crawler/base-crawler.service.ts \
        apps/api/src/crawler/base-crawler.service.spec.ts
git commit -m "feat: add BaseCrawlerService — session management, persistence, anomaly flagging"
```

---

### Task 10: CrawlSchedulerService

**Files:**
- Create: `apps/api/src/crawler/crawl-scheduler.service.ts`
- Test: `apps/api/src/crawler/crawl-scheduler.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/crawler/crawl-scheduler.service.spec.ts`:

```typescript
import { CrawlSchedulerService } from './crawl-scheduler.service';

// Mock Date to control "current time" in tests
function mockTime(hour: number, minute = 0) {
  const d = new Date(2026, 4, 12, hour, minute, 0); // 2026-05-12 HH:MM ICT
  jest.useFakeTimers().setSystemTime(d);
}

describe('CrawlSchedulerService', () => {
  let scheduler: CrawlSchedulerService;

  beforeEach(() => {
    scheduler = new CrawlSchedulerService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('isTradingHours (private, tested via runCrawlCycle)', () => {
    it('does NOT run crawlers at 06:59 (before trading hours)', async () => {
      mockTime(6, 59);
      const fn = jest.fn().mockResolvedValue(undefined);
      scheduler.registerCrawler('SJC', fn);
      await scheduler.runCrawlCycle();
      expect(fn).not.toHaveBeenCalled();
    });

    it('DOES run crawlers at 07:00 (start of trading hours)', async () => {
      mockTime(7, 0);
      const fn = jest.fn().mockResolvedValue(undefined);
      scheduler.registerCrawler('SJC', fn);
      await scheduler.runCrawlCycle();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('DOES run crawlers at 16:59', async () => {
      mockTime(16, 59);
      const fn = jest.fn().mockResolvedValue(undefined);
      scheduler.registerCrawler('DOJI', fn);
      await scheduler.runCrawlCycle();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('does NOT run crawlers at 17:00 (end of trading hours)', async () => {
      mockTime(17, 0);
      const fn = jest.fn().mockResolvedValue(undefined);
      scheduler.registerCrawler('DOJI', fn);
      await scheduler.runCrawlCycle();
      expect(fn).not.toHaveBeenCalled();
    });
  });

  it('runs all registered crawlers in a single cycle', async () => {
    mockTime(10, 0);
    const sjc = jest.fn().mockResolvedValue(undefined);
    const doji = jest.fn().mockResolvedValue(undefined);
    scheduler.registerCrawler('SJC', sjc);
    scheduler.registerCrawler('DOJI', doji);
    await scheduler.runCrawlCycle();
    expect(sjc).toHaveBeenCalledTimes(1);
    expect(doji).toHaveBeenCalledTimes(1);
  });

  it('continues running other crawlers if one throws', async () => {
    mockTime(10, 0);
    const failing = jest.fn().mockRejectedValue(new Error('network'));
    const passing = jest.fn().mockResolvedValue(undefined);
    scheduler.registerCrawler('SJC', failing);
    scheduler.registerCrawler('DOJI', passing);
    await scheduler.runCrawlCycle(); // must not throw
    expect(passing).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to verify fails**

```bash
pnpm test --testPathPattern="crawl-scheduler"
```
Expected: `FAIL`

- [ ] **Step 3: Implement CrawlSchedulerService**

Create `apps/api/src/crawler/crawl-scheduler.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

const TRADING_START_HOUR = 7;  // 07:00 ICT
const TRADING_END_HOUR = 17;   // 17:00 ICT

function isTradingHours(): boolean {
  // toLocaleString converts to ICT (UTC+7) for the hour check
  const vietnamHour = parseInt(
    new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: 'numeric',
      hour12: false,
    }),
    10,
  );
  return vietnamHour >= TRADING_START_HOUR && vietnamHour < TRADING_END_HOUR;
}

@Injectable()
export class CrawlSchedulerService {
  private readonly logger = new Logger(CrawlSchedulerService.name);
  private readonly crawlers = new Map<string, () => Promise<void>>();

  registerCrawler(brand: string, crawlFn: () => Promise<void>): void {
    this.crawlers.set(brand, crawlFn);
  }

  @Cron('*/5 * * * *')
  async runCrawlCycle(): Promise<void> {
    if (!isTradingHours()) {
      this.logger.debug('Outside trading hours — skipping crawl cycle');
      return;
    }

    this.logger.log(`Starting crawl cycle (${this.crawlers.size} sources)`);

    for (const [brand, crawlFn] of this.crawlers.entries()) {
      try {
        await crawlFn();
      } catch (err) {
        this.logger.error(`Crawl failed for ${brand}: ${(err as Error).message}`);
      }
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test --testPathPattern="crawl-scheduler"
```
Expected: `PASS` — 6 tests

- [ ] **Step 5: Commit**

```bash
cd ../..
git add apps/api/src/crawler/crawl-scheduler.service.ts \
        apps/api/src/crawler/crawl-scheduler.service.spec.ts
git commit -m "feat: add CrawlSchedulerService — 5-min cron gated to trading hours 07:00-17:00 ICT"
```

---

### Task 11: CrawlerModule

**Files:**
- Create: `apps/api/src/crawler/crawler.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create CrawlerModule**

Create `apps/api/src/crawler/crawler.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AnomalyDetectorService } from './anomaly-detector.service';
import { CrawlSchedulerService } from './crawl-scheduler.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [AnomalyDetectorService, CrawlSchedulerService],
  exports: [AnomalyDetectorService, CrawlSchedulerService],
})
export class CrawlerModule {}
```

- [ ] **Step 2: Register CrawlerModule in AppModule**

Update `apps/api/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { CrawlerModule } from './crawler/crawler.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    CrawlerModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

- [ ] **Step 3: Run full test suite to confirm nothing broke**

```bash
cd apps/api && pnpm test
```
Expected: All existing tests PASS.

- [ ] **Step 4: Commit**

```bash
cd ../..
git add apps/api/src/crawler/crawler.module.ts apps/api/src/app.module.ts
git commit -m "feat: add CrawlerModule integrating AnomalyDetector and Scheduler"
```

---

### Task 12: Environment Validation + Smoke Test

**Files:**
- Create: `apps/api/src/config/env.validation.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/test/app.e2e-spec.ts`

- [ ] **Step 1: Install `joi` for env validation**

```bash
cd apps/api && pnpm add joi
```

- [ ] **Step 2: Create env validation schema**

Create `apps/api/src/config/env.validation.ts`:

```typescript
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  PORT: Joi.number().default(4000),
  APP_URL: Joi.string().uri().default('http://localhost:3000'),
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().optional().allow(''),
  SMTP_PASS: Joi.string().optional().allow(''),
  SMTP_FROM: Joi.string().email().default('noreply@gpls.vn'),
  OPENAI_API_KEY: Joi.string().optional().allow(''),
});
```

- [ ] **Step 3: Wire validation into AppModule**

Update `apps/api/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { CrawlerModule } from './crawler/crawler.module';
import { HealthController } from './health/health.controller';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { allowUnknown: true },
    }),
    DatabaseModule,
    CrawlerModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

- [ ] **Step 4: Run E2E smoke test**

```bash
cd apps/api && pnpm test:e2e
```
Expected: `PASS` — `GET /api/health` returns `{ status: 'ok' }`

- [ ] **Step 5: Verify full test suite passes**

```bash
pnpm test && pnpm test:e2e
```
Expected: All tests GREEN, no failures.

- [ ] **Step 6: Commit**

```bash
cd ../..
git add apps/api/src/config/ apps/api/src/app.module.ts
git commit -m "feat: add environment validation schema with Joi"
```

---

## Self-Review

**Spec Coverage Check:**

| Requirement | Covered by Task |
|------------|----------------|
| Monorepo with NestJS + Next.js | Task 1, 3, 4 |
| PostgreSQL schema for all releases | Task 5 |
| Global PrismaService | Task 6 |
| NestJS app bootstrap (CORS, validation) | Task 7 |
| AnomalyDetector (>15% deviation) — FR-01.6 | Task 8 |
| BaseCrawlerService with session tracking | Task 9 |
| Scheduler: 5-min cron, 07:00–17:00 gate — FR-01.2 | Task 10 |
| CrawlerModule wired to AppModule | Task 11 |
| Env validation | Task 12 |
| TanStack Query provider in Next.js | Task 4 |
| Shared types (GoldBrand, GoldType, DTOs) | Task 2 |

**Placeholder scan:** No TBD, no "implement later", all code blocks complete. ✓

**Type consistency:** `RawPriceData` defined in Task 9 and referenced in Task 9 only. `GoldBrand`/`GoldType` enums from Prisma used consistently in Tasks 8–10. ✓

---

Plan complete and saved to `docs/superpowers/plans/2026-05-12-plan-01-infrastructure.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — Fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session with checkpoints

**Which approach?**
