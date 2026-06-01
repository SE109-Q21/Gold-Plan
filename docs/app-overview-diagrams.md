# GoldPlan App Overview Diagrams

Tai lieu nay tom tat kien truc tong quat cua GoldPlan bang Mermaid diagrams. Cac so do duoc rut ra tu cau truc hien tai cua repo: Next.js web app, NestJS API, Prisma/PostgreSQL, crawler, realtime Socket.IO, auth, alerts, portfolio, AI va admin.

## 1. System Architecture

```mermaid
flowchart LR
  user["User browser"]
  adminUser["Admin browser"]
  serviceWorker["Service worker"]

  web["Next.js web app"]
  api["NestJS API"]
  shared["Shared TypeScript DTOs"]
  postgres["PostgreSQL database"]
  prisma["Prisma client"]
  socket["Socket.IO gateway"]
  eventBus["EventEmitter2"]

  crawlers["Gold crawlers SJC DOJI PNJ BAO_TIN"]
  externalGold["External gold and FX APIs"]
  smtp["SMTP provider"]
  pushProvider["Web Push provider"]
  openai["OpenAI API"]
  google["Google OAuth"]

  user --> web
  adminUser --> web
  web -->|"REST /api"| api
  web -->|"Socket.IO /ws"| socket
  web -->|"Push subscription"| serviceWorker
  web -.-> shared
  api -.-> shared

  api --> prisma
  prisma --> postgres
  api --> eventBus
  eventBus --> socket
  socket -->|"price updated, spread updated, arbitrage updated"| web

  crawlers -->|"scheduled crawl"| api
  api --> externalGold
  api --> smtp
  api --> pushProvider
  pushProvider --> serviceWorker
  api --> openai
  api --> google
```

## 2. Backend Module Map

```mermaid
flowchart TB
  appModule["AppModule"]

  platform["Platform modules"]
  coreMarket["Market data modules"]
  userFeatures["User feature modules"]
  intelligence["Intelligence modules"]
  adminOps["Admin and ops modules"]

  database["DatabaseModule"]
  auth["AuthModule"]
  users["UsersModule"]
  mail["MailModule"]
  push["PushModule"]
  realtime["RealtimeModule"]

  crawler["CrawlerModule"]
  price["PriceModule"]
  international["InternationalModule"]
  exchangeRate["ExchangeRateModule"]
  spread["SpreadModule"]
  arbitrage["ArbitrageModule"]
  assetsComparison["AssetsComparisonModule"]

  alerts["AlertsModule"]
  portfolio["PortfolioModule"]
  dca["DcaModule"]
  converter["ConverterModule"]
  forecast["ForecastModule"]
  personalisation["PersonalisationModule"]
  browsingHistory["BrowsingHistoryModule"]

  ai["AiModule"]
  digest["DigestModule"]

  admin["AdminModule"]
  health["HealthController"]

  appModule --> platform
  appModule --> coreMarket
  appModule --> userFeatures
  appModule --> intelligence
  appModule --> adminOps

  platform --> database
  platform --> auth
  platform --> users
  platform --> mail
  platform --> push
  platform --> realtime

  coreMarket --> crawler
  coreMarket --> price
  coreMarket --> international
  coreMarket --> exchangeRate
  coreMarket --> spread
  coreMarket --> arbitrage
  coreMarket --> assetsComparison

  userFeatures --> alerts
  userFeatures --> portfolio
  userFeatures --> dca
  userFeatures --> converter
  userFeatures --> forecast
  userFeatures --> personalisation
  userFeatures --> browsingHistory

  intelligence --> ai
  intelligence --> digest

  adminOps --> admin
  adminOps --> health
```

## 3. Price Data And Realtime Flow

```mermaid
sequenceDiagram
  participant Scheduler as CrawlScheduler
  participant Crawlers as Brand crawlers
  participant Detector as AnomalyDetector
  participant Price as PriceService
  participant Database as PostgreSQL
  participant Events as EventEmitter2
  participant Gateway as PriceGateway
  participant Web as Next.js client
  participant Alerts as AlertEvaluator
  participant Notify as Email and Web Push

  Scheduler->>Crawlers: Run active data sources
  Crawlers->>Detector: Normalize and validate prices
  Detector->>Price: Return accepted or anomalous records
  Price->>Database: Save CrawlSession and PriceRecord
  Price->>Events: Emit price.updated
  Events->>Gateway: Handle price.updated
  Gateway->>Web: Emit price:updated over Socket.IO
  Events->>Alerts: Evaluate active alert rules
  Alerts->>Database: Save trigger history
  Alerts->>Notify: Send email and push notifications
```

