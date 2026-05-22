# Test Coverage Matrix

## Repository scan summary
- Backend: NestJS REST API with global `/api` prefix.
- Frontend: Next.js App Router with React Query and an Auth context.
- Tests: Jest for backend (`*.spec.ts`) and e2e (`apps/api/test`). No frontend test runner config found.
- Package manager: pnpm workspace + Turborepo.
- Database: Prisma + PostgreSQL; seed script at `apps/api/prisma/seed.ts`.

## Backend API
| Module | Function / endpoint / component | Test type | Happy path cases | Failure cases | Edge cases | Suggested test file location | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| App/Health | GET /api/health | e2e | returns `{status:"ok"}` | none | none | apps/api/test/app.e2e-spec.ts | High |
| App | GET /api | unit | returns "Hello World!" | none | none | apps/api/src/app.controller.spec.ts | Low |
| Auth | POST /api/auth/register | integration | creates user; creates email verification; returns 201 | email exists; validation error | SMTP disabled still returns success | apps/api/src/auth/auth.service.spec.ts | High |
| Auth | POST /api/auth/verify-email | integration | activates user; marks token used | invalid or expired token | already-used token | apps/api/src/auth/auth.service.spec.ts | High |
| Auth | POST /api/auth/login | integration | returns access token; sets refresh cookie; records login attempt | wrong creds; pending/locked; social login without password; rate limit 429 | refresh cookie path `/api/auth/refresh` | apps/api/src/auth/auth.service.spec.ts | High |
| Auth | POST /api/auth/refresh and POST /api/auth/logout | integration | refresh returns new token; logout clears cookie | missing/invalid token; inactive user | cookie path and sameSite/secure flags | apps/api/src/auth/auth.service.spec.ts | High |
| Auth | POST /api/auth/forgot-password and POST /api/auth/reset-password | integration | forgot returns safe response; reset updates password | invalid/expired/used token | forgot does not leak existence | apps/api/src/auth/auth.service.spec.ts | High |
| Auth | GET /api/auth/google and GET /api/auth/google/callback | integration | callback issues tokens and redirects | guard denies access | pending user auto-activates | apps/api/src/auth/auth.service.spec.ts | Medium |
| Users | GET /api/users/me and PATCH /api/users/me | integration | returns profile; updates display name | missing/invalid JWT; user not found | soft-deleted user | apps/api/src/users/users.service.ts | High |
| Users | POST /api/users/me/change-password | integration | updates password | wrong old password; social login account; user not found | new password equals old | apps/api/src/auth/auth.service.spec.ts | High |
| Users | DELETE /api/users/me | integration | marks user deleted; clears refresh cookie | missing/invalid JWT | repeated delete | apps/api/src/auth/auth.service.spec.ts | High |
| Prices | GET /api/prices/domestic | e2e | returns grouped latest prices with status and changePercent | none | empty data; changePercent null; status live/recent/outdated | apps/api/test/price.e2e-spec.ts | High |
| Prices | GET /api/prices/history and GET /api/prices/history/export | integration | returns chart points; CSV export with headers | auth required for export | thinning and large range behavior | apps/api/src/price/price.service.spec.ts | High |
| Prices | GET /api/prices/comparison | e2e | flags best buy/sell per brand | none | empty brands array | apps/api/test/price.e2e-spec.ts | High |
| Prices | GET /api/prices/international | integration | returns cached or live values | API fetch errors | fallback when API keys missing | apps/api/src/international/international.service.spec.ts | Medium |
| Exchange Rate | GET /api/exchange-rate/rates | integration | returns live rates | API fetch errors | stale or fallback response | apps/api/src/exchange-rate/exchange-rate.service.spec.ts | Medium |
| Converter | GET /api/converter/calculate | integration | converts weights and currency | validation error | fallback price if no current price | apps/api/src/converter/converter.service.spec.ts | Medium |
| Spread | GET /api/spread/ranking and GET /api/spread/history | integration | returns ranking and history points | none | skip zero prices; default days=7 | apps/api/src/spread/spread.service.spec.ts | Medium |
| Heat Index | GET /api/heat-index/current and GET /api/heat-index/history | integration | returns latest or computed index; history list | none | compute when stale; empty history | apps/api/src/heat-index/heat-index.service.spec.ts | Medium |
| Alerts | GET /api/alerts, POST /api/alerts, PATCH /api/alerts/:id, PATCH /api/alerts/:id/toggle, DELETE /api/alerts/:id | integration | CRUD for user alerts | ownership violations; threshold below min; max active reached | toggle from triggered to active; repeatMode behavior | apps/api/src/alerts/alerts.service.spec.ts | High |
| Alerts | GET /api/alerts/history | integration | returns paginated history | missing/invalid JWT | empty history | apps/api/src/alerts/alerts.service.spec.ts | Medium |
| Smart Alerts | GET /api/smart-alerts, POST /api/smart-alerts, PATCH /api/smart-alerts/:id/toggle, DELETE /api/smart-alerts/:id | integration | CRUD with natural language description | ownership violations; combined limit reached | optional second condition | apps/api/src/smart-alerts/smart-alerts.service.spec.ts | High |
| Forecast | GET /api/forecast/session and POST /api/forecast/vote | integration | session returns ratios when appropriate; vote recorded | session not found; session closed; missing JWT for vote | ratios hidden until vote or close | apps/api/src/forecast/forecast.service.spec.ts | High |
| Forecast | GET /api/forecast/leaderboard and GET /api/forecast/history | integration | leaderboard for month; user history paginated | missing JWT for history | empty leaderboard | apps/api/src/forecast/forecast.service.spec.ts | Medium |
| DCA | GET /api/dca/simulate | integration | returns DCA results | not enough data -> 400 | frequency weekly vs monthly | apps/api/src/dca/dca.service.spec.ts | Medium |
| Portfolio | GET /api/portfolio, GET /api/portfolio/chart, GET /api/portfolio/allocation | integration | aggregates holdings; chart points; allocation | missing/invalid JWT | no transactions returns empty | apps/api/src/portfolio/portfolio.service.spec.ts | High |
| Portfolio | GET /api/portfolio/transactions, POST /api/portfolio/transactions, PATCH /api/portfolio/transactions/:id, DELETE /api/portfolio/transactions/:id | integration | CRUD with pagination | invalid qty or future date; ownership violations | decimal quantity; rounding of price | apps/api/src/portfolio/portfolio.service.spec.ts | High |
| Browsing History | POST /api/browsing-history/record, GET /api/browsing-history/context, GET /api/browsing-history, GET /api/browsing-history/lowest, DELETE /api/browsing-history | integration | record, list, context delta, lowest seen | missing/invalid JWT | cap at 500 rows; empty history | apps/api/src/browsing-history/browsing-history.service.ts | Medium |
| Personalisation | POST /api/personalisation/view, GET /api/personalisation/order, POST /api/personalisation/pin, DELETE /api/personalisation/pin, PATCH /api/personalisation/pin/reorder, DELETE /api/personalisation/reset | integration | view tracked; order sorted; pin CRUD | max pins reached | reorder with missing items | apps/api/src/personalisation/personalisation.service.ts | Medium |
| Digest | GET /api/digest/latest, GET /api/digest/archive, POST /api/digest/subscribe, DELETE /api/digest/subscribe | integration | latest and archive returned; subscribe toggles | missing/invalid JWT for subscribe | BigInt to number conversion | apps/api/src/digest/digest.service.spec.ts | Medium |
| AI | POST /api/ai/chat | integration | SSE stream and [DONE] terminator | guest limit 429; stream errors | fallback when API key missing | apps/api/src/ai/ai.service.spec.ts | Medium |
| Admin | GET /api/admin/stats, GET /api/admin/stats/period, GET /api/admin/stats/timeseries | integration | stats and time series returned | non-admin -> 403 | zero counts | apps/api/src/admin/admin.service.spec.ts | High |
| Admin | GET /api/admin/users, PATCH /api/admin/users/:id/lock, PATCH /api/admin/users/:id/unlock, PATCH /api/admin/users/:id/role | integration | list and mutate users | non-admin -> 403; user not found | filters and pagination | apps/api/src/admin/admin.service.spec.ts | High |
| Admin | GET /api/admin/data-sources, POST /api/admin/data-sources, PATCH /api/admin/data-sources/:id, DELETE /api/admin/data-sources/:id, PATCH /api/admin/data-sources/:id/enable | integration | list and manage data sources | non-admin -> 403; data source not found | disable/enable toggles | apps/api/src/admin/admin.service.spec.ts | Medium |
| Admin | POST /api/admin/crawl/trigger | integration | triggers crawl cycle | non-admin -> 403 | no crawlers registered | apps/api/src/admin/admin.service.spec.ts | Medium |
| Admin | GET /api/admin/forecast/sessions, POST /api/admin/forecast/sessions, PATCH /api/admin/forecast/sessions/:id/close, PATCH /api/admin/forecast/sessions/:id/result, GET /api/admin/forecast/sessions/:id/votes | integration | manage sessions and results | non-admin -> 403; session not found | scoring updates user scores | apps/api/src/admin/admin.service.spec.ts | High |
| Admin | GET /api/admin/anomalies, POST /api/admin/anomalies/:id/review | integration | list anomalies and review | non-admin -> 403; record not found | approved vs rejected updates | apps/api/src/admin/admin.service.spec.ts | Medium |
| Admin | GET /api/admin/audit | integration | returns audit log page | non-admin -> 403 | empty log | apps/api/src/admin/admin.service.spec.ts | Medium |

