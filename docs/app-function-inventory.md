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

## 10. Giải Thích Chi Tiết Tính Năng Và Thuật Ngữ

Phần này diễn giải sâu hơn các chức năng đã liệt kê ở trên. Mục tiêu là giúp người đọc không cần đọc code vẫn hiểu tính năng đang phục vụ nghiệp vụ gì, dữ liệu đi qua những bước nào, và các thuật ngữ trong app có ý nghĩa gì.

### Nhóm giá vàng và thị trường

- Giá mua: số tiền cửa hàng hoặc thương hiệu trả cho khách khi khách bán vàng. Trong app, giá mua thường dùng để tính giá trị hiện tại của danh mục vì đây là mức người dùng có thể thu về nếu bán ra.
- Giá bán: số tiền khách phải trả khi mua vàng từ thương hiệu. Giá bán thường cao hơn giá mua.
- Spread: chênh lệch giữa giá bán và giá mua. Spread càng thấp thì chi phí giao dịch càng nhỏ; spread càng cao thì người mua phải chịu khoảng cách mua/bán lớn hơn.
- Best buy: thương hiệu đang có giá mua cao nhất cho cùng loại vàng. Đây là nơi người dùng có thể bán được giá tốt hơn.
- Best sell: thương hiệu đang có giá bán thấp nhất cho cùng loại vàng. Đây là nơi người dùng có thể mua vào với chi phí thấp hơn.
- XAU/USD: giá vàng quốc tế tính theo USD cho mỗi ounce. Đây là chuẩn tham chiếu quốc tế, khác với đơn vị "lượng" phổ biến ở Việt Nam.
- Giá quy đổi mỗi lượng: giá quốc tế được đổi sang VND và quy đổi theo đơn vị lượng để người dùng dễ so sánh với giá trong nước.
- Tỷ giá ngoại tệ: bảng buy/sell của các đồng như USD, EUR, AUD, JPY. App dùng tỷ giá này để hiển thị ngữ cảnh thị trường và hỗ trợ quy đổi giá quốc tế.
- Change percent: phần trăm biến động so với mốc trước đó, thường dùng để biểu thị giá đang tăng hay giảm.
- Price history: chuỗi điểm dữ liệu theo thời gian gồm thời điểm ghi nhận, giá mua, giá bán hoặc giá đại diện. Chart lịch sử giá đọc chuỗi này để vẽ xu hướng.
- Candle mode: cách hiển thị dữ liệu theo nến, thường gồm open, high, low, close. Nó giúp nhìn biến động trong một khoảng thời gian tốt hơn so với một đường line đơn.
- Moving average: đường trung bình động của giá. Nó làm mượt dữ liệu để người dùng nhìn xu hướng tổng quát.
- Bollinger Bands: dải thống kê quanh đường trung bình động, dùng để nhìn mức dao động bất thường hoặc biên biến động.

Các tính năng liên quan:

- Hero giá quốc tế trong `OverviewPage`: gom XAU/USD, tỷ giá, giá quy đổi và biến động 24h vào một vùng nổi bật. Nó trả lời nhanh câu hỏi "giá vàng quốc tế hiện đang ở đâu và quy đổi sang VND khoảng bao nhiêu".
- Giá mua nội địa trong `OverviewPage`: bổ sung góc nhìn thực tế hơn cho người nắm giữ vàng. Thay vì chỉ xem giá bán, người dùng nhìn được mức giá có thể thu về nếu bán.
- Bảng giá vàng trực tiếp: hiển thị nhiều loại vàng và nhiều thương hiệu trong cùng một nơi. Người dùng dùng bảng này để so sánh giá mua, giá bán và spread.
- Bảng chênh lệch thương hiệu: tập trung vào so sánh cùng một loại vàng giữa các brand. Tính năng này giúp tìm nơi mua rẻ hoặc bán cao.
- Chart lịch sử giá: giúp người dùng xem xu hướng theo `1D`, `1W`, `1M`, `3M`, `1Y`. Range càng dài thì càng phù hợp để nhìn xu hướng, range ngắn phù hợp để theo dõi biến động gần.
- Chart so sánh DOJI và BAO_TIN trong trang `Thị trường`: đặt nhiều đường giá trên cùng một biểu đồ để nhìn sự khác biệt giữa thương hiệu, nhất là với cùng loại vàng.
- Export CSV: cho phép tải dữ liệu lịch sử ra file bảng tính. Tính năng này phục vụ người dùng muốn tự phân tích bằng Excel, Google Sheets hoặc công cụ riêng.
- Spread ranking: xếp hạng thương hiệu theo độ rộng spread. Đây là chỉ báo nhanh về chi phí giao dịch.
- Spread history: theo dõi spread theo thời gian, giúp phát hiện lúc thị trường giãn spread mạnh hoặc quay về trạng thái bình thường.
- Arbitrage: tìm chênh lệch có thể khai thác giữa nơi mua và nơi bán. Trong thực tế cần xem thêm phí, thanh khoản và giới hạn giao dịch; app dùng nó như tín hiệu tham khảo.

