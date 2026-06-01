# GoldPlan - Tổng Hợp Chức Năng Theo Trang

Tài liệu này đi qua từng route chính trong ứng dụng web `apps/web`, mô tả chức năng, các thành phần hiển thị và nhiệm vụ của từng phần. Nội dung được tổng hợp từ `apps/web/src/app`, `apps/web/src/components`, `apps/web/src/lib` và các API hook đang dùng.

## 1. Shell Và Nền Tảng Chung

### `/` - Dashboard chính

Route này render `DashboardShell` và chuyển tab nội bộ giữa `OverviewPage`, `MarketsPage`, `AlertsPage`, `AccountPage`. Đây là màn hình làm việc chính của người dùng.

Các thành phần:

- `DashboardShell`: bố cục 2 cột gồm sidebar, topbar và vùng nội dung. Nhiệm vụ là điều hướng tab, hiển thị watchlist nhanh, ô tìm kiếm, chuông cảnh báo, avatar, menu tài khoản và theme toggle.
- `Sidebar`: nhóm navigation thành "Không gian làm việc", "Công cụ", và "Quản trị". Một số mục yêu cầu đăng nhập hoặc quyền admin.
- `TopBar`: hiển thị tìm kiếm nhanh, trạng thái cảnh báo, avatar, logout/login và theme.
- `RealtimeProvider` + `useRealTimePrices`: kết nối Socket.IO `/ws`, nhận `price:updated`, `spread:updated`, `arbitrage:updated`, `international-price:updated`, `exchange-rate:updated` và cập nhật cache TanStack Query.
- `AuthProvider`: giữ access token trong memory, refresh token bằng cookie httpOnly, cung cấp `user`, `login`, `logout`, `refreshToken`.
- `AiChatWidget`: widget AI nổi toàn app, cho phép hỏi nhanh về thị trường vàng.

## 2. Các Tab Trong Dashboard

### Tab `Tổng quan` - `OverviewPage`

Mục tiêu: cung cấp ảnh chụp nhanh về giá vàng, tỷ giá, lịch sử, bảng giá trực tiếp và các widget hành động.

Chức năng:

- Hero giá quốc tế: hiển thị XAU/USD, giá quy đổi mỗi lượng, biến động 24h.
- Giá mua nội địa: hiển thị giá mua SJC hoặc brand fallback từ dữ liệu comparison.
- Bảng `Tỷ giá ngoại tệ`: gọi `useExchangeRates()` từ `/exchange-rate/rates`, render các dòng AUD/EUR/JPY/USD với `buyRate` và `sellRate`.
- Lịch sử giá: `PriceChart` theo range `1D`, `1W`, `1M`, `3M`, `1Y`; lấy từ `usePriceHistory('SJC', 'MIEN_SJC', range)`.
- Bảng giá vàng trực tiếp: gom các loại vàng chính từ `useDomesticPrices()`, hiển thị mua/bán/chênh lệch.
- Bảng chênh lệch thương hiệu nội địa: dùng `useComparison('MIEN_SJC')`, đánh dấu best buy/best sell, ghi nhận view/browse khi người dùng đã đăng nhập.
- Ghim và kéo thả thương hiệu: dùng `usePersonalisationOrder`, `useAddPin`, `useRemovePin`, `useReorderPins`, `@dnd-kit`.
- Biến động trong ngày: lấy `changePercent` từ giá trong nước để hiển thị tăng/giảm theo loại vàng.
- `ArbitrageWidget`: hiển thị cơ hội arbitrage nổi bật.
- Cảnh báo của bạn: rút gọn danh sách alert gần nhất, trạng thái triggered/pending, nút thêm cảnh báo.
- `ForecastVoteWidget`: widget dự đoán cộng đồng.

### Tab `Thị trường` - `MarketsPage`

Mục tiêu: phân tích thị trường sâu hơn bằng chart, so sánh thương hiệu và công cụ tạo cảnh báo nhanh.

Chức năng:

- Chart lịch sử giá: chọn asset/brand, gold type, range; dùng `usePriceHistory`.
- So sánh nhiều đường: có dữ liệu DOJI và BAO_TIN cho nhẫn 9999 để đối chiếu với asset chính.
- Export CSV: gọi endpoint lịch sử export qua `getAccessToken()` khi cần.
- Quick alert tại giá: khi người dùng đăng nhập, có thể tạo alert từ điểm giá trên chart.
- Spread ranking section: dùng `useSpreadRanking`, xếp hạng thương hiệu theo spread mua/bán.
- Spread history chart: dùng `useSpreadHistory`, hiển thị xu hướng spread theo brand/gold type.
- Alerts summary: đọc `useAlerts` để biết alert hiện có.

