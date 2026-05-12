# GPLS — Gold Price Lookup System

Nền tảng tra cứu giá vàng thời gian thực dành cho thị trường Việt Nam. Hiển thị giá vàng trong nước (SJC, DOJI, PNJ, BTMC), giá quốc tế XAU/USD, lịch sử biến động, so sánh thương hiệu và nhiều công cụ phân tích chuyên sâu.

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Backend | NestJS 11 · Prisma 7 · PostgreSQL |
| Frontend | Next.js 16 · React 19 · TanStack Query v5 |
| Shared types | TypeScript 5 (`packages/shared`) |
| Auth | JWT (access 24h + refresh 7d httpOnly cookie) · bcrypt |
| Email | Nodemailer (SMTP) |
| Charts | Recharts · Custom SVG |

## Cấu trúc dự án

```
gpls/
├── apps/
│   ├── api/          # NestJS REST API  (port 4000)
│   └── web/          # Next.js App Router (port 3000)
├── packages/
│   └── shared/       # Shared TypeScript types & DTOs
└── docs/
    └── superpowers/plans/  # Implementation plans (Plan 1–9)
```

## Yêu cầu môi trường

- **Node.js 22** (via nvm) — Prisma 7 yêu cầu ≥20.9, Next.js 16 yêu cầu ≥20.9
- **pnpm 9+**
- **PostgreSQL 16** (chạy qua Docker hoặc local)

## Khởi động nhanh

### 1. Cài đặt dependencies

```bash
pnpm install
```

### 2. Khởi động PostgreSQL

```bash
docker run -d \
  --name gpls_postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=gpls_dev \
  -p 5432:5432 \
  postgres:16-alpine
```

### 3. Tạo file `.env` cho API

```bash
cp apps/api/.env.example apps/api/.env
```

Nội dung tối thiểu:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gpls_dev"
JWT_SECRET="change-this-to-a-random-32-char-string!!"
JWT_REFRESH_SECRET="another-random-32-char-string-here!!"
APP_URL="http://localhost:3000"
PORT=4000

# SMTP (tuỳ chọn — bỏ trống để bỏ qua gửi email khi dev)
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
```

### 4. Chạy migrations

```bash
pnpm --filter api prisma migrate dev
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
| `JWT_SECRET` | ✅ | ≥32 ký tự, dùng cho access token |
| `JWT_REFRESH_SECRET` | ✅ | ≥32 ký tự, dùng cho refresh token |
| `APP_URL` | ✅ | URL frontend (cho CORS & email links) |
| `PORT` | | Default: `4000` |
| `SMTP_HOST` | | SMTP server (bỏ trống → không gửi email) |
| `SMTP_PORT` | | Default: `587` |
| `SMTP_USER` | | SMTP username |
| `SMTP_PASS` | | SMTP password |
| `SMTP_FROM` | | Default: `noreply@gpls.vn` |
| `GOLD_API_KEY` | | API key cho gold price API |
| `EXCHANGE_RATE_API_KEY` | | API key cho exchange rate |
| `OPENAI_API_KEY` | | Dùng cho AI Assistant (Plan 8) |

### `apps/web/.env.local`

| Biến | Mô tả |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL của API backend (default: `http://localhost:4000/api`) |

## Scripts

```bash
# Chạy toàn bộ monorepo
pnpm dev           # dev servers song song
pnpm build         # build tất cả
pnpm test          # chạy toàn bộ test suite

# Chỉ API
pnpm --filter api dev
pnpm --filter api test
pnpm --filter api prisma studio

# Chỉ Web
pnpm --filter web dev
pnpm --filter web build
```

## Trạng thái triển khai (Plans)

| Plan | Tên | Trạng thái |
|---|---|---|
| Plan 1 | Infrastructure (monorepo, Prisma, base crawlers) | ✅ Hoàn thành |
| Plan 2 | Price Core — M01–M04 (domestic prices, international, history, comparison) | ✅ Hoàn thành |
| Plan 3 | Exchange Rate, Converter & Spread Dashboard (M05, F08, F11) | ⬜ Chưa bắt đầu |
| Plan 4 | Analytics Widgets — Market Heat Index & DCA Simulator (F03, F06) | ⬜ Chưa bắt đầu |
| Plan 5 | User Authentication — M06 (register, login, JWT, email verification) | ✅ Hoàn thành |
| Plan 6 | Price Alerts & Admin Dashboard — M07, M08 | ⬜ Chưa bắt đầu |
| Plan 7 | R2 User Features — Portfolio, Personalization, Browsing History | ⬜ Chưa bắt đầu |
| Plan 8 | R2 Intelligence — AI Assistant, Morning Digest, Smart Alerts | ⬜ Chưa bắt đầu |
| Plan 9 | R3 Community — Forecast, Extended Charts, CSV Export | ⬜ Chưa bắt đầu |

Chi tiết từng plan: [`docs/superpowers/plans/`](docs/superpowers/plans/)

## API Endpoints (hiện có)

### Auth — `/api/auth`
| Method | Path | Mô tả |
|---|---|---|
| POST | `/register` | Đăng ký tài khoản |
| POST | `/verify-email` | Xác thực email |
| POST | `/login` | Đăng nhập, trả về JWT |
| POST | `/refresh` | Làm mới access token |
| POST | `/logout` | Đăng xuất |
| POST | `/forgot-password` | Yêu cầu reset mật khẩu |
| POST | `/reset-password` | Đặt lại mật khẩu |

### Users — `/api/users`
| Method | Path | Mô tả |
|---|---|---|
| GET | `/me` | Lấy thông tin tài khoản |
| PATCH | `/me` | Cập nhật profile |
| POST | `/me/change-password` | Đổi mật khẩu |
| DELETE | `/me` | Xoá tài khoản |

### Prices — `/api/prices`
| Method | Path | Mô tả |
|---|---|---|
| GET | `/domestic` | Giá vàng trong nước hiện tại |
| GET | `/history` | Lịch sử giá (1D/1W/1M) |
| GET | `/comparison` | So sánh giá các thương hiệu |

### International — `/api/international`
| Method | Path | Mô tả |
|---|---|---|
| GET | `/price` | Giá XAU/USD quốc tế |

## Design System

Giao diện dark-mode theo phong cách fintech. CSS variables chính:

```css
--gold:    #D4AF37   /* Brand accent */
--ink:     #0B0B0F   /* Background sâu nhất */
--ink-2:   #14141A   /* Surface chính */
--chalk:   #F5F0E6   /* Text chính */
--up:      #58C896   /* Màu tăng giá */
--down:    #E5484D   /* Màu giảm giá */
--live:    #9DCC6E   /* Chỉ báo live */
```

Font: **Bricolage Grotesque** (display) + **JetBrains Mono** (mono)

## Đóng góp & Phát triển

Dự án sử dụng SRS v2.0 làm tài liệu yêu cầu chính thức (`GPLS_New_Features_SRS_v2 (1).pdf`). Mọi tính năng mới cần được đặc tả trong plan tương ứng trước khi triển khai.

---

**Nhóm 14** · GPLS v2.0 · 2026