### Nhóm cảnh báo giá

- Alert: quy tắc cảnh báo do người dùng tạo. Alert thường gồm thương hiệu, loại vàng, điều kiện, ngưỡng giá và cách lặp lại.
- Threshold: ngưỡng giá kích hoạt cảnh báo. Ví dụ giá bán lớn hơn hoặc bằng một số tiền nhất định.
- Condition `gte`: viết tắt của greater than or equal, nghĩa là lớn hơn hoặc bằng.
- Condition `lte`: viết tắt của less than or equal, nghĩa là nhỏ hơn hoặc bằng.
- Repeat mode: cách cảnh báo lặp lại sau khi đã kích hoạt. Nó giúp tránh spam hoặc cho phép cảnh báo nhiều lần nếu người dùng muốn.
- Triggered: trạng thái cảnh báo đã được kích hoạt vì giá thỏa điều kiện.
- Pending: trạng thái cảnh báo đang chờ giá chạm điều kiện.
- Push notification: thông báo đẩy qua trình duyệt hoặc thiết bị, dùng service worker để nhận thông báo kể cả khi người dùng không mở tab app.

Các tính năng liên quan:

- Tab `Cảnh báo`: là nơi quản lý toàn bộ alert cá nhân. Người dùng có thể xem rule đang bật, xem lịch sử kích hoạt, bật/tắt hoặc xóa rule.
- `AddAlertModal`: chuẩn hóa quá trình tạo cảnh báo. Form buộc người dùng chọn đúng brand, loại vàng, điều kiện và threshold để backend có thể kiểm tra tự động.
- Alert history: ghi lại những lần rule đã được kích hoạt. Phần này giúp người dùng biết cảnh báo có hoạt động đúng thời điểm hay không.
- Quick alert trong trang `Thị trường`: cho phép tạo cảnh báo ngay từ chart hoặc vùng giá đang xem, giảm thao tác so với vào tab cảnh báo rồi nhập lại thông tin.
- `PushNotificationButton`: kiểm tra quyền trình duyệt, đăng ký service worker và lưu subscription để backend có thể gửi thông báo.

### Nhóm danh mục, tài sản và hiệu suất

- Portfolio: danh mục vàng của người dùng, gồm các giao dịch mua/bán hoặc vị thế đang nắm giữ.
- Transaction: một giao dịch trong danh mục. Giao dịch thường có loại mua/bán, loại vàng, khối lượng, đơn giá, ngày giao dịch và ghi chú.
- Holding: lượng tài sản đang nắm giữ sau khi tổng hợp các transaction.
- Allocation: tỷ trọng phân bổ theo loại vàng hoặc nhóm tài sản. Nó trả lời câu hỏi "tài sản đang tập trung vào đâu".
- Unrealized profit/loss: lãi/lỗ tạm tính của phần đang nắm giữ, chưa hiện thực hóa bằng giao dịch bán.
- Realized profit/loss: lãi/lỗ đã chốt sau khi có giao dịch bán.
- Portfolio summary: phần tổng hợp giá trị danh mục, vốn, lãi/lỗ và biến động.
- Report: báo cáo tổng hợp, thường dùng để xem kết quả theo khoảng thời gian hoặc xuất dữ liệu.