## Backend internal services and jobs
| Module | Function / endpoint / component | Test type | Happy path cases | Failure cases | Edge cases | Suggested test file location | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Crawler | BaseCrawlerService.crawl | unit | creates data source; creates crawl session; stores records | fetch throws -> session failed | anomaly flag for large deviation | apps/api/src/crawler/base-crawler.service.spec.ts | High |
| Crawler | SjcCrawlerService.fetchPrices and parseItems | unit | maps API type codes to gold types | upstream API error | duplicate type codes ignored | apps/api/src/crawler/sjc-crawler.service.spec.ts | Medium |
| Crawler | PnjCrawlerService.fetchPrices and parseItems | unit | maps PNJ types | upstream API error | duplicate type codes ignored | apps/api/src/crawler/pnj-crawler.service.spec.ts | Medium |
| Crawler | DojiCrawlerService.fetchPrices and parseItems | unit | maps DOJI types | upstream API error | duplicate type codes ignored | apps/api/src/crawler/doji-crawler.service.spec.ts | Medium |
| Crawler | BtmcCrawlerService.parseApiResponse | unit | parses rows; converts per-chi to per-tael | parse errors | unknown labels skipped | apps/api/src/crawler/btmc-crawler.service.spec.ts | Medium |
| Crawler | CrawlSchedulerService.runCrawlCycle and runNow | unit | triggers all registered crawlers | crawl throws | skip outside trading hours | apps/api/src/crawler/crawl-scheduler.service.spec.ts | Medium |
| Crawler | AnomalyDetectorService.isAnomalous | unit | flags deviation over 15 percent | none | prevPrice null or 0 | apps/api/src/crawler/anomaly-detector.service.spec.ts | Medium |
| Alerts | AlertEvaluatorService.evaluate | unit | triggers emails and history records | email send failure | repeatMode cooldown | apps/api/src/alerts/alert-evaluator.service.spec.ts | High |
| Smart Alerts | SmartAlertsService.evaluate and evaluateCondition | unit | fires when conditions met | bad condition type | trend requires enough points | apps/api/src/smart-alerts/smart-alerts.service.spec.ts | Medium |
| Heat Index | HeatIndexService.compute | unit | computes velocity/spread/crossings | none | no recent records | apps/api/src/heat-index/heat-index.service.spec.ts | Medium |
| Forecast | ForecastService.openNextSession, closeCurrentSession, scoreSessions | unit | opens/closes/scores sessions | missing price bracket | no sessions to score | apps/api/src/forecast/forecast.service.spec.ts | Medium |
| Digest | DigestService.generate and sendEmails | unit | creates daily digest; sends emails | no SJC price | AI summary failure fallback | apps/api/src/digest/digest.service.spec.ts | Medium |
| AI | AiService.streamChat and checkGuestLimit | unit | streams response; enforces limit | missing API key | guest counter reset at midnight | apps/api/src/ai/ai.service.spec.ts | Medium |
| Mail | MailService.send* | unit | no-op when SMTP disabled | transport failure logs | HTML formatting | apps/api/src/mail/mail.service.ts | Low |
| Database | PrismaService.onModuleInit | unit | connects on init | missing DATABASE_URL | adapter config | apps/api/src/database/prisma.service.spec.ts | Medium |

