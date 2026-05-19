import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { PrismaClient, GoldBrand, GoldType, CrawlStatus, UserStatus, UserRole, AlertCondition, AlertStatus, ForecastDirection } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number, hour = 8, minute = 30): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 3_600_000);
}

function rand(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function generatePriceSeries(
  startPrice: number,
  count: number,
  volatility = 0.003,
  drift = 0.0001,
): number[] {
  const series: number[] = [startPrice];
  for (let i = 1; i < count; i++) {
    const prev = series[i - 1]!;
    const change = prev * (drift + (Math.random() - 0.5) * 2 * volatility);
    series.push(Math.round(prev + change));
  }
  return series;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Seeding database…');

  // ── 0. Cleanup (reverse FK order) ──────────────────────────────────────────
  console.log('  → Cleaning old data');
  await prisma.alertTriggerHistory.deleteMany();
  await prisma.anomalyReview.deleteMany();
  await prisma.smartAlert.deleteMany();
  await prisma.priceAlert.deleteMany();
  await prisma.behavioralEvent.deleteMany();
  await prisma.viewHistory.deleteMany();
  await prisma.portfolioTransaction.deleteMany();
  await prisma.userPreference.deleteMany();
  await prisma.userForecastScore.deleteMany();
  await prisma.forecastVote.deleteMany();
  await prisma.forecastSession.deleteMany();
  await prisma.goldDigest.deleteMany();
  await prisma.morningDigest.deleteMany();
  await prisma.heatIndexRecord.deleteMany();
  await prisma.exchangeRate.deleteMany();
  await prisma.priceRecord.deleteMany();
  await prisma.crawlSession.deleteMany();
  await prisma.loginAttempt.deleteMany();
  await prisma.emailVerification.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.adminAuditLog.deleteMany();
  // Keep users so we can upsert — delete non-seeded first to avoid dupes
  await prisma.user.deleteMany({
    where: { email: { notIn: ['admin@gpls.vn', 'user@gpls.vn', 'trader@gpls.vn'] } },
  });

  // ── 1. Data Sources ────────────────────────────────────────────────────────
  console.log('  → DataSources');
  const [dsSjc, dsDoji, dsPnj, dsBaoTin] = await Promise.all([
    prisma.dataSource.upsert({
      where: { id: 'ds-sjc' },
      update: { lastCrawledAt: hoursAgo(0.5) },
      create: { id: 'ds-sjc', name: 'SJC Website', brand: GoldBrand.SJC, url: 'https://sjc.com.vn/GoldPrice/Index.aspx', crawlType: 'html', frequencyMin: 5, isActive: true, lastCrawledAt: hoursAgo(0.5) },
    }),
    prisma.dataSource.upsert({
      where: { id: 'ds-doji' },
      update: { lastCrawledAt: hoursAgo(0.5) },
      create: { id: 'ds-doji', name: 'DOJI Website', brand: GoldBrand.DOJI, url: 'https://www.doji.vn/gia-vang', crawlType: 'html', frequencyMin: 5, isActive: true, lastCrawledAt: hoursAgo(0.5) },
    }),
    prisma.dataSource.upsert({
      where: { id: 'ds-pnj' },
      update: { lastCrawledAt: hoursAgo(0.5) },
      create: { id: 'ds-pnj', name: 'PNJ Website', brand: GoldBrand.PNJ, url: 'https://www.pnj.com.vn/blog/gia-vang', crawlType: 'html', frequencyMin: 5, isActive: true, lastCrawledAt: hoursAgo(0.5) },
    }),
    prisma.dataSource.upsert({
      where: { id: 'ds-bao-tin' },
      update: { lastCrawledAt: hoursAgo(1) },
      create: { id: 'ds-bao-tin', name: 'Bảo Tín Minh Châu', brand: GoldBrand.BAO_TIN, url: 'https://www.baotinminhchau.com/gia-vang', crawlType: 'html', frequencyMin: 10, isActive: true, lastCrawledAt: hoursAgo(1) },
    }),
  ]);

  // ── 2. Price History (365 days SJC MIEN_SJC, 90 days others) ───────────────
  console.log('  → PriceRecords');

  const DAYS_SJC = 365;
  const DAYS_OTHER = 90;

  const basePrices: Record<string, { buy: number; spread: number }> = {
    SJC:     { buy: 76_420_000, spread: 2_500_000 },
    DOJI:    { buy: 76_300_000, spread: 2_400_000 },
    PNJ:     { buy: 76_350_000, spread: 2_450_000 },
    BAO_TIN: { buy: 76_200_000, spread: 2_350_000 },
  };

  // Create a single seed CrawlSession per DataSource for bulk price inserts
  const seedSessions = await Promise.all([
    prisma.crawlSession.create({ data: { dataSourceId: dsSjc.id, startedAt: new Date(), completedAt: new Date(), status: CrawlStatus.completed } }),
    prisma.crawlSession.create({ data: { dataSourceId: dsDoji.id, startedAt: new Date(), completedAt: new Date(), status: CrawlStatus.completed } }),
    prisma.crawlSession.create({ data: { dataSourceId: dsPnj.id, startedAt: new Date(), completedAt: new Date(), status: CrawlStatus.completed } }),
    prisma.crawlSession.create({ data: { dataSourceId: dsBaoTin.id, startedAt: new Date(), completedAt: new Date(), status: CrawlStatus.completed } }),
  ]);
  const [sessSjc, sessDoji, sessPnj, sessBaoTin] = seedSessions;

  type BrandConfig = { sessionId: string; brand: GoldBrand; goldType: GoldType; days: number; dsKey: string };
  const brandConfigs: BrandConfig[] = [
    { sessionId: sessSjc.id,    brand: GoldBrand.SJC,     goldType: GoldType.MIEN_SJC,  days: DAYS_SJC,   dsKey: 'SJC' },
    { sessionId: sessDoji.id,   brand: GoldBrand.DOJI,    goldType: GoldType.NHAN_9999, days: DAYS_OTHER, dsKey: 'DOJI' },
    { sessionId: sessPnj.id,    brand: GoldBrand.PNJ,     goldType: GoldType.NHAN_9999, days: DAYS_OTHER, dsKey: 'PNJ' },
    { sessionId: sessBaoTin.id, brand: GoldBrand.BAO_TIN, goldType: GoldType.NHAN_9999, days: DAYS_OTHER, dsKey: 'BAO_TIN' },
  ];

  // Sessions at: 08:30, 10:00, 12:00, 14:00, 15:30 (5 snapshots per day)
  const INTRA_HOURS = [0, 1.5, 3.5, 5.5, 7];

  for (const { sessionId, brand, goldType, days, dsKey } of brandConfigs) {
    const base = basePrices[dsKey]!;
    const buySeries = generatePriceSeries(base.buy, days + 1, 0.004, 0.0002);
    const priceRows: {
      crawlSessionId: string;
      brand: GoldBrand;
      goldType: GoldType;
      buyPrice: bigint;
      sellPrice: bigint;
      recordedAt: Date;
    }[] = [];

    for (let day = days; day >= 0; day--) {
      const baseDate = daysAgo(day);
      const buyPrice = buySeries[days - day]!;
      const spreadBase = base.spread + rand(-50_000, 50_000);

      for (const offsetH of INTRA_HOURS) {
        const recordedAt = new Date(baseDate.getTime() + offsetH * 3_600_000);
        const intraBuy  = BigInt(buyPrice + rand(-30_000, 30_000));
        const intraSell = intraBuy + BigInt(spreadBase + rand(-20_000, 20_000));
        priceRows.push({ crawlSessionId: sessionId, brand, goldType, buyPrice: intraBuy, sellPrice: intraSell, recordedAt });
      }
    }

    // Insert in chunks of 500 to avoid query size limits
    for (let i = 0; i < priceRows.length; i += 500) {
      await prisma.priceRecord.createMany({ data: priceRows.slice(i, i + 500) });
    }
    console.log(`     ${brand} ${goldType}: ${priceRows.length} records`);
  }

  // ── 3. Exchange Rates (365 days) ────────────────────────────────────────────
  console.log('  → ExchangeRates (365 days)');
  const usdVndBase = 25_480, eurVndBase = 27_900;
  const exchangeRows = [];
  for (let day = DAYS_SJC; day >= 0; day--) {
    const at = daysAgo(day);
    exchangeRows.push(
      { fromCurrency: 'USD', toCurrency: 'VND', rate: usdVndBase + rand(-120, 120), source: 'api', recordedAt: at },
      { fromCurrency: 'EUR', toCurrency: 'VND', rate: eurVndBase + rand(-180, 180), source: 'api', recordedAt: at },
    );
  }
  for (let i = 0; i < exchangeRows.length; i += 500) {
    await prisma.exchangeRate.createMany({ data: exchangeRows.slice(i, i + 500) });
  }

  // ── 4. Heat Index Records (365 days, 4× per day) ────────────────────────────
  console.log('  → HeatIndexRecords');
  const heatRows = [];
  for (let day = DAYS_SJC; day >= 1; day--) {
    const baseVal = rand(25, 80);
    for (let slot = 0; slot < 4; slot++) {
      const val = Math.min(100, Math.max(0, baseVal + rand(-8, 8)));
      const category = val <= 33 ? 'cold' : val <= 66 ? 'warm' : 'hot';
      heatRows.push({
        indexValue: val, category,
        priceVelocity: parseFloat((0.5 + Math.random() * 2.5).toFixed(4)),
        spreadSize: BigInt(2_200_000 + rand(-200_000, 500_000)),
        thresholdCrossings: rand(0, 5),
        calculatedAt: new Date(daysAgo(day).getTime() + slot * 2 * 3_600_000),
      });
    }
  }
  heatRows.push({ indexValue: 62, category: 'warm', priceVelocity: 1.42, spreadSize: BigInt(2_500_000), thresholdCrossings: 2, calculatedAt: new Date() });
  for (let i = 0; i < heatRows.length; i += 500) {
    await prisma.heatIndexRecord.createMany({ data: heatRows.slice(i, i + 500) });
  }

  // ── 5. Users (3 fixed + 30 leaderboard users) ──────────────────────────────
  console.log('  → Users');
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@gpls.vn' },
    update: {},
    create: { email: 'admin@gpls.vn', passwordHash, status: UserStatus.active, role: UserRole.admin, displayName: 'Admin GPLS', digestOptIn: true },
  });
  const testUser = await prisma.user.upsert({
    where: { email: 'user@gpls.vn' },
    update: {},
    create: { email: 'user@gpls.vn', passwordHash, status: UserStatus.active, role: UserRole.user, displayName: 'Nguyễn Văn A', digestOptIn: true },
  });
  const testUser2 = await prisma.user.upsert({
    where: { email: 'trader@gpls.vn' },
    update: {},
    create: { email: 'trader@gpls.vn', passwordHash, status: UserStatus.active, role: UserRole.user, displayName: 'Trần Thị B', digestOptIn: false },
  });

  const leaderboardNames = [
    'Lê Minh Tuấn', 'Phạm Thu Hà', 'Hoàng Văn Đức', 'Ngô Thị Lan', 'Vũ Đình Khoa',
    'Đặng Thị Mai', 'Bùi Quang Huy', 'Đinh Thị Nga', 'Lý Văn Tài', 'Trịnh Thúy Linh',
    'Dương Minh Quân', 'Hồ Thị Xuân', 'Phan Văn Long', 'Mai Thị Hồng', 'Tăng Đức Khải',
    'Cao Thị Yến', 'Nguyễn Thành Nam', 'Trần Minh Châu', 'Lê Thị Phương', 'Phạm Văn Hùng',
    'Võ Thị Thảo', 'Huỳnh Văn Tú', 'Đoàn Thị Bích', 'Nguyễn Quang Vinh', 'Trương Thị Kim',
    'Lưu Minh Hiếu', 'Tạ Thị Nhung', 'Chu Văn Phúc', 'Bạch Thị Hạnh', 'Kiều Văn Sơn',
  ];

  const leaderUsers = await Promise.all(
    leaderboardNames.map((name, i) =>
      prisma.user.create({
        data: {
          email: `player${i + 1}@gpls.vn`,
          passwordHash,
          status: UserStatus.active,
          role: UserRole.user,
          displayName: name,
          digestOptIn: Math.random() > 0.5,
        },
      }),
    ),
  );

  const allUsers = [adminUser, testUser, testUser2, ...leaderUsers];

  // ── 6. Morning Digests + Gold Digests (60 days) ─────────────────────────────
  console.log('  → Digests (60 days)');
  const DIGEST_DAYS = 60;
  const sjcDigestSeries = generatePriceSeries(75_500_000, DIGEST_DAYS + 1, 0.003, 0.0001);
  const highlights = [
    'Vàng SJC tăng mạnh sau dữ liệu CPI Mỹ thấp hơn dự báo.',
    'Giá vàng ổn định khi Fed giữ nguyên lãi suất.',
    'Vàng trong nước giảm nhẹ theo đà giảm của thế giới.',
    'Cầu vàng tiêu dùng tăng cao trước lễ Phật Đản.',
    'Giá vàng thế giới chạm đỉnh 2 tuần, trong nước đi theo.',
    'Spread mua-bán thu hẹp, thanh khoản cải thiện.',
    'Nhà đầu tư chốt lời, giá vàng điều chỉnh nhẹ.',
    'Dữ liệu việc làm Mỹ yếu hỗ trợ giá vàng tăng.',
    'Vàng hưởng lợi từ căng thẳng địa chính trị leo thang.',
    'Giá vàng dao động hẹp, chờ quyết định lãi suất Fed.',
    'Xu hướng giảm ngắn hạn, hỗ trợ kỹ thuật vẫn vững.',
    'Dòng tiền quay lại vàng sau biến động cổ phiếu.',
    'SJC niêm yết cao nhất kể từ tháng trước.',
    'Vàng nhẫn 999.9 được ưa chuộng, thanh khoản tốt.',
    'Đồng USD yếu đi, vàng thế giới tăng nhẹ.',
    'Giá dầu và vàng cùng đi lên trước lo ngại lạm phát.',
    'Nhà đầu tư tích lũy vàng trước mùa lễ hội.',
    'Tỷ giá USD/VND tăng nhẹ, giá vàng ổn định.',
    'Thị trường chờ số liệu kinh tế Mỹ cuối tuần.',
    'Vàng phục hồi sau phiên điều chỉnh hôm qua.',
  ];
  for (let day = DIGEST_DAYS; day >= 1; day--) {
    const d = daysAgo(day);
    const dateStr = d.toISOString().slice(0, 10);
    const buy  = BigInt(sjcDigestSeries[DIGEST_DAYS - day]!);
    const sell = buy + BigInt(2_500_000);
    const xauUsd = 2280 + (DIGEST_DAYS - day) * 0.8 + rand(-20, 20);
    const change = rand(-150, 250) / 100;
    await prisma.morningDigest.upsert({
      where: { date: dateStr },
      update: {},
      create: {
        date: dateStr,
        content: `Bản tin vàng sáng ${dateStr}: Giá vàng SJC mua vào ${(Number(buy) / 1_000_000).toFixed(2)} triệu đồng/lượng. ${highlights[(DIGEST_DAYS - day) % highlights.length]}`,
        sjcBuyPrice: buy, sjcSellPrice: sell, xauUsd, changeVsPrev: change,
        aiGenerated: Math.random() > 0.35,
      },
    });
    await prisma.goldDigest.upsert({
      where: { date: d },
      update: {},
      create: {
        date: d, sjcBuyVnd: buy, sjcSellVnd: sell, xauUsd, pctChangeSjc: change,
        highlight: highlights[(DIGEST_DAYS - day) % highlights.length]!,
        aiSummary: `Phân tích AI ngày ${dateStr}: ${highlights[(DIGEST_DAYS - day) % highlights.length]}`,
      },
    });
  }

  // ── 7. User Preferences / Pins ────────────────────────────────────────────
  console.log('  → UserPreferences');
  const prefCombos: Array<{ brand: GoldBrand; goldType: GoldType; pinOrder?: number }> = [
    { brand: GoldBrand.SJC,     goldType: GoldType.MIEN_SJC,  pinOrder: 0 },
    { brand: GoldBrand.DOJI,    goldType: GoldType.NHAN_9999, pinOrder: 1 },
    { brand: GoldBrand.PNJ,     goldType: GoldType.NHAN_9999, pinOrder: 2 },
    { brand: GoldBrand.BAO_TIN, goldType: GoldType.NHAN_9999 },
    { brand: GoldBrand.SJC,     goldType: GoldType.VANG_24K },
  ];
  for (const u of [testUser, testUser2, ...leaderUsers.slice(0, 5)]) {
    for (const { brand, goldType, pinOrder } of prefCombos) {
      await prisma.userPreference.upsert({
        where: { userId_brand_goldType: { userId: u.id, brand, goldType } },
        update: {},
        create: { userId: u.id, brand, goldType, viewCount: rand(1, 30), isPinned: pinOrder !== undefined, pinOrder: pinOrder ?? null },
      });
    }
  }

  // ── 8. View History (30+ per key user) ─────────────────────────────────────
  console.log('  → ViewHistory');
  const viewBrands: Array<{ brand: GoldBrand; goldType: GoldType }> = [
    { brand: GoldBrand.SJC,     goldType: GoldType.MIEN_SJC  },
    { brand: GoldBrand.DOJI,    goldType: GoldType.NHAN_9999 },
    { brand: GoldBrand.PNJ,     goldType: GoldType.NHAN_9999 },
    { brand: GoldBrand.BAO_TIN, goldType: GoldType.NHAN_9999 },
  ];
  const viewRows = [];
  for (const u of [testUser, testUser2]) {
    for (let i = 0; i < 35; i++) {
      const vb = pick(viewBrands);
      viewRows.push({
        userId: u.id,
        brand: vb.brand,
        goldType: vb.goldType,
        buyPrice: BigInt(76_000_000 + rand(-500_000, 1_500_000)),
        viewedAt: daysAgo(rand(0, 60), rand(7, 20), rand(0, 59)),
      });
    }
  }
  await prisma.viewHistory.createMany({ data: viewRows });

  // ── 9. Portfolio Transactions (35+ per user) ───────────────────────────────
  console.log('  → PortfolioTransactions');
  const portfolioBrands: Array<{ brand: GoldBrand; goldType: GoldType }> = [
    { brand: GoldBrand.SJC,  goldType: GoldType.MIEN_SJC  },
    { brand: GoldBrand.DOJI, goldType: GoldType.NHAN_9999 },
    { brand: GoldBrand.PNJ,  goldType: GoldType.NHAN_9999 },
  ];
  const portfolioRows = [];
  for (const u of [testUser, testUser2]) {
    for (let i = 0; i < 36; i++) {
      const pb = pick(portfolioBrands);
      const type = Math.random() > 0.35 ? 'buy' : 'sell';
      portfolioRows.push({
        userId: u.id, type, brand: pb.brand, goldType: pb.goldType,
        quantity: parseFloat((Math.random() * 3 + 0.25).toFixed(2)),
        pricePerTael: BigInt(74_000_000 + rand(0, 4_000_000)),
        transactedAt: daysAgo(rand(0, 180), rand(7, 17), rand(0, 59)),
        note: type === 'buy' ? pick(['Tích lũy dài hạn', 'DCA tháng này', 'Mua thêm', null]) : pick(['Chốt lời', 'Cần tiền', null]),
      });
    }
  }
  await prisma.portfolioTransaction.createMany({ data: portfolioRows });

  // ── 10. Price Alerts (35+ across users) ────────────────────────────────────
  console.log('  → PriceAlerts');
  const alertSpecs = [
    { condition: AlertCondition.gte, threshold: 78_000_000, status: AlertStatus.active   },
    { condition: AlertCondition.lte, threshold: 74_000_000, status: AlertStatus.active   },
    { condition: AlertCondition.gte, threshold: 77_500_000, status: AlertStatus.triggered },
    { condition: AlertCondition.lte, threshold: 75_000_000, status: AlertStatus.active   },
    { condition: AlertCondition.gte, threshold: 79_000_000, status: AlertStatus.active   },
    { condition: AlertCondition.lte, threshold: 73_000_000, status: AlertStatus.inactive },
    { condition: AlertCondition.gte, threshold: 80_000_000, status: AlertStatus.active   },
  ];
  for (const u of [testUser, testUser2, ...leaderUsers.slice(0, 5)]) {
    for (const spec of alertSpecs) {
      await prisma.priceAlert.create({
        data: {
          userId: u.id,
          brand: Math.random() > 0.4 ? GoldBrand.SJC : pick([GoldBrand.DOJI, GoldBrand.PNJ, GoldBrand.BAO_TIN]),
          goldType: Math.random() > 0.4 ? GoldType.MIEN_SJC : GoldType.NHAN_9999,
          thresholdPrice: BigInt(spec.threshold + rand(-500_000, 500_000)),
          condition: spec.condition,
          status: spec.status,
          repeatMode: Math.random() > 0.7,
          lastTriggeredAt: spec.status === AlertStatus.triggered ? daysAgo(rand(1, 7)) : null,
        },
      });
    }
  }

  // ── 11. Smart Alerts ───────────────────────────────────────────────────────
  console.log('  → SmartAlerts');
  await prisma.smartAlert.createMany({
    data: [
      { userId: testUser.id,  brand: GoldBrand.SJC,  goldType: GoldType.MIEN_SJC,  condition1: { type: 'price_gte', value: 78_000_000 }, condition2: { type: 'spread_lte', value: 2_000_000 }, status: AlertStatus.active },
      { userId: testUser2.id, brand: GoldBrand.DOJI, goldType: GoldType.NHAN_9999, condition1: { type: 'heat_gte', value: 70 },           status: AlertStatus.active },
      { userId: testUser.id,  brand: GoldBrand.PNJ,  goldType: GoldType.NHAN_9999, condition1: { type: 'price_lte', value: 74_000_000 },  status: AlertStatus.active },
      { userId: adminUser.id, brand: GoldBrand.SJC,  goldType: GoldType.MIEN_SJC,  condition1: { type: 'heat_gte', value: 80 },           status: AlertStatus.active },
    ],
  });

  // ── 12. Behavioral Events (35+ per user) ──────────────────────────────────
  console.log('  → BehavioralEvents');
  const eventRows = [];
  for (const u of [testUser, testUser2, adminUser]) {
    for (let i = 0; i < 36; i++) {
      const vb = pick(viewBrands);
      eventRows.push({
        userId: u.id,
        brand: vb.brand,
        goldType: vb.goldType,
        eventType: pick(['view', 'view', 'view', 'click', 'alert_create']),
        occurredAt: daysAgo(rand(0, 60), rand(7, 22), rand(0, 59)),
      });
    }
  }
  await prisma.behavioralEvent.createMany({ data: eventRows });

  // ── 13. Forecast Sessions (60 days closed + today open) ───────────────────
  console.log('  → ForecastSessions + Votes');
  const FORECAST_DAYS = 60;
  const directionCycle: ForecastDirection[] = [
    ForecastDirection.up, ForecastDirection.up, ForecastDirection.flat,
    ForecastDirection.down, ForecastDirection.up, ForecastDirection.up,
    ForecastDirection.flat, ForecastDirection.down, ForecastDirection.up,
    ForecastDirection.up, ForecastDirection.down, ForecastDirection.up,
  ];

  const voteChoices: ForecastDirection[] = [ForecastDirection.up, ForecastDirection.down, ForecastDirection.flat];
  const votingUsers = allUsers; // all 33 users

  for (let day = FORECAST_DAYS; day >= 1; day--) {
    const d = daysAgo(day);
    const dateStr = d.toISOString().slice(0, 10);
    const opensAt  = new Date(d); opensAt.setHours(7, 0, 0, 0);
    const closesAt = new Date(d); closesAt.setHours(9, 0, 0, 0);
    const actual = directionCycle[(FORECAST_DAYS - day) % directionCycle.length]!;

    const session = await prisma.forecastSession.upsert({
      where: { date: dateStr },
      update: {},
      create: { date: dateStr, opensAt, closesAt, sessionClosed: true, scoredAt: closesAt, actualResult: actual },
    });

    // Not all users vote every day — 60–90% participation
    const participants = votingUsers.filter(() => Math.random() > 0.2);
    for (const u of participants) {
      const dir = pick(voteChoices);
      await prisma.forecastVote.upsert({
        where: { sessionId_userId: { sessionId: session.id, userId: u.id } },
        update: {},
        create: {
          sessionId: session.id, userId: u.id, direction: dir,
          isCorrect: dir === actual,
          votedAt: new Date(opensAt.getTime() + rand(60, 7200) * 1000),
        },
      });
    }
  }

  // Today's open session
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayOpens  = new Date(); todayOpens.setHours(7, 0, 0, 0);
  const todayCloses = new Date(); todayCloses.setHours(9, 0, 0, 0);
  await prisma.forecastSession.upsert({
    where: { date: todayStr },
    update: {},
    create: { date: todayStr, opensAt: todayOpens, closesAt: todayCloses, sessionClosed: false },
  });

  // ── 14. Forecast Scores (all users, current + last 2 months) ──────────────
  console.log('  → UserForecastScores');
  const now = new Date();
  const months = [
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`,
    `${now.getFullYear()}-${String(Math.max(1, now.getMonth() - 1)).padStart(2, '0')}`,
  ];
  // Assign realistic scores — higher-ranked names get higher scores
  for (const u of allUsers) {
    const rank = allUsers.indexOf(u);
    for (const month of months) {
      const basePoints = Math.max(10, 150 - rank * 4 + rand(-20, 20));
      await prisma.userForecastScore.upsert({
        where: { userId_month: { userId: u.id, month } },
        update: {},
        create: {
          userId: u.id, month,
          totalPoints: Math.max(0, basePoints),
          correctCount: Math.round(basePoints / 12),
          streak: rand(0, Math.min(8, Math.round(basePoints / 15))),
        },
      });
    }
  }

  console.log('\n✅  Seed complete!');
  console.log(`   Users: ${allUsers.length} total`);
  console.log('   Accounts (password: Password123!):');
  console.log('   • admin@gpls.vn   (admin)');
  console.log('   • user@gpls.vn    (user)');
  console.log('   • trader@gpls.vn  (user)');
  console.log('   • player1–30@gpls.vn (leaderboard users)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