Các tính năng liên quan:

- Trang `/portfolio`: cho người dùng nhập và quản lý giao dịch vàng. Đây là nguồn dữ liệu chính để app tính giá trị danh mục.
- Summary cards trong portfolio: rút gọn các chỉ số quan trọng như tổng vốn, giá trị hiện tại, lãi/lỗ và tỷ lệ sinh lời.
- Chart danh mục: vẽ biến động giá trị theo thời gian, giúp người dùng nhìn danh mục tăng/giảm ra sao.
- Allocation chart: hiển thị tỷ trọng theo loại vàng hoặc nhóm tài sản. Nó giúp phát hiện danh mục quá lệch vào một loại tài sản.
- Transaction list: bảng chi tiết giao dịch, hỗ trợ kiểm tra, sửa hoặc xóa dữ liệu đầu vào.
- Trang `/portfolio/report`: tạo góc nhìn báo cáo hơn so với trang nhập liệu. Nó phù hợp để tổng kết hiệu suất, lịch sử giao dịch và phân bổ.
- Trang `/assets`: mở rộng góc nhìn từ riêng vàng sang tổng tài sản. Người dùng có thể nhìn vàng trong bức tranh tài chính cá nhân rộng hơn.

### Nhóm cá nhân hóa và lịch sử duyệt

- Personalisation: các dữ liệu giúp app tùy biến trải nghiệm theo người dùng, ví dụ brand được ghim hoặc thứ tự ưu tiên.
- Pin: thao tác ghim một thương hiệu hoặc mục quan trọng để nó xuất hiện nổi bật hơn.
- Reorder: thay đổi thứ tự các mục đã ghim bằng kéo thả.
- Browsing history: lịch sử người dùng đã xem thương hiệu, loại vàng hoặc trang nào.
- Lowest seen: mức giá thấp nhất người dùng từng nhìn thấy trong ngữ cảnh duyệt. Nó giúp app cung cấp so sánh kiểu "giá hiện tại so với mức thấp nhất bạn từng thấy".
- Record view / record browse: thao tác ghi nhận hành vi xem vào backend để phục vụ lịch sử và cá nhân hóa.

Các tính năng liên quan:

- Ghim và kéo thả thương hiệu: giúp người dùng đưa thương hiệu quan tâm lên trước. Thứ tự này được lưu lại qua API cá nhân hóa.
- Trang `/profile/history`: cho người dùng xem lại lịch sử duyệt. Trang này hữu ích khi người dùng muốn quay lại mức giá hoặc sản phẩm đã xem trước đó.
- Watchlist trong shell: tận dụng dữ liệu cá nhân hóa để hiển thị nhanh những mục người dùng quan tâm ngay trong navigation.

### Nhóm công cụ tính toán

- Converter: công cụ quy đổi giữa đơn vị vàng và tiền. Nó giúp trả lời nhanh "x chỉ/lượng tương đương bao nhiêu tiền".
- DCA: viết tắt của Dollar-Cost Averaging, chiến lược mua định kỳ với số tiền cố định. Trong app, DCA simulator mô phỏng kết quả nếu người dùng mua đều theo thời gian.
- Inflation: lạm phát, mức giảm sức mua của tiền theo thời gian. Công cụ lạm phát cho biết một số tiền trong quá khứ/tương lai tương đương bao nhiêu.
- Compound interest: lãi kép, tức lãi sinh ra tiếp tục được tái đầu tư để tạo thêm lãi.
- FIRE: viết tắt của Financial Independence, Retire Early. Công cụ FIRE ước tính thời điểm người dùng có thể độc lập tài chính dựa trên tài sản, tiết kiệm và chi tiêu.
- Asset comparison: so sánh hiệu suất vàng với tài sản khác như chứng khoán, tiết kiệm hoặc chỉ số tham chiếu.