### Tab `Cảnh báo` - `AlertsPage`

Mục tiêu: quản lý alert cá nhân.

Chức năng:

- Tab `rules`: liệt kê alert đang có từ `useAlerts()`, hiển thị brand, gold type, điều kiện, threshold, repeat mode và status.
- Tab `history`: liệt kê lịch sử kích hoạt từ `useAlertHistory()`.
- Bật/tắt alert: `useToggleAlert()`.
- Xóa alert: `useDeleteAlert()` kèm modal xác nhận.
- Thêm alert: mở `AddAlertModal`.
- Push notification: `PushNotificationButton` dùng `usePushNotifications()` để subscribe/unsubscribe service worker.

Thành phần phụ:

- `AddAlertModal`: form chọn brand, gold type, điều kiện `gte/lte`, threshold bằng `MoneyInput`, repeat mode, preview rule, submit qua `useCreateAlert()`.
- `ConfirmDeleteModal`: xác nhận thao tác xóa.

### Tab `Tài khoản` - `AccountPage`

Mục tiêu: quản lý thông tin người dùng, tuỳ chọn và bảo mật.

Chức năng:

- Hiển thị hồ sơ người dùng hiện tại từ `useAuth()`.
- Chọn theme bằng `next-themes`.
- Bật/tắt nhận daily digest qua `useSubscribeDigest()`.
- Bật/tắt push notification qua `PushNotificationButton`.
- Thống kê nhanh portfolio, alert, alert history.
- Đổi mật khẩu: `apiChangePassword`.
- Xóa tài khoản: `apiDeleteAccount`.
- Đăng xuất: `logout()` từ `AuthContext`.

## 3. Portfolio Và Tài Sản

### `/portfolio` - Danh mục vàng

Mục tiêu: quản lý các giao dịch mua/bán vàng và tính hiệu quả danh mục.

Chức năng:

- Tổng quan danh mục: `usePortfolio()` trả `totalValueVnd`, `totalCostVnd`, `totalPnlVnd`, `totalPnlPct`.
- Chart P&L: `usePortfolioChart()` hiển thị giá trị danh mục theo thời gian.
- Phân bổ: `usePortfolioAllocation()` hiển thị donut theo brand và gold type.
- Holdings table: liệt kê net quantity, avg cost, current buy price, current value, P&L từng vị thế.
- Transaction table: `useTransactions(page)` có phân trang.
- Thêm giao dịch: `useAddTransaction()` với type BUY/SELL, brand, goldType, quantity, pricePerTael, date, note.
- Sửa giao dịch: `useEditTransaction()`.
- Xóa giao dịch: `useDeleteTransaction()`.
- Export/report link: dẫn tới `/portfolio/report`.

Thành phần:

- `SummaryCard`: card tổng giá trị, vốn, lãi/lỗ.
- `PnlChart`: SVG chart cho P&L.
- `AllocationGroup` và `DonutChart`: phân bổ danh mục.
- Modal giao dịch: nhập dữ liệu, validate, gọi mutation.

### `/portfolio/report` - Báo cáo danh mục

Mục tiêu: tạo trang báo cáo có thể in hoặc xuất PDF bằng trình duyệt.

Chức năng:

- Protected route.
- Lấy portfolio, allocation, transactions.
- Hiển thị summary, holdings, allocation, recent transactions.
- Nút `In / Xuất PDF` gọi `window.print()`.
- CSS print riêng để báo cáo dễ in.

### `/assets` - Tổng tài sản

Mục tiêu: kết hợp portfolio vàng với tài sản nhập tay để xem tổng tài sản cá nhân.

Chức năng:

- Lấy giá trị portfolio vàng từ `usePortfolio()`.
- Quản lý manual assets bằng localStorage: cash, stock, crypto, real estate, fund, other.
- Thêm/sửa/xóa manual asset qua `AssetModal`.
- Tính tổng tài sản, phân bổ theo category và bảng allocation.
- Donut chart bằng Recharts.

Thành phần:

- `AssetModal`: form category, name, value.
- `DonutCenterLabel`: label giữa donut.
- Allocation table: hiển thị từng nhóm tài sản và tỷ trọng.