## Frontend pages
| Module | Function / endpoint / component | Test type | Happy path cases | Failure cases | Edge cases | Suggested test file location | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | Home page tabs and protected tabs | integration | switches tabs; alerts modal open/close | auth missing for protected tabs | logout while on protected tab | apps/web/src/app/page.tsx | High |
| Auth | Login page | integration | login success routes; Google link builds | API error displays | rate limit message | apps/web/src/app/auth/login/page.tsx | High |
| Auth | Register page | integration | validation passes and success view | validation error | email format invalid | apps/web/src/app/auth/register/page.tsx | High |
| Auth | Forgot password page | integration | submits and shows confirmation | API error ignored | empty email blocked | apps/web/src/app/auth/forgot-password/page.tsx | Medium |
| Auth | Reset password page | integration | valid token resets | missing token shows invalid | password rule validation | apps/web/src/app/auth/reset-password/page.tsx | High |
| Auth | Verify email page | integration | token verified success | expired/invalid token | missing token | apps/web/src/app/auth/verify-email/page.tsx | Medium |
| Auth | OAuth callback page | integration | token param logs in and redirects | missing token redirect | failed login redirect | apps/web/src/app/auth/oauth-callback/page.tsx | Medium |
| Portfolio | Portfolio page | integration | renders summary, chart, allocation, CRUD transactions | API errors | empty portfolio | apps/web/src/app/portfolio/page.tsx | High |
| Profile | Browsing history page | integration | list, pagination, clear history | API errors | empty history | apps/web/src/app/profile/history/page.tsx | Medium |
| Digest | Archive page | integration | list and expand digest cards | API errors | empty archive | apps/web/src/app/digest/archive/page.tsx | Medium |
| Tools | DCA simulator page | integration | sim results and chart | API errors | less than 2 data points | apps/web/src/app/tools/dca-simulator/page.tsx | Medium |
| Tools | Converter page | integration | conversion outputs and copy | missing price or rates | qty or unit changes | apps/web/src/app/tools/converter/page.tsx | Medium |
| Forecast | Leaderboard page | integration | month switch and list | API error message | empty month data | apps/web/src/app/leaderboard/page.tsx | Medium |
| Admin | Admin layout access gate | integration | admin access allowed | non-admin redirect | loading state | apps/web/src/app/admin/layout.tsx | High |
| Admin | Admin overview page | integration | stats render; crawl trigger | API error states | empty series | apps/web/src/app/admin/page.tsx | Medium |
| Admin | Admin users page | integration | list and lock/unlock/role | API errors | empty list | apps/web/src/app/admin/users/page.tsx | Medium |
| Admin | Admin data sources page | integration | list; create/edit/enable/disable | API errors | validation on form fields | apps/web/src/app/admin/data-sources/page.tsx | Medium |
| Admin | Admin forecast page | integration | open/close/result; vote detail | API errors | empty votes list | apps/web/src/app/admin/forecast/page.tsx | Medium |
| Admin | Admin audit page | integration | audit list and pagination | API errors | empty audit log | apps/web/src/app/admin/audit/page.tsx | Low |
| Admin | Admin anomalies page | integration | list and approve/reject | API errors | empty anomalies | apps/web/src/app/admin/anomalies/page.tsx | Medium |