Các tính năng liên quan:

- `/tools/converter`: dùng dữ liệu giá hiện tại để đổi giữa lượng vàng, tiền VND và đôi khi các đơn vị vàng khác.
- `/tools/dca-simulator`: mô phỏng nhiều lần mua định kỳ, tính tổng vốn bỏ ra, giá trị hiện tại và hiệu suất.
- `/tools/inflation-calculator`: chạy client-side, dùng công thức lạm phát để quy đổi sức mua.
- `/tools/compound-interest`: dùng công thức lãi kép để dự phóng giá trị tương lai.
- `/tools/fire-calculator`: kết hợp tài sản hiện tại, số tiền tiết kiệm, lợi suất kỳ vọng và chi tiêu mục tiêu để ước tính mốc FIRE.
- `/tools/gold-vs-assets`: đặt vàng cạnh các tài sản khác để người dùng nhìn tương quan hiệu suất, không chỉ nhìn giá vàng riêng lẻ.

### Nhóm dự đoán, cộng đồng và AI

- Forecast session: một phiên dự đoán có thời gian mở, thời gian đóng và kết quả cuối cùng.
- Vote: lựa chọn dự đoán của người dùng trong một session, ví dụ tăng/giảm hoặc chọn mức giá.
- Leaderboard: bảng xếp hạng người dự đoán đúng hoặc có điểm cao.
- Auto-score: quá trình tự động chấm điểm vote sau khi đã có kết quả thực tế.
- Digest: bản tin tổng hợp thị trường, thường gồm điểm đáng chú ý, biến động giá và nội dung tóm tắt.
- AI chat: widget hỏi đáp nhanh. Trong app, nó đóng vai trò trợ lý giải thích hoặc gợi ý thông tin, không thay thế dữ liệu chính thức.

Các tính năng liên quan:

- `ForecastVoteWidget`: đưa hoạt động dự đoán vào dashboard để người dùng tham gia nhanh.
- `/tools/forecast` và `/leaderboard`: hiển thị phiên dự đoán, lịch sử vote và bảng xếp hạng cộng đồng.
- `/digest/archive`: lưu các bản tin cũ để người dùng đọc lại.
- `DigestCard`: đưa bản tin mới nhất lên dashboard như một khối thông tin nhanh.
- `AiChatWidget`: widget nổi toàn app, giúp hỏi nhanh về nội dung thị trường hoặc dữ liệu trong app.

### Nhóm xác thực và bảo mật

- Access token: token ngắn hạn dùng để gọi API cần đăng nhập.
- Refresh token: token dùng để lấy access token mới, thường lưu bằng cookie httpOnly để giảm rủi ro bị JavaScript đọc trực tiếp.
- Session: trạng thái đăng nhập hiện tại của người dùng.
- OAuth callback: route nhận code từ nhà cung cấp đăng nhập ngoài, đổi code lấy token rồi đưa người dùng vào app.
- Verify email: bước xác minh email để đảm bảo người dùng sở hữu địa chỉ đã đăng ký.
- Reset password token: token dùng một lần để đặt lại mật khẩu.
- Protected route: lớp bảo vệ route, chỉ render nội dung khi người dùng đã đăng nhập hoặc có quyền phù hợp.

Các tính năng liên quan:

- `/auth/login`: đăng nhập bằng email/password, lưu session và chuyển về dashboard.
- `/auth/register`: tạo tài khoản mới và thường dẫn tới bước xác minh email.
- `/auth/verify-email`: xác nhận token email.
- `/auth/forgot-password`: yêu cầu gửi email đặt lại mật khẩu.
- `/auth/reset-password`: nhập mật khẩu mới bằng reset token.
- `/auth/oauth-callback`: xử lý đăng nhập OAuth, đổi one-time code thành access token.
- `AuthProvider`: giữ trạng thái user, refresh token và expose các hàm login/logout cho toàn frontend.

### Nhóm quản trị và vận hành