### `/profile/history` - Lịch sử duyệt

Mục tiêu: theo dõi các giá người dùng đã xem và so với mức thấp nhất từng thấy.

Chức năng:

- Protected route.
- `useBrowsingHistory(page)`: danh sách view history có phân trang.
- `useLowestSeen()`: giá thấp nhất từng xem theo brand/gold type.
- `useClearHistory()`: xóa toàn bộ lịch sử duyệt.
- Bảng hiển thị thời điểm xem, thương hiệu, loại vàng, giá mua, giá thấp nhất, phần trăm so với thấp nhất.

## 4. Công Cụ Công Khai Và Công Cụ Đăng Nhập

### `/tools/converter` - Quy đổi vàng

Mục tiêu: quy đổi giữa đơn vị vàng, độ tinh khiết và tiền tệ.

Chức năng:

- Protected route hiện tại.
- Chọn đơn vị: lượng, chỉ, phân, troy oz, gram, kilogram.
- Nhập số lượng, chọn purity `24K/22K/18K/14K`.
- Chọn brand tham chiếu SJC/DOJI và gold type tương ứng.
- Lấy giá vàng từ `useDomesticPrices(brand)` và tỷ giá từ `useExchangeRates()`.
- Tính kết quả bằng `calculateConversion()` sang VND/USD/EUR.
- Copy kết quả từng loại tiền.
- Hiển thị chi tiết khối lượng gram/lượng, giá dùng, tỷ giá dùng.

### `/tools/dca-simulator` - Mô phỏng DCA

Mục tiêu: mô phỏng chiến lược mua vàng định kỳ và so sánh với mua một lần.

Chức năng:

- Protected route.
- Chọn brand, start date, frequency weekly/monthly, quantity mỗi lần mua.
- Gọi `useDcaSimulate()` để lấy kết quả mô phỏng.
- Hiển thị average cost, total gold, total spent, current value, DCA P&L.
- So sánh DCA với lump sum.
- Chart DCA vs lump sum, có thể thêm đường so sánh frequency khác.
- Lưu kết quả vào portfolio qua `useAddTransaction()`.

### `/tools/spread` - Xếp hạng chênh lệch

Mục tiêu: phân tích spread mua/bán theo thương hiệu và loại vàng.

Chức năng:

- Chọn gold type: Miếng SJC, Nhẫn 9999, Vàng 24K.
- Chọn window ngày cho sparkline: 3/7/14/30.
- `useSpreadRanking(goldType)`: lấy ranking hiện tại.
- `useSpreadHistory(brand, goldType, days)`: sparkline mỗi dòng.
- Summary card: hiệu quả nhất, spread trung bình, spread cao nhất.
- Bảng ranking: rank, brand, spread %, mua, bán, spread VND, xu hướng.

### `/tools/arbitrage` - Cơ hội arbitrage

Mục tiêu: tìm chênh lệch mua thấp bán cao giữa thương hiệu.

Chức năng:

- `useArbitrageOpportunities()`: danh sách cơ hội hiện tại.
- Filter theo gold type.
- Quantity input để nhân lợi nhuận theo số lượng lượng vàng.
- `useArbitrageHistory(goldType, 24)`: heatmap lịch sử lợi nhuận theo giờ.
- `OpportunityRow`: hiển thị mua ở đâu, bán ở đâu, gross profit, profit percent, updatedAt.

### `/tools/gold-vs-assets` - So sánh vàng với tài sản khác

Mục tiêu: so sánh hiệu suất vàng với USD, gửi tiết kiệm và VN-Index.

Chức năng:

- Chọn range qua `useAssetsComparison(range)`.
- Nhập vốn giả định.
- `PerformanceCard`: hiển thị return %, giá trị quy đổi theo vốn, data point đầu/cuối.
- Hiển thị insight từ API.
- VN-Index có thể null nếu không có mock benchmark data.

### `/tools/forecast` Và `/leaderboard` - Bảng xếp hạng dự đoán

Mục tiêu: xem leaderboard cộng đồng dự đoán xu hướng.

Chức năng:

- `useLeaderboard(month)`: lấy bảng xếp hạng theo tháng.
- Chọn tháng.
- Hiển thị rank, displayName, totalPoints, correctCount, streak.
- `/tools/forecast` có scatter chart trực quan hoá điểm và độ chính xác.
- `/leaderboard` là trang leaderboard đầy đủ, có điều hướng quay lại.

