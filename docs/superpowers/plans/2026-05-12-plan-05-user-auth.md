# GPLS Plan 5 — User Authentication (M06)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement M06 — full user authentication: registration with email verification, login with JWT + refresh token, password reset, brute-force lockout, password change, and account deletion. This unlocks all R2 features that require Registered User status.

**Architecture:**
- `AuthModule` (NestJS): `AuthService` (register, login, refresh, logout, verifyEmail, forgotPassword, resetPassword, changePassword, deleteAccount), `AuthController`, JWT strategy, rate-limiter guard.
- `UserModule`: `UserService` (CRUD for user records), `UsersController` (get profile, update, delete).
- Emails via `MailModule` wrapping Nodemailer (or a transactional email provider).
- Frontend: `/auth/register`, `/auth/login`, `/auth/verify-email`, `/auth/forgot-password`, `/auth/reset-password` pages + `AuthContext` + protected route wrapper.

**Tech Stack:** NestJS 11 · Prisma 7 · `@nestjs/jwt` · `@nestjs/passport` · `passport-jwt` · `bcrypt` · `nodemailer` · `@nestjs/throttler` · Next.js 15 App Router · React context · TypeScript 5

**Depends on:** Plan 1 (infrastructure), Plan 2 (Prisma schema — User model additions)

**SRS Coverage:** M06 (FR-06.1–FR-06.9, FR-06.10), NFR-S01–S07

---

## File Map

```
apps/api/src/
├── auth/
│   ├── auth.module.ts                   NEW
│   ├── auth.service.ts                  NEW  register/login/refresh/verify/reset/change/delete
│   ├── auth.controller.ts               NEW  POST /auth/*
│   ├── auth.service.spec.ts             NEW
│   ├── strategies/
│   │   ├── jwt.strategy.ts              NEW  validate JWT from Authorization header
│   │   └── jwt-refresh.strategy.ts      NEW  validate refresh token from httpOnly cookie
│   ├── guards/
│   │   ├── jwt-auth.guard.ts            NEW  @UseGuards(JwtAuthGuard) on protected endpoints
│   │   └── roles.guard.ts               NEW  @Roles('admin') guard
│   ├── decorators/
│   │   ├── current-user.decorator.ts    NEW  @CurrentUser() → UserPayload from JWT
│   │   └── roles.decorator.ts           NEW  @Roles() metadata decorator
│   └── dto/
│       ├── register.dto.ts              NEW
│       ├── login.dto.ts                 NEW
│       ├── verify-email.dto.ts          NEW
│       ├── forgot-password.dto.ts       NEW
│       ├── reset-password.dto.ts        NEW
│       └── change-password.dto.ts       NEW
├── users/
│   ├── users.module.ts                  NEW
│   ├── users.service.ts                 NEW  findById, findByEmail, update, softDelete
│   └── users.controller.ts             NEW  GET/PATCH/DELETE /users/me
├── mail/
│   ├── mail.module.ts                   NEW  global module
│   ├── mail.service.ts                  NEW  sendVerification, sendPasswordReset
│   └── templates/
│       ├── verify-email.html            NEW  inline-styled HTML email
│       └── reset-password.html          NEW

apps/api/prisma/
└── schema.prisma                        MODIFY  User, EmailVerification, PasswordResetToken, LoginAttempt models

apps/web/src/
├── contexts/
│   └── auth-context.tsx                 NEW  AuthContext: user, login(), logout(), loading
├── lib/
│   └── auth.api.ts                      NEW  register/login/logout/me fetch functions + hooks
├── components/
│   └── ProtectedRoute.tsx               NEW  redirect to /auth/login if not authenticated
└── app/auth/
    ├── register/page.tsx                NEW
    ├── login/page.tsx                   NEW
    ├── verify-email/page.tsx            NEW  reads ?token= from URL
    ├── forgot-password/page.tsx         NEW
    └── reset-password/page.tsx          NEW  reads ?token= from URL
```

