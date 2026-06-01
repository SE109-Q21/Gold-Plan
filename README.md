# GoldPlan — Nền tảng theo dõi giá vàng thời gian thực

[![CI](https://github.com/your-username/goldplan/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/goldplan/actions/workflows/ci.yml)

Nền tảng tra cứu và phân tích giá vàng Việt Nam với **real-time WebSocket**, portfolio tracker, smart alerts và AI assistant.

---

## Tính năng

| Tính năng | Mô tả |
|---|---|
| **Real-time prices** | Giá vàng SJC, DOJI, PNJ, BTMC cập nhật qua WebSocket mỗi 5 phút |
| **Smart Alerts** | Điều kiện TREND / SPREAD / THRESHOLD → email + Web Push Notification |
| **Portfolio Tracker** | Theo dõi lãi/lỗ, biểu đồ P&L, donut phân bổ theo thương hiệu/loại vàng |
| **AI Assistant** | Phân tích thị trường vàng, giới hạn 10 câu/ngày cho guest (OpenAI GPT) |
| **DCA Simulator** | Mô phỏng chiến lược mua dần đều (Dollar-Cost Averaging) |
| **Arbitrage** | Phát hiện chênh lệch giá mua/bán giữa các thương hiệu |
| **Assets Comparison** | So sánh hiệu suất vàng vs. các loại tài sản khác |
| **Forecast Community** | Dự đoán xu hướng, bảng xếp hạng độ chính xác |
| **Daily Digest** | Email tóm tắt thị trường hàng ngày (AI-generated) |
| **Converter** | Quy đổi VND ↔ lượng vàng theo giá thị trường thời gian thực |
| **Personalisation** | Ghim thương hiệu yêu thích, lịch sử xem |
| **Admin Panel** | Audit log, anomaly detection, thống kê theo kỳ |

---

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Backend | NestJS 11 · Prisma 7 · PostgreSQL 16 |
| Real-time | WebSocket (Socket.IO) · EventEmitter2 |
| Frontend | Next.js 16 · React 19 · TanStack Query v5 |
| Shared types | TypeScript 5 (`packages/shared`) |
| Auth | JWT access/refresh · Google OAuth 2.0 · bcrypt |
| Push | Web Push API (VAPID) · Service Worker |
| Email | Nodemailer (SMTP) |
| Charts | Custom SVG |
| CI/CD | GitHub Actions → Railway (API) + Vercel (web) |

---

## Architecture

```
Crawlers (SJC · DOJI · PNJ · BTMC — 5 phút/lần)
    │
    ▼
PriceRecord (PostgreSQL)
    │
    ├──► EventEmitter2 ──► PriceGateway (WebSocket) ──► Browser (live update)
    │
    ├──► AlertEvaluator ──► Email + Web Push ──► Service Worker ──► Notification
    │
    └──► DigestService ──► AI summary ──► Email hàng ngày
```

---

## Cấu trúc dự án

```
goldplan/
├── apps/
│   ├── api/                  # NestJS REST + WebSocket API  (port 4000)
│   │   └── src/
│   │       ├── auth/         # JWT, Google OAuth, password reset
│   │       ├── price/        # Giá trong nước, lịch sử, export CSV
│   │       ├── crawler/      # SJC · DOJI · PNJ · BTMC crawlers
│   │       ├── alerts/       # Smart alerts engine
│   │       ├── portfolio/    # Portfolio tracker
│   │       ├── dca/          # DCA simulator
│   │       ├── forecast/     # Community forecast + voting
│   │       ├── ai/           # AI chat assistant
│   │       ├── digest/       # Daily email digest
│   │       ├── arbitrage/    # Chênh lệch giá
│   │       ├── converter/    # VND ↔ vàng converter
│   │       └── realtime/     # WebSocket gateway
│   └── web/                  # Next.js App Router  (port 3000)
├── packages/
│   └── shared/               # Shared TypeScript types & DTOs
├── docker-compose.yml        # Production Docker Compose
├── docker-compose.dev.yml    # Dev Docker Compose (DB only)
├── railway.toml              # Railway deployment config
└── vercel.json               # Vercel deployment config
```

---

## Yêu cầu môi trường

- **Node.js 22** (xem `.nvmrc`) — Prisma 7 yêu cầu ≥ 20.9
- **pnpm 10+**
- **PostgreSQL 16**

---

## Khởi động nhanh

### 1. Cài đặt dependencies

```bash
pnpm install
```

### 2. Khởi động PostgreSQL

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 3. Cấu hình môi trường

```bash
cp .env.example .env
# Chỉnh sửa .env theo bảng biến bên dưới
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

---

## Biến môi trường

### Backend — `apps/api/.env` (hoặc root `.env`)

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | ≥ 32 ký tự ngẫu nhiên — ký access token |
| `JWT_REFRESH_SECRET` | ✅ | ≥ 32 ký tự ngẫu nhiên — ký refresh token |
| `JWT_EXPIRES_IN` | | Default: `24h` |
| `APP_URL` | ✅ | URL frontend, dùng cho CORS và link trong email (vd: `https://gpls.vn`) |
| `WEB_URL` | ✅ | Giống `APP_URL` — dùng riêng cho OAuth callback redirect |
| `ALLOWED_ORIGINS` | | CORS whitelist, cách nhau bằng dấu phẩy (default: `APP_URL`) |
| `PORT` | | Default: `4000` |
| `SMTP_HOST` | | SMTP server — bỏ trống để tắt email |
| `SMTP_PORT` | | Default: `587` |
| `SMTP_USER` | | SMTP username |
| `SMTP_PASS` | | SMTP password |
| `SMTP_FROM` | | Địa chỉ người gửi (vd: `noreply@gpls.vn`) |
| `VAPID_PUBLIC_KEY` | | Web Push public key |
| `VAPID_PRIVATE_KEY` | | Web Push private key |
| `VAPID_EMAIL` | | Email liên hệ cho VAPID |
| `GOLD_API_KEY` | | [goldapi.io](https://goldapi.io) — giá vàng quốc tế XAU/USD |
| `BTMC_API_KEY` | | Key API của BTMC (Bảo Tín Minh Châu) |
| `OPENAI_API_KEY` | | OpenAI — AI Assistant + Daily Digest |
| `GOOGLE_CLIENT_ID` | | Google OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | | Google OAuth 2.0 Client Secret |

Tạo VAPID keys:

```bash
node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log(k)"
```

### Frontend — `apps/web/.env.local`

| Biến | Mô tả |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL đầy đủ của API (vd: `https://api.gpls.vn/api`) — default: `http://localhost:4000/api` |
| `NEXT_PUBLIC_VAPID_KEY` | VAPID public key (giống giá trị phía API) |

---

## Deploy

### Railway (API + Database)

1. Kết nối repository tại [railway.app](https://railway.app)
2. Thêm PostgreSQL service
3. Set tất cả env vars theo bảng trên
4. Deploy — `railway.toml` đã cấu hình sẵn build + start commands

### Vercel (Frontend)

1. Import repository tại [vercel.com](https://vercel.com)
2. Set `NEXT_PUBLIC_API_URL` = URL Railway API (vd: `https://api.gpls.vn/api`)
3. Set `NEXT_PUBLIC_VAPID_KEY` = VAPID public key
4. Deploy — `vercel.json` đã cấu hình sẵn

---

## Scripts

```bash
# Monorepo
pnpm dev              # Chạy API + web song song
pnpm build            # Build tất cả packages
pnpm test             # Chạy toàn bộ test suite

# API
pnpm --filter api start:dev
pnpm --filter api test
pnpm --filter api prisma studio
pnpm --filter api prisma migrate dev

# Web
pnpm --filter web dev
pnpm --filter web build
```

---

## Design System

Dark-mode fintech aesthetic. CSS variables chính:

```css
--gold:   #D4AF37   /* Brand accent */
--ink:    #0B0B0F   /* Background */
--chalk:  #F5F0E6   /* Primary text */
--up:     #58C896   /* Tăng giá */
--down:   #E5484D   /* Giảm giá */
--live:   #9DCC6E   /* Live indicator */
```

Font: **Bricolage Grotesque** (display) · **JetBrains Mono** (mono)

---

## Bảo mật

- Access token JWT (24h) — không bao giờ lưu trong `localStorage`
- Refresh token (7 ngày) — `httpOnly` cookie, không đọc được từ JavaScript
- Google OAuth sử dụng one-time code exchange (token không xuất hiện trong URL hay server logs)
- Đổi/reset mật khẩu tự động vô hiệu hóa tất cả session hiện có (`tokenVersion`)
- Login rate-limit: 5 lần thất bại / 15 phút
- Tất cả endpoint có mutation đều qua `ValidationPipe` với `whitelist: true`

---

**GoldPlan v2.0** · Full-stack portfolio project · 2026