### `/tools/inflation-calculator` - Máy tính lạm phát

Mục tiêu: tính sức mua tương lai hoặc hiện tại theo tỷ lệ lạm phát.

Chức năng:

- Mode `future` hoặc `present`.
- Nhập amount, inflation %, years.
- Tính bằng `useMemo`.
- Hiển thị kết quả, mức mất giá/sức mua, animation version khi input đổi.

### `/tools/compound-interest` - Lãi kép

Mục tiêu: mô phỏng tăng trưởng vốn với lãi kép và khoản góp định kỳ.

Chức năng:

- Nhập principal, annualRate, monthlyDeposit, years.
- Chọn frequency.
- Tính future value, total contribution, interest earned.
- Hiển thị kết quả theo dòng/card.

### `/tools/fire-calculator` - FIRE Calculator

Mục tiêu: ước lượng thời gian đạt độc lập tài chính.

Chức năng:

- Nhập current savings, monthly income, monthly expenses, annual return, inflation, withdrawal rate.
- Tính annual expenses, FIRE number, monthly savings, years to FIRE.
- Animate số năm và hiển thị kết quả nổi bật.

## 5. Digest, AI Và Cộng Đồng

### `/digest/archive` - Kho bản tin

Mục tiêu: xem lại các daily digest AI-generated.

Chức năng:

- `useDigestArchive(page)`: lấy danh sách digest có phân trang.
- `DigestCard`: hiển thị ngày, SJC buy/sell, XAU/USD, pct change, highlight.
- Expand/collapse để đọc `aiSummary`.
- Skeleton loading và empty state.

### `DigestCard` Trong Dashboard

Mục tiêu: hiển thị digest mới nhất trên trang tổng quan.

Chức năng:

- `useLatestDigest()`: lấy digest mới nhất.
- Cho phép expand summary.
- Có thể đăng ký digest khi đã đăng nhập qua digest API.

### `AiChatWidget`

Mục tiêu: trợ lý AI nổi trên app.

Chức năng:

- Guest có giới hạn số câu hỏi bằng local state/local storage.
- Người dùng nhập câu hỏi, gửi tới `useAiChat()` hoặc API chat.
- Hiển thị stream/loading state, messages và limit reached.

## 6. Authentication Pages

### `/auth/login`

Chức năng:

- Form email/password.
- Gọi `login()` từ `AuthContext`, sau đó redirect về `from` hoặc `/`.
- Link quên mật khẩu, đăng ký, Google OAuth.
- Hiển thị loading/error.

### `/auth/register`

Chức năng:

- Form email, password, confirm.
- Validate confirm password ở client.
- Gọi `register()` từ `AuthContext`.
- Sau thành công báo người dùng kiểm tra email xác thực.

### `/auth/verify-email`

Chức năng:

- Đọc `token` từ query string.
- Gọi `apiVerifyEmail(token)`.
- Hiển thị trạng thái loading, success, error/invalid.

### `/auth/forgot-password`

Chức năng:

- Nhập email.
- Gọi `apiForgotPassword(email)`.
- Sau submit hiển thị hướng dẫn kiểm tra email.

### `/auth/reset-password`

Chức năng:

- Đọc `token` từ query string.
- Form password mới và confirm.
- Gọi `apiResetPassword(token, password)`.
- Hiển thị success và link đăng nhập.

### `/auth/oauth-callback`

Chức năng:

- Nhận OAuth one-time code từ query.
- Gọi `apiExchangeOAuthCode(code)`.
- Gọi `loginWithToken(accessToken)` để lấy profile và vào session.
- Redirect về dashboard.

## 7. Admin Area

### `/admin/layout`

Mục tiêu: bảo vệ toàn bộ khu vực admin.

Chức năng:

- Kiểm tra `useAuth()`.
- Nếu chưa đăng nhập hoặc không phải admin thì redirect.
- Render navigation con: overview, users, data sources, forecast, anomalies, audit.

### `/admin` - Admin overview

Chức năng:

- `useAdminStats()`: tổng users, active users, alerts sent today, crawl success rate, data sources.
- `useAdminTimeSeries(days)`: chart users/crawl/alerts/forecast theo thời gian.
- `useAdminPeriodStats(period)`: thống kê theo day/week/month.
- `useTriggerCrawl()`: trigger crawl thủ công.
- `StatCard`, `BarChart`, `LineChart`, `DonutChart`, `ChartCard`: visual dashboard.
- Bảng data source status rút gọn.