---

## Tasks

### Task 1 — Prisma Schema: Auth Models
- [ ] Extend `User` model:
  ```prisma
  model User {
    id                String    @id @default(cuid())
    email             String    @unique
    passwordHash      String
    role              UserRole  @default(USER)
    status            UserStatus @default(PENDING)  // PENDING | ACTIVE | LOCKED | DELETED
    emailVerifiedAt   DateTime?
    lockedUntil       DateTime?
    deletedAt         DateTime?
    createdAt         DateTime  @default(now())
    updatedAt         DateTime  @updatedAt
    emailVerifications EmailVerification[]
    passwordResets     PasswordResetToken[]
    loginAttempts      LoginAttempt[]
  }
  enum UserRole   { USER ADMIN }
  enum UserStatus { PENDING ACTIVE LOCKED DELETED }
  ```
- [ ] Add `EmailVerification`, `PasswordResetToken`, `LoginAttempt` models:
  ```prisma
  model EmailVerification {
    id        String   @id @default(cuid())
    userId    String
    token     String   @unique
    expiresAt DateTime
    usedAt    DateTime?
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  }
  model PasswordResetToken {
    id        String   @id @default(cuid())
    userId    String
    token     String   @unique
    expiresAt DateTime
    usedAt    DateTime?
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  }
  model LoginAttempt {
    id          String   @id @default(cuid())
    userId      String
    attemptedAt DateTime @default(now())
    success     Boolean
    user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    @@index([userId, attemptedAt])
  }
  ```
- [ ] Run migration: `pnpm --filter api prisma migrate dev --name add-auth-models`