## Frontend components
| Module | Function / endpoint / component | Test type | Happy path cases | Failure cases | Edge cases | Suggested test file location | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Shell | DashboardShell navigation | unit | nav renders and switches tabs | none | admin-only link hidden | apps/web/src/components/dashboard/DashboardShell.tsx | Medium |
| Overview | OverviewPage | integration | loads prices, heat index, digest, forecast widgets | API errors | empty data states | apps/web/src/components/dashboard/OverviewPage.tsx | High |
| Markets | MarketsPage | integration | chart renders and quick alert panel | API errors | compare mode | apps/web/src/components/dashboard/MarketsPage.tsx | Medium |
| Alerts | AlertsPage | integration | alerts list, history, smart alert builder | API errors | empty alerts | apps/web/src/components/dashboard/AlertsPage.tsx | High |
| Account | AccountPage | integration | change password, subscribe digest, clear history, delete account | API errors | missing access token | apps/web/src/components/dashboard/AccountPage.tsx | High |
| Alerts | AddAlertModal | unit | form submits and resets | API error displays | threshold defaults | apps/web/src/components/dashboard/AddAlertModal.tsx | Medium |
| AI | AiChatWidget | unit | streams chat and appends assistant reply | stream error | guest limit and counter | apps/web/src/components/AiChatWidget.tsx | Medium |
| Forecast | ForecastVoteWidget | unit | vote flow and ratio bars | API error | no session; not logged in | apps/web/src/components/ForecastVoteWidget.tsx | Medium |
| Heat Index | HeatIndexHistoryChart | unit | chart renders with data | no data | loading state | apps/web/src/components/HeatIndexHistoryChart.tsx | Low |
| Digest | DigestCard | unit | expand/collapse and dismiss | none | digest missing or user logged out | apps/web/src/components/DigestCard.tsx | Low |
| Prices | PriceChart | unit | hover, zoom, and alert line rendering | none | compare mode normalization | apps/web/src/components/ui/PriceChart.tsx | Medium |
| Prices | PriceHistoryChart | unit | range/brand/type changes | API error | empty data | apps/web/src/components/PriceHistoryChart.tsx | Medium |
| Prices | PriceTable | unit | renders rows with status | API error | empty data | apps/web/src/components/PriceTable.tsx | Low |
| Prices | ComparisonTable | unit | renders best buy/sell badges | API error | empty brands | apps/web/src/components/ComparisonTable.tsx | Low |
| Auth | ProtectedRoute | unit | renders children for auth | redirect when unauth | loading state | apps/web/src/components/ProtectedRoute.tsx | Medium |