### `/admin/users`

Chức năng:

- `useAdminUsers({ page, search, status, role })`: danh sách user có filter và phân trang.
- Lock/unlock user: `useLockUser()`, `useUnlockUser()`.
- Đổi role user/admin: `useChangeUserRole()`.
- `UserStatusBadge`: hiển thị trạng thái user.

### `/admin/data-sources`

Chức năng:

- `useAdminDataSources()`: danh sách nguồn crawl.
- Tạo nguồn mới: `useCreateDataSource()`.
- Sửa nguồn: `useUpdateDataSource()`.
- Disable/enable nguồn: `useDisableDataSource()`, `useEnableDataSource()`.
- `SourceForm`: name, brand, url, crawlType, frequencyMin.
- `EnabledBadge`: trạng thái active/inactive.

### `/admin/forecast`

Chức năng:

- `useAdminForecastSessions()`: danh sách session dự đoán.
- Tạo session mới: `useOpenForecastSession()`.
- Đóng session: `useCloseForecastSession()`.
- Set kết quả thủ công: `useSetForecastResult()`.
- Auto-score: `useAutoScoreForecastSession()`.
- Xem votes chi tiết: `useAdminSessionVotes(sessionId)`.
- `VoteBar`, `StatusBadge`, `VoteDetailPanel`, `NewSessionForm`.

### `/admin/anomalies`

Chức năng:

- `useAdminAnomalies()`: liệt kê price records bị đánh dấu bất thường.
- Review anomaly: `useReviewAnomaly()` với action approved/rejected.
- `ReviewBadge`: trạng thái review.
- Bảng hiển thị brand, gold type, buy/sell, reason, recordedAt.

### `/admin/audit`

Chức năng:

- `useAdminAuditLog(page)`: đọc audit log có phân trang.
- `ActionBadge`: phân biệt hành động admin.
- Bảng hiển thị adminId, action, entityType, entityId, oldValue/newValue, createdAt.

## 8. API Hooks Và Trách Nhiệm

Các hook frontend chính:

- `price.api.ts`: domestic prices, international price, history, comparison.
- `exchange-rate.api.ts`: tỷ giá live/stale/fallback và bảng mua/bán ngoại tệ.
- `alerts.api.ts`: CRUD alert và alert history.
- `portfolio.api.ts`: summary, chart, allocation, transactions CRUD.
- `personalisation.api.ts`: record view, pin/unpin, reorder.
- `browsing-history.api.ts`: record browse, context, list, lowest seen, clear.
- `spread.api.ts`: spread ranking và spread history.
- `arbitrage.api.ts`: arbitrage opportunities và history.
- `forecast.api.ts`: active session, cast vote, leaderboard, history.
- `digest.api.ts`: latest digest, archive, subscribe/unsubscribe.
- `admin.api.ts`: stats, users, data sources, forecast management, anomalies, audit.
- `auth.api.ts`: register, login, refresh, logout, verify email, forgot/reset password, OAuth exchange, profile, delete account.

## 9. Thành Phần UI Dùng Lại

- `PriceChart`: chart SVG tương tác cho lịch sử giá; hỗ trợ hover, crosshair, MA, Bollinger Bands, candle mode, compare mode, alert-at-price.
- `BrandLogo`: hiển thị logo brand SJC, DOJI, PNJ, BAO_TIN.
- `LiveBadge`: badge trạng thái live.
- `MoneyInput`: input tiền có format.
- `Button`, `Input`, `Dialog`, `Tabs`, `Tooltip`, `Select`, `Switch`, `Badge`: primitives UI.
- `ProtectedRoute`: chặn truy cập route cần đăng nhập.
- `PushNotificationButton`: subscribe/unsubscribe push notification với service worker.

## 10. Ghi Chú Vận Hành

- Dữ liệu realtime đi qua Socket.IO và cập nhật TanStack Query cache, nên nhiều trang tự refresh mà không cần reload.
- Các route portfolio, assets, profile/history, converter, dca hiện được bọc `ProtectedRoute` hoặc yêu cầu user trong navigation.
- Admin area kiểm tra role admin ở layout trước khi render trang con.
- Một số công cụ như inflation, compound interest, FIRE chạy hoàn toàn client-side bằng `useMemo`, không gọi API.
- Bảng tỷ giá ngoại tệ trong `OverviewPage` hiện render từ `ExchangeRateDto.currencyRates` do API `/exchange-rate/rates` trả về.