### Task 2 — MailService
- [ ] `mail.service.ts` using Nodemailer with SMTP credentials from env (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`)
- [ ] `sendVerification(email, token)`: sends link `${APP_URL}/auth/verify-email?token=${token}` valid 24h
- [ ] `sendPasswordReset(email, token)`: sends link `${APP_URL}/auth/reset-password?token=${token}` valid 1h
- [ ] Add env vars to `env.validation.ts` with `Joi.string().required()` for SMTP settings

### Task 3 — AuthService
- [ ] `register(dto)`:
  - Check email uniqueness → throw 409 if exists
  - Hash password with bcrypt salt rounds 10 (NFR-S01)
  - Create `User` with status=PENDING + create `EmailVerification` (24h expiry)
  - Send verification email via MailService
- [ ] `verifyEmail(token)`:
  - Find token; throw 400 if expired or already used
  - Set `user.status = ACTIVE`, `emailVerifiedAt = now()`, mark token `usedAt`
- [ ] `login(email, password)`:
  - Check user exists and status = ACTIVE
  - Count failed attempts in last 15 min; if ≥5 → throw 429 with remaining lockout time (NFR-S04)
  - Compare bcrypt; on failure: record `LoginAttempt(success=false)`
  - On success: record `LoginAttempt(success=true)`; issue `accessToken` (JWT 24h) + `refreshToken` (JWT 7d, set in httpOnly cookie via `res.cookie()`)
- [ ] `refresh(refreshToken)`: validate refresh JWT → issue new access token
- [ ] `logout(res)`: clear refresh token cookie
- [ ] `forgotPassword(email)`: create `PasswordResetToken` (1h); send email (silently succeed even if email not found — prevent enumeration)
- [ ] `resetPassword(token, newPassword)`: validate token; hash new password; mark token used; clear all active sessions
- [ ] `changePassword(userId, oldPassword, newPassword)`: validate old password; hash new password
- [ ] `deleteAccount(userId)`: soft delete — set `status=DELETED`, `deletedAt=now()` (NFR-S05, FR-06.10)
- [ ] Password policy validation (8+ chars, 1 uppercase, 1 digit) via DTO + custom validator

### Task 4 — JWT Strategies & Guards
- [ ] `JwtStrategy`: extract `Authorization: Bearer <token>`; validate; return `{ sub: userId, email, role }`
- [ ] `JwtRefreshStrategy`: extract from `refreshToken` cookie; validate
- [ ] `JwtAuthGuard`: extends `AuthGuard('jwt')`; used on protected endpoints
- [ ] `RolesGuard` + `@Roles('admin')` decorator: checks `req.user.role`
- [ ] Configure `JwtModule.registerAsync()` from `ConfigService` (`JWT_SECRET`, `JWT_EXPIRES_IN=24h`)
- [ ] Configure `ThrottlerModule` — global rate limiter: 100 req/min per IP; auth endpoints: 10 req/min

### Task 5 — AuthController
- [ ] `POST /auth/register` → 201 `{ message: 'Verification email sent' }`
- [ ] `POST /auth/verify-email` body `{ token }` → 200 `{ message: 'Email verified' }`
- [ ] `POST /auth/login` → 200 `{ accessToken, user: { id, email, role } }` + set httpOnly cookie
- [ ] `POST /auth/refresh` (reads cookie) → 200 `{ accessToken }`
- [ ] `POST /auth/logout` → 200; clears cookie
- [ ] `POST /auth/forgot-password` body `{ email }` → 200 (always)
- [ ] `POST /auth/reset-password` body `{ token, password }` → 200
- [ ] Unit tests: register happy path, duplicate email 409, login lockout after 5 failures, expired verification token

### Task 6 — UsersController
- [ ] `GET /users/me` (JwtAuthGuard) → user profile (exclude passwordHash)
- [ ] `PATCH /users/me` (JwtAuthGuard) → update display name / notification preferences
- [ ] `POST /users/me/change-password` (JwtAuthGuard)
- [ ] `DELETE /users/me` (JwtAuthGuard) → soft delete + logout

### Task 7 — Frontend: AuthContext
- [ ] `apps/web/src/contexts/auth-context.tsx`:
  - `useAuth()` hook exposing `{ user, isLoading, login(), logout(), register() }`
  - On mount: `GET /users/me` with stored access token; refresh silently via `/auth/refresh` on 401
  - Token stored in memory (not localStorage — security); refresh token in httpOnly cookie
  - Wrap `apps/web/src/app/layout.tsx` with `<AuthProvider>`

### Task 8 — Frontend: Auth Pages
- [ ] `/auth/register/page.tsx`: email + password + confirm password form; client-side policy validation; show "Check your email" on success
- [ ] `/auth/login/page.tsx`: email + password; show lockout countdown if 429; redirect to `/` on success
- [ ] `/auth/verify-email/page.tsx`: on mount POST token from query param; show success/error/expired+resend
- [ ] `/auth/forgot-password/page.tsx`: email input; show "If that email exists, you'll receive a reset link"
- [ ] `/auth/reset-password/page.tsx`: new password + confirm; validates policy client-side; redirect to login on success
- [ ] All pages: match dark GoldTracker design system (use `--gold`, `--ink`, `gt-btn--primary` etc.)

### Task 9 — Frontend: ProtectedRoute + Navbar Integration
- [ ] `apps/web/src/components/ProtectedRoute.tsx`: if `!user && !isLoading` → redirect to `/auth/login`
- [ ] Update `DashboardShell.tsx`: show "Log in" button in sidebar bottom when unauthenticated; show avatar + email when authenticated
- [ ] Account page (`AccountPage.tsx`): wire "Change Password" and "Delete Account" forms to real API endpoints

### Task 10 — Acceptance Checks
- [ ] Register → receive email → verify → login succeeds
- [ ] Register with same email → 409
- [ ] Verify with expired token → 400 + resend button shown
- [ ] 5 failed logins → 429 with lockout message; 6th attempt still blocked
- [ ] `POST /auth/forgot-password` with unknown email → 200 (no enumeration)
- [ ] Reset password → old password no longer works, new one does
- [ ] `DELETE /users/me` → subsequent login returns 401
- [ ] `pnpm --filter web build` zero TS errors