## 4. Frontend Data Flow

```mermaid
flowchart LR
  dashboard["DashboardShell and pages"]
  queryHooks["TanStack Query hooks"]
  apiClient["apiClient with auth refresh"]
  realtimeHook["useRealTimePrices"]
  authContext["AuthContext"]
  routeGuards["ProtectedRoute and admin layout"]

  overview["OverviewPage"]
  markets["MarketsPage"]
  portfolio["Portfolio pages"]
  tools["Tools pages"]
  admin["Admin pages"]

  dashboard --> overview
  dashboard --> markets
  dashboard --> portfolio
  dashboard --> tools
  dashboard --> admin

  overview --> queryHooks
  markets --> queryHooks
  portfolio --> queryHooks
  tools --> queryHooks
  admin --> queryHooks

  queryHooks --> apiClient
  realtimeHook -->|"updates query cache"| queryHooks
  authContext --> apiClient
  authContext --> routeGuards
  routeGuards --> portfolio
  routeGuards --> admin
```

## 5. Auth Flow

```mermaid
sequenceDiagram
  participant User as User
  participant Web as Next.js auth pages
  participant AuthContext as AuthContext
  participant Api as AuthController
  participant Jwt as JwtService
  participant Database as PostgreSQL
  participant Mail as MailService
  participant Google as Google OAuth

  User->>Web: Register or login
  Web->>Api: POST /auth/register or POST /auth/login
  Api->>Database: Create user or validate credentials
  Api->>Mail: Send verification or reset email when needed
  Api->>Jwt: Sign access and refresh tokens
  Api->>Web: Return access token and set refresh cookie
  Web->>AuthContext: Store session state

  User->>Web: Google login
  Web->>Google: Redirect to consent
  Google->>Api: GET /auth/google/callback
  Api->>Jwt: Create one time exchange token
  Web->>Api: POST /auth/oauth/exchange
  Api->>Web: Return app session
```

## 6. Core Domain ERD

```mermaid
erDiagram
  User ||--o{ PriceAlert : owns
  User ||--o{ PortfolioTransaction : records
  User ||--o{ UserPreference : customizes
  User ||--o{ ViewHistory : views
  User ||--o{ ForecastVote : votes
  User ||--o{ UserForecastScore : scores
  User ||--o{ SmartAlert : owns
  User ||--o{ PushSubscription : subscribes

  DataSource ||--o{ CrawlSession : runs
  CrawlSession ||--o{ PriceRecord : stores
  PriceRecord ||--o| AnomalyReview : reviewedBy

  PriceAlert ||--o{ AlertTriggerHistory : triggers
  ForecastSession ||--o{ ForecastVote : collects

  User {
    string id PK
    string email
    string role
    string status
    int tokenVersion
  }

  DataSource {
    string id PK
    string brand
    string url
    int frequencyMin
    boolean isActive
  }

  CrawlSession {
    string id PK
    string dataSourceId FK
    string status
    datetime startedAt
  }

  PriceRecord {
    string id PK
    string crawlSessionId FK
    string brand
    string goldType
    bigint buyPrice
    bigint sellPrice
    boolean isAnomalous
  }

  ExchangeRate {
    string id PK
    string fromCurrency
    string toCurrency
    decimal rate
    string source
  }

  PriceAlert {
    string id PK
    string userId FK
    string brand
    string goldType
    bigint thresholdPrice
    string status
  }

  PortfolioTransaction {
    string id PK
    string userId FK
    string type
    string brand
    string goldType
    decimal quantity
    bigint pricePerTael
  }

  ForecastSession {
    string id PK
    string date
    datetime opensAt
    datetime closesAt
    string actualResult
  }
```

## 7. Deployment View

```mermaid
flowchart LR
  github["GitHub repository"]
  vercel["Vercel web deployment"]
  railway["Railway API deployment"]
  railwayDb["Railway PostgreSQL"]
  browser["Browser"]

  github --> vercel
  github --> railway
  railway --> railwayDb
  browser -->|"HTTPS web"| vercel
  vercel -->|"NEXT_PUBLIC_API_URL"| railway
  browser -->|"Socket.IO /ws"| railway
```

## Quick Reading Guide

- Frontend entry point: `apps/web/src/app/page.tsx` renders the dashboard shell and feature pages.
- API entry point: `apps/api/src/app.module.ts` wires platform, market, user feature, intelligence, and admin modules.
- Shared DTO contract: `packages/shared/src/types`.
- Database model: `apps/api/prisma/schema.prisma`.
- Realtime bridge: `apps/api/src/realtime/price.gateway.ts` and `apps/web/src/lib/use-realtime-prices.ts`.