- Admin role: quyền quản trị, cho phép truy cập các trang quản trị và thao tác nhạy cảm.
- Crawl: quá trình thu thập dữ liệu giá từ nguồn bên ngoài.
- Data source: cấu hình nguồn dữ liệu, gồm brand, URL, loại crawl và tần suất.
- Crawl success rate: tỷ lệ crawl thành công. Đây là chỉ số sức khỏe dữ liệu.
- Anomaly: bản ghi giá bị đánh dấu bất thường, ví dụ lệch quá mạnh hoặc không hợp lệ.
- Review anomaly: thao tác duyệt bản ghi bất thường để chấp nhận hoặc loại bỏ.
- Audit log: nhật ký hành động quản trị, ghi lại ai đã làm gì, trên entity nào, trước/sau ra sao.
- Entity: đối tượng nghiệp vụ trong hệ thống, ví dụ user, data source, forecast session hoặc price record.

Các tính năng liên quan:

- `/admin`: dashboard vận hành cho admin, hiển thị số liệu user, alert, crawl và nguồn dữ liệu.
- `/admin/users`: quản lý người dùng, khóa/mở khóa và đổi role.
- `/admin/data-sources`: tạo/sửa/bật/tắt nguồn crawl. Đây là nơi ảnh hưởng trực tiếp tới dữ liệu giá.
- `/admin/forecast`: mở/đóng phiên dự đoán, set kết quả và auto-score.
- `/admin/anomalies`: kiểm tra bản ghi giá bất thường trước khi dữ liệu ảnh hưởng tới người dùng.
- `/admin/audit`: xem lịch sử thao tác quản trị để truy vết khi có sự cố.

### Nhóm kỹ thuật frontend/API

- TanStack Query: thư viện quản lý server state ở frontend. Nó cache dữ liệu API, refetch khi cần và giúp nhiều component dùng chung dữ liệu.
- Query cache: bộ nhớ tạm của dữ liệu API. Khi realtime event đến, app cập nhật cache để UI đổi ngay mà không cần reload.
- Hook API: hàm React như `useDomesticPrices()` hoặc `useAlerts()` đóng gói việc gọi API, loading state, error state và cache.
- Mutation: thao tác ghi dữ liệu như tạo alert, xóa transaction hoặc đổi role user.
- Socket.IO: kênh realtime giữa backend và frontend.
- Event realtime: thông điệp như `price:updated`, `exchange-rate:updated`, `spread:updated`. Khi nhận event, frontend cập nhật dữ liệu liên quan.
- DTO: Data Transfer Object, cấu trúc dữ liệu backend trả về cho frontend.
- Service worker: script chạy nền trong trình duyệt, dùng cho push notification và một số tác vụ nền.

Các tính năng liên quan:

- API hooks trong `apps/web/src/lib`: tạo một lớp trung gian giữa component và HTTP API. Component không cần biết endpoint cụ thể, chỉ cần gọi hook đúng.
- Realtime provider: kết nối Socket.IO một lần ở shell và phân phối update tới cache.
- UI primitives: `Button`, `Input`, `Dialog`, `Tabs`, `Tooltip`, `Select`, `Switch`, `Badge` giúp giao diện nhất quán và giảm lặp code.
- `PriceChart`: component chart trung tâm, dùng lại ở Overview, Markets và các công cụ phân tích giá.

## 11. Ghi Chú Vận Hành

- Dữ liệu realtime đi qua Socket.IO và cập nhật TanStack Query cache, nên nhiều trang tự refresh mà không cần reload.
- Các route portfolio, assets, profile/history, converter, dca hiện được bọc `ProtectedRoute` hoặc yêu cầu user trong navigation.
- Admin area kiểm tra role admin ở layout trước khi render trang con.
- Một số công cụ như inflation, compound interest, FIRE chạy hoàn toàn client-side bằng `useMemo`, không gọi API.
- Bảng tỷ giá ngoại tệ trong `OverviewPage` hiện render từ `ExchangeRateDto.currencyRates` do API `/exchange-rate/rates` trả về.