## Frontend data layer
| Module | Function / endpoint / component | Test type | Happy path cases | Failure cases | Edge cases | Suggested test file location | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HTTP | apiClient and setApiAccessToken | unit | Authorization header injected | none | token cleared on logout | apps/web/src/lib/api-client.ts | Medium |
| Auth API | apiRegister, apiLogin, apiLogout, apiRefreshToken, apiVerifyEmail, apiForgotPassword, apiResetPassword, apiGetMe, apiChangePassword, apiDeleteAccount | unit | builds correct method and body | non-200 throws ApiError | 204 handling | apps/web/src/lib/auth.api.ts | High |
| Price API | fetchDomesticPrices, fetchInternationalPrice, fetchPriceHistory, fetchComparison and hooks | unit | query params passed | API error | staleTime and refetchInterval | apps/web/src/lib/price.api.ts | Medium |
| Forecast API | useActiveSession, useCastVote, useLeaderboard, useVoteHistory | unit | correct endpoints and params | API error | disabled when token missing | apps/web/src/lib/forecast.api.ts | Medium |
| Admin API | admin stats, users, data sources, anomalies, forecast, audit | unit | correct endpoints and params | API error | invalidation keys | apps/web/src/lib/admin.api.ts | Medium |
| Portfolio API | portfolio summary, chart, allocation, transactions CRUD | unit | correct endpoints | API error | pagination param | apps/web/src/lib/portfolio.api.ts | Medium |
| Alerts API | price alerts CRUD and history | unit | correct endpoints | API error | history pagination | apps/web/src/lib/alerts.api.ts | Medium |
| Smart Alerts API | smart alerts CRUD | unit | correct endpoints | API error | toggle/delete flows | apps/web/src/lib/smart-alerts.api.ts | Medium |
| Browsing History API | record/context/history/lowest/clear | unit | correct endpoints and params | API error | clear invalidates queries | apps/web/src/lib/browsing-history.api.ts | Medium |
| Personalisation API | order/view/pin/reorder/reset | unit | correct endpoints | API error | delete with body | apps/web/src/lib/personalisation.api.ts | Low |
| Digest API | latest/archive/subscribe | unit | correct endpoints | API error | subscribe toggle | apps/web/src/lib/digest.api.ts | Low |
| Exchange Rate API | rates hook | unit | correct endpoint | API error | cache timing | apps/web/src/lib/exchange-rate.api.ts | Low |
| Spread API | ranking/history hooks | unit | correct params | API error | days default | apps/web/src/lib/spread.api.ts | Low |
| Heat Index API | current/history hooks | unit | correct endpoint | API error | refetch timing | apps/web/src/lib/heat-index.api.ts | Low |
| DCA API | simulate hook | unit | correct params | API error | disabled when params missing | apps/web/src/lib/dca.api.ts | Low |
| Converter API | calculateConversion | unit | correct math conversions | none | zero or negative qty | apps/web/src/lib/converter.api.ts | Low |
| AI API | streamAiChat | unit | parses SSE chunks | non-200 response | malformed data lines | apps/web/src/lib/ai.api.ts | Low |

## Recommended testing order
1. Backend unit tests for core services: auth, prices, alerts, portfolio, forecast, digest.
2. Backend integration/e2e for critical flows: health, prices, auth, alerts, portfolio.
3. Background jobs and crawler logic: anomaly detection, crawl scheduling, alert evaluation, forecast scoring, digest generation.
4. Frontend integration tests for auth pages, dashboard tabs, alerts, portfolio, admin access gate.
5. Full user journey e2e (login -> view prices -> create alert -> update portfolio -> admin actions) after adding a frontend e2e runner.
