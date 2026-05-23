# GoldPlan — Nền tảng theo dõi giá vàng thời gian thực

[![CI](https://github.com/your-username/goldplan/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/goldplan/actions/workflows/ci.yml)

Nền tảng tra cứu và phân tích giá vàng Việt Nam với **real-time WebSocket**, portfolio tracker, smart alerts và AI assistant.

## Tính năng nổi bật

- **Real-time prices** — giá vàng SJC, DOJI, PNJ, BTMC cập nhật qua WebSocket mỗi 5 phút, không cần refresh
- **Smart Alerts** — thiết lập điều kiện phức tạp (TREND / SPREAD / THRESHOLD), nhận email + push notification khi điều kiện khớp
- **Portfolio tracker** — theo dõi lãi/lỗ theo giá thị trường, biểu đồ donut phân bổ
- **AI Assistant** — phân tích thị trường, trả lời câu hỏi về vàng (OpenAI)
- **Forecast Community** — dự đoán xu hướng, bảng xếp hạng độ chính xác
- **Admin Panel** — audit log, anomaly detection, thống kê theo kỳ
- **Web Push Notifications** — nhận cảnh báo ngay cả khi đóng tab

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Backend | NestJS 11 · Prisma 7 · PostgreSQL 16 |
| Real-time | WebSocket (Socket.IO) · EventEmitter2 |
| Frontend | Next.js 16 · React 19 · TanStack Query v5 |
| Push | Web Push API (VAPID) · Service Worker |
| Shared types | TypeScript 5 (`packages/shared`) |
| Auth | JWT access/refresh · Google OAuth 2.0 · bcrypt |
| Email | Nodemailer (SMTP) |
| Charts | Recharts · Custom SVG |
| CI/CD | GitHub Actions → Railway (API) + Vercel (web) |

## Architecture

```
Crawlers (4 nguồn, 5 phút/lần)
    │
    ▼
PriceRecord (PostgreSQL)
    │
    ├──► EventEmitter2 ──► PriceGateway (WebSocket) ──► Browser (live update)
    │
    └──► AlertEvaluator ──► Email + Web Push ──► Service Worker ──► Notification
```

## Cấu trúc dự án

```
goldplan/
├── apps/
│   ├── api/          # NestJS REST + WebSocket API  (port 4000)
│   └── web/          # Next.js App Router            (port 3000)
├── packages/
│   └── shared/       # Shared TypeScript types & DTOs
├── .github/
│   └── workflows/ci.yml  # GitHub Actions CI pipeline
└── railway.toml          # Railway deployment config
```

## Yêu cầu môi trường

- **Node.js 22** (via nvm) — Prisma 7 yêu cầu ≥20.9
- **pnpm 10+**
- **PostgreSQL 16** (Docker hoặc local)

## Khởi động nhanh

### 1. Cài đặt dependencies

```bash
pnpm install
```

### 2. Khởi động PostgreSQL

```bash
docker compose up -d db
```

### 3. Cấu hình môi trường

```bash
# Tạo file .env cho API (xem bảng biến môi trường bên dưới)
cp apps/api/.env.example apps/api/.env
```

### 4. Chạy migrations + seed

```bash
nvm use 22
pnpm --filter api prisma migrate dev
pnpm --filter api seed
```

### 5. Khởi động dev servers

```bash
pnpm dev
```

- API: `http://localhost:4000/api`  
- Web: `http://localhost:3000`

## Biến môi trường

### `apps/api/.env`

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | ≥32 ký tự, access token |
| `JWT_REFRESH_SECRET` | ✅ | ≥32 ký tự, refresh token |
| `APP_URL` | ✅ | URL frontend (CORS & email links) |
| `PORT` | | Default: `4000` |
| `SMTP_HOST` | | SMTP server (bỏ trống → bỏ qua email) |
| `SMTP_USER` / `SMTP_PASS` | | SMTP credentials |
| `VAPID_PUBLIC_KEY` | | Web Push public key |
| `VAPID_PRIVATE_KEY` | | Web Push private key |
| `VAPID_EMAIL` | | Email cho VAPID contact |
| `GOLD_API_KEY` | | goldapi.io (giá quốc tế) |
| `EXCHANGE_RATE_API_KEY` | | exchangerate-api.com (tỷ giá) |
| `OPENAI_API_KEY` | | AI Assistant |
| `GOOGLE_CLIENT_ID/SECRET` | | Google OAuth |

Tạo VAPID keys:
```bash
node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log(k)"
```

### `apps/web/.env.local`

| Biến | Mô tả |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL API (default: `http://localhost:4000/api`) |
| `NEXT_PUBLIC_VAPID_KEY` | VAPID public key (cùng giá trị với API) |

## Deploy

### Railway (API + Database)

1. Kết nối repository tại [railway.app](https://railway.app)
2. Thêm PostgreSQL service
3. Set env vars (xem bảng trên)
4. Deploy — `railway.toml` đã cấu hình sẵn build + start commands

### Vercel (Frontend)

1. Import repository tại [vercel.com](https://vercel.com)
2. Set `NEXT_PUBLIC_API_URL` = URL Railway API của bạn
3. Set `NEXT_PUBLIC_VAPID_KEY` = VAPID public key
4. Deploy — `vercel.json` đã cấu hình sẵn

## Scripts

```bash
# Monorepo
pnpm dev           # dev servers song song (API + web)
pnpm build         # build tất cả
pnpm test          # chạy toàn bộ test suite

# API
pnpm --filter api start:dev
pnpm --filter api test
pnpm --filter api prisma studio

# Web
pnpm --filter web dev
pnpm --filter web test
```

## Design System

Dark-mode fintech aesthetic. CSS variables chính:

```css
--gold:    #D4AF37   /* Brand accent */
--ink:     #0B0B0F   /* Background */
--chalk:   #F5F0E6   /* Text */
--up:      #58C896   /* Tăng giá */
--down:    #E5484D   /* Giảm giá */
--live:    #9DCC6E   /* Live indicator */
```

Font: **Bricolage Grotesque** · **JetBrains Mono**

---

**GoldPlan v2.0** · Full-stack portfolio project · 2026
