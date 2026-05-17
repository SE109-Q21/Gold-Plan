import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { PrismaClient, GoldBrand, GoldType, CrawlStatus, UserStatus, UserRole, AlertCondition, AlertStatus, ForecastDirection } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(8, 30, 0, 0);
  return d;
}

function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 3_600_000);
}

function randomBetween(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

/** Walk a price series with slight drift and noise */
function generatePriceSeries(
  startPrice: number,
  count: number,
  volatility = 0.003,
  drift = 0.0001,
): number[] {
  const series: number[] = [startPrice];
  for (let i = 1; i < count; i++) {
    const prev = series[i - 1];
    const change = prev * (drift + (Math.random() - 0.5) * 2 * volatility);
    series.push(Math.round(prev + change));
  }
  return series;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Seeding database…');

  // ── 1. Data Sources ────────────────────────────────────────────────────────
  console.log('  → DataSources');
  const sources = await Promise.all([
    prisma.dataSource.upsert({
      where: { id: 'ds-sjc' },
      update: {},
      create: {
        id: 'ds-sjc',
        name: 'SJC Website',
        brand: GoldBrand.SJC,
        url: 'https://sjc.com.vn/GoldPrice/Index.aspx',
        crawlType: 'html',
        frequencyMin: 5,
        isActive: true,
        lastCrawledAt: hoursAgo(1),
      },
    }),
    prisma.dataSource.upsert({
      where: { id: 'ds-doji' },
      update: {},
      create: {
        id: 'ds-doji',
        name: 'DOJI Website',
        brand: GoldBrand.DOJI,
        url: 'https://www.doji.vn/gia-vang',
        crawlType: 'html',
        frequencyMin: 5,
        isActive: true,
        lastCrawledAt: hoursAgo(1),
      },
    }),
    prisma.dataSource.upsert({
      where: { id: 'ds-pnj' },
      update: {},
      create: {
        id: 'ds-pnj',
        name: 'PNJ Website',
        brand: GoldBrand.PNJ,
        url: 'https://www.pnj.com.vn/blog/gia-vang',
        crawlType: 'html',
        frequencyMin: 5,
        isActive: true,
        lastCrawledAt: hoursAgo(1),
      },
    }),
    prisma.dataSource.upsert({
      where: { id: 'ds-bao-tin' },
      update: {},
      create: {
        id: 'ds-bao-tin',
        name: 'Bảo Tín Minh Châu',
        brand: GoldBrand.BAO_TIN,
        url: 'https://www.baotinminhchau.com/gia-vang',
        crawlType: 'html',
        frequencyMin: 10,
        isActive: true,
        lastCrawledAt: hoursAgo(2),
      },
    }),
  ]);
  const [dsSjc, dsDoji, dsPnj, dsBaoTin] = sources;

  // ── 2. Price History (30 days × 4 brands) ─────────────────────────────────
  console.log('  → PriceRecords (30 days)');

  const DAYS = 30;

  // Base buy prices per brand (VND, realistic 2024 values)
  const basePrices: Record<string, { buy: number; spread: number }> = {
    SJC:     { buy: 76_420_000, spread: 2_500_000 },
    DOJI:    { buy: 76_300_000, spread: 2_400_000 },
    PNJ:     { buy: 76_350_000, spread: 2_450_000 },
    BAO_TIN: { buy: 76_200_000, spread: 2_350_000 },
  };

  const brandConfig: Array<{ ds: typeof dsSjc; brand: GoldBrand; goldType: GoldType }> = [
    { ds: dsSjc,    brand: GoldBrand.SJC,     goldType: GoldType.MIEN_SJC },
    { ds: dsDoji,   brand: GoldBrand.DOJI,    goldType: GoldType.NHAN_9999 },
    { ds: dsPnj,    brand: GoldBrand.PNJ,     goldType: GoldType.NHAN_9999 },
    { ds: dsBaoTin, brand: GoldBrand.BAO_TIN, goldType: GoldType.NHAN_9999 },
  ];

  for (const { ds, brand, goldType } of brandConfig) {
    const base = basePrices[brand];
    const buySeries = generatePriceSeries(base.buy, DAYS + 1, 0.004, 0.0002);

    for (let day = DAYS; day >= 0; day--) {
      const sessionDate = daysAgo(day);
      const buyPrice = BigInt(buySeries[DAYS - day]);
      const sellPrice = buyPrice + BigInt(base.spread + randomBetween(-50_000, 50_000));

      // 3 sessions per day: morning, midday, close
      const offsets = [0, 4, 7]; // hours after 08:30
      for (const offsetH of offsets) {
        const sessionAt = new Date(sessionDate.getTime() + offsetH * 3_600_000);
        const session = await prisma.crawlSession.create({
          data: {
            dataSourceId: ds.id,
            startedAt: sessionAt,
            completedAt: new Date(sessionAt.getTime() + 12_000),
            status: CrawlStatus.completed,
          },
        });

        // tiny intra-day variation
        const intraBuy = buyPrice + BigInt(randomBetween(-30_000, 30_000));
        const intraSell = sellPrice + BigInt(randomBetween(-20_000, 20_000));

        await prisma.priceRecord.create({
          data: {
            crawlSessionId: session.id,
            brand,
            goldType,
            buyPrice: intraBuy,
            sellPrice: intraSell,
            recordedAt: sessionAt,
          },
        });
      }
    }
  }

  // ── 3. Exchange Rates (30 days) ────────────────────────────────────────────
  console.log('  → ExchangeRates');
  const usdVndBase = 25_480;
  const eurVndBase = 27_900;
  for (let day = DAYS; day >= 0; day--) {
    const at = daysAgo(day);
    await prisma.exchangeRate.createMany({
      data: [
        {
          fromCurrency: 'USD',
          toCurrency: 'VND',
          rate: usdVndBase + randomBetween(-80, 80),
          source: 'api',
          recordedAt: at,
        },
        {
          fromCurrency: 'EUR',
          toCurrency: 'VND',
          rate: eurVndBase + randomBetween(-120, 120),
          source: 'api',
          recordedAt: at,
        },
      ],
    });
  }

  // ── 4. Heat Index Records (30 days, 4× per day) ───────────────────────────
  console.log('  → HeatIndexRecords');
  const heatCategories = ['cold', 'warm', 'hot'];
  const heatBase = [22, 45, 68, 55, 71, 38, 29, 62, 74, 48,
                    33, 57, 65, 41, 78, 52, 36, 61, 44, 70,
                    55, 38, 49, 67, 82, 53, 40, 72, 58, 35];
  for (let day = DAYS; day >= 1; day--) {
    const baseVal = heatBase[DAYS - day] ?? 50;
    for (let slot = 0; slot < 4; slot++) {
      const val = Math.min(100, Math.max(0, baseVal + randomBetween(-8, 8)));
      const category = val <= 33 ? heatCategories[0] : val <= 66 ? heatCategories[1] : heatCategories[2];
      const at = new Date(daysAgo(day).getTime() + slot * 2 * 3_600_000);
      await prisma.heatIndexRecord.create({
        data: {
          indexValue: val,
          category: category!,
          priceVelocity: (0.5 + Math.random() * 2.5).toFixed(4),
          spreadSize: BigInt(2_200_000 + randomBetween(-200_000, 500_000)),
          thresholdCrossings: randomBetween(0, 5),
          calculatedAt: at,
        },
      });
    }
  }
  // Today's record
  await prisma.heatIndexRecord.create({
    data: {
      indexValue: 62,
      category: 'warm',
      priceVelocity: '1.4200',
      spreadSize: BigInt(2_500_000),
      thresholdCrossings: 2,
      calculatedAt: new Date(),
    },
  });

  // ── 5. Morning Digests (last 14 days) ─────────────────────────────────────
  console.log('  → MorningDigests + GoldDigests');
  const sjcBuySeries = generatePriceSeries(76_420_000, 15, 0.003, 0.0001);
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
  ];
  for (let day = 14; day >= 1; day--) {
    const d = daysAgo(day);
    const dateStr = d.toISOString().slice(0, 10);
    const buy = BigInt(sjcBuySeries[14 - day]);
    const sell = buy + BigInt(2_500_000);
    const xauUsd = 2300 + (14 - day) * 3.2 + randomBetween(-15, 15);
    const change = randomBetween(-120, 200) / 100;

    await prisma.morningDigest.upsert({
      where: { date: dateStr },
      update: {},
      create: {
        date: dateStr,
        content: `Bản tin vàng sáng ${dateStr}: Giá vàng SJC mua vào ${(Number(buy) / 1_000_000).toFixed(2)} triệu đồng/lượng. ${highlights[(14 - day) % highlights.length]}`,
        sjcBuyPrice: buy,
        sjcSellPrice: sell,
        xauUsd,
        changeVsPrev: change,
        aiGenerated: Math.random() > 0.4,
      },
    });

    await prisma.goldDigest.upsert({
      where: { date: d },
      update: {},
      create: {
        date: d,
        sjcBuyVnd: buy,
        sjcSellVnd: sell,
        xauUsd,
        pctChangeSjc: change,
        highlight: highlights[(14 - day) % highlights.length]!,
        aiSummary: `Phân tích AI: ${highlights[(14 - day) % highlights.length]}`,
      },
    });
  }

  // ── 6. Users ───────────────────────────────────────────────────────────────
  console.log('  → Users');
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@gpls.vn' },
    update: {},
    create: {
      email: 'admin@gpls.vn',
      passwordHash,
      status: UserStatus.active,
      role: UserRole.admin,
      displayName: 'Admin GPLS',
      digestOptIn: true,
    },
  });

  const testUser = await prisma.user.upsert({
    where: { email: 'user@gpls.vn' },
    update: {},
    create: {
      email: 'user@gpls.vn',
      passwordHash,
      status: UserStatus.active,
      role: UserRole.user,
      displayName: 'Nguyễn Văn A',
      digestOptIn: true,
    },
  });

  const testUser2 = await prisma.user.upsert({
    where: { email: 'trader@gpls.vn' },
    update: {},
    create: {
      email: 'trader@gpls.vn',
      passwordHash,
      status: UserStatus.active,
      role: UserRole.user,
      displayName: 'Trần Thị B',
      digestOptIn: false,
    },
  });

  // ── 7. User Preferences / Pins ────────────────────────────────────────────
  console.log('  → UserPreferences');
  await prisma.userPreference.upsert({
    where: { userId_brand_goldType: { userId: testUser.id, brand: GoldBrand.SJC, goldType: GoldType.MIEN_SJC } },
    update: {},
    create: { userId: testUser.id, brand: GoldBrand.SJC, goldType: GoldType.MIEN_SJC, viewCount: 15, isPinned: true, pinOrder: 0 },
  });
  await prisma.userPreference.upsert({
    where: { userId_brand_goldType: { userId: testUser.id, brand: GoldBrand.DOJI, goldType: GoldType.NHAN_9999 } },
    update: {},
    create: { userId: testUser.id, brand: GoldBrand.DOJI, goldType: GoldType.NHAN_9999, viewCount: 8, isPinned: true, pinOrder: 1 },
  });
  await prisma.userPreference.upsert({
    where: { userId_brand_goldType: { userId: testUser.id, brand: GoldBrand.PNJ, goldType: GoldType.NHAN_9999 } },
    update: {},
    create: { userId: testUser.id, brand: GoldBrand.PNJ, goldType: GoldType.NHAN_9999, viewCount: 5, isPinned: false },
  });

  // ── 8. View History ───────────────────────────────────────────────────────
  console.log('  → ViewHistory');
  const viewEntries = [
    { brand: GoldBrand.SJC,     goldType: GoldType.MIEN_SJC,  buyPrice: BigInt(76_420_000), daysBack: 0 },
    { brand: GoldBrand.DOJI,    goldType: GoldType.NHAN_9999, buyPrice: BigInt(76_300_000), daysBack: 1 },
    { brand: GoldBrand.PNJ,     goldType: GoldType.NHAN_9999, buyPrice: BigInt(76_350_000), daysBack: 2 },
    { brand: GoldBrand.BAO_TIN, goldType: GoldType.NHAN_9999, buyPrice: BigInt(76_200_000), daysBack: 5 },
    { brand: GoldBrand.SJC,     goldType: GoldType.MIEN_SJC,  buyPrice: BigInt(76_100_000), daysBack: 7 },
  ];
  for (const e of viewEntries) {
    await prisma.viewHistory.create({
      data: { userId: testUser.id, brand: e.brand, goldType: e.goldType, buyPrice: e.buyPrice, viewedAt: daysAgo(e.daysBack) },
    });
  }

  // ── 9. Portfolio Transactions ──────────────────────────────────────────────
  console.log('  → PortfolioTransactions');
  await prisma.portfolioTransaction.createMany({
    data: [
      { userId: testUser.id, type: 'buy',  brand: GoldBrand.SJC,  goldType: GoldType.MIEN_SJC,  quantity: 2,    pricePerTael: BigInt(74_500_000), transactedAt: daysAgo(25), note: 'Mua vàng tích lũy' },
      { userId: testUser.id, type: 'buy',  brand: GoldBrand.DOJI, goldType: GoldType.NHAN_9999, quantity: 1,    pricePerTael: BigInt(75_200_000), transactedAt: daysAgo(15), note: 'Mua thêm' },
      { userId: testUser.id, type: 'sell', brand: GoldBrand.SJC,  goldType: GoldType.MIEN_SJC,  quantity: 0.5,  pricePerTael: BigInt(76_800_000), transactedAt: daysAgo(8),  note: 'Chốt lời một phần' },
      { userId: testUser.id, type: 'buy',  brand: GoldBrand.PNJ,  goldType: GoldType.NHAN_9999, quantity: 3,    pricePerTael: BigInt(76_350_000), transactedAt: daysAgo(3),  note: 'DCA tháng 5' },
      { userId: testUser2.id, type: 'buy', brand: GoldBrand.SJC,  goldType: GoldType.MIEN_SJC,  quantity: 1,    pricePerTael: BigInt(75_800_000), transactedAt: daysAgo(20), note: null },
      { userId: testUser2.id, type: 'buy', brand: GoldBrand.BAO_TIN, goldType: GoldType.NHAN_9999, quantity: 2, pricePerTael: BigInt(76_100_000), transactedAt: daysAgo(10), note: null },
    ],
  });

  // ── 10. Price Alerts ───────────────────────────────────────────────────────
  console.log('  → PriceAlerts');
  const alert1 = await prisma.priceAlert.create({
    data: {
      userId: testUser.id,
      brand: GoldBrand.SJC,
      goldType: GoldType.MIEN_SJC,
      thresholdPrice: BigInt(78_000_000),
      condition: AlertCondition.gte,
      status: AlertStatus.active,
      repeatMode: false,
    },
  });
  const alert2 = await prisma.priceAlert.create({
    data: {
      userId: testUser.id,
      brand: GoldBrand.SJC,
      goldType: GoldType.MIEN_SJC,
      thresholdPrice: BigInt(74_000_000),
      condition: AlertCondition.lte,
      status: AlertStatus.active,
      repeatMode: true,
    },
  });
  await prisma.priceAlert.create({
    data: {
      userId: testUser.id,
      brand: GoldBrand.DOJI,
      goldType: GoldType.NHAN_9999,
      thresholdPrice: BigInt(77_500_000),
      condition: AlertCondition.gte,
      status: AlertStatus.triggered,
      lastTriggeredAt: daysAgo(3),
    },
  });
  await prisma.alertTriggerHistory.create({
    data: { alertId: alert1.id, triggeredAt: daysAgo(5), priceAtTrigger: BigInt(78_100_000) },
  });
  await prisma.alertTriggerHistory.create({
    data: { alertId: alert2.id, triggeredAt: daysAgo(12), priceAtTrigger: BigInt(73_900_000) },
  });

  // ── 11. Smart Alerts ───────────────────────────────────────────────────────
  console.log('  → SmartAlerts');
  await prisma.smartAlert.createMany({
    data: [
      {
        userId: testUser.id,
        brand: GoldBrand.SJC,
        goldType: GoldType.MIEN_SJC,
        condition1: { type: 'price_gte', value: 78_000_000 },
        condition2: { type: 'spread_lte', value: 2_000_000 },
        status: AlertStatus.active,
      },
      {
        userId: testUser2.id,
        brand: GoldBrand.DOJI,
        goldType: GoldType.NHAN_9999,
        condition1: { type: 'heat_gte', value: 70 },
        status: AlertStatus.active,
      },
    ],
  });

  // ── 12. Forecast Sessions (last 14 days + today) ───────────────────────────
  console.log('  → ForecastSessions + Votes');
  const directions: ForecastDirection[] = [
    ForecastDirection.up, ForecastDirection.up, ForecastDirection.flat,
    ForecastDirection.down, ForecastDirection.up, ForecastDirection.up,
    ForecastDirection.flat, ForecastDirection.down, ForecastDirection.up,
    ForecastDirection.up, ForecastDirection.down, ForecastDirection.up,
    ForecastDirection.flat, ForecastDirection.up,
  ];

  const allUsers = [adminUser, testUser, testUser2];
  const voteChoices: ForecastDirection[] = [ForecastDirection.up, ForecastDirection.down, ForecastDirection.flat];

  for (let day = 14; day >= 1; day--) {
    const d = daysAgo(day);
    const dateStr = d.toISOString().slice(0, 10);
    const opensAt = new Date(d); opensAt.setHours(7, 0, 0, 0);
    const closesAt = new Date(d); closesAt.setHours(9, 0, 0, 0);
    const actual = directions[14 - day]!;

    const session = await prisma.forecastSession.upsert({
      where: { date: dateStr },
      update: {},
      create: {
        date: dateStr,
        opensAt,
        closesAt,
        sessionClosed: true,
        scoredAt: closesAt,
        actualResult: actual,
      },
    });

    for (const u of allUsers) {
      const dir = voteChoices[Math.floor(Math.random() * 3)]!;
      await prisma.forecastVote.upsert({
        where: { sessionId_userId: { sessionId: session.id, userId: u.id } },
        update: {},
        create: {
          sessionId: session.id,
          userId: u.id,
          direction: dir,
          isCorrect: dir === actual,
          votedAt: new Date(opensAt.getTime() + randomBetween(60, 7200) * 1000),
        },
      });
    }
  }

  // Today's open session
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayOpens = new Date(); todayOpens.setHours(7, 0, 0, 0);
  const todayCloses = new Date(); todayCloses.setHours(9, 0, 0, 0);
  await prisma.forecastSession.upsert({
    where: { date: todayStr },
    update: {},
    create: {
      date: todayStr,
      opensAt: todayOpens,
      closesAt: todayCloses,
      sessionClosed: false,
    },
  });

  // ── 13. Forecast Scores ────────────────────────────────────────────────────
  console.log('  → UserForecastScores');
  const month = new Date().toISOString().slice(0, 7);
  for (const u of [testUser, testUser2]) {
    await prisma.userForecastScore.upsert({
      where: { userId_month: { userId: u.id, month } },
      update: {},
      create: {
        userId: u.id,
        month,
        totalPoints: randomBetween(40, 120),
        correctCount: randomBetween(5, 12),
        streak: randomBetween(0, 5),
      },
    });
  }

  // ── 14. Behavioral Events ──────────────────────────────────────────────────
  console.log('  → BehavioralEvents');
  const eventsData = [
    { brand: GoldBrand.SJC,     goldType: GoldType.MIEN_SJC,  daysBack: 0 },
    { brand: GoldBrand.DOJI,    goldType: GoldType.NHAN_9999, daysBack: 1 },
    { brand: GoldBrand.PNJ,     goldType: GoldType.NHAN_9999, daysBack: 1 },
    { brand: GoldBrand.SJC,     goldType: GoldType.MIEN_SJC,  daysBack: 3 },
    { brand: GoldBrand.BAO_TIN, goldType: GoldType.NHAN_9999, daysBack: 4 },
  ];
  for (const e of eventsData) {
    await prisma.behavioralEvent.create({
      data: { userId: testUser.id, brand: e.brand, goldType: e.goldType, eventType: 'view', occurredAt: daysAgo(e.daysBack) },
    });
  }

  console.log('\n✅  Seed complete!');
  console.log('   Accounts created:');
  console.log('   • admin@gpls.vn   / Password123!  (admin)');
  console.log('   • user@gpls.vn    / Password123!  (user, digest on, portfolio, pins)');
  console.log('   • trader@gpls.vn  / Password123!  (user, portfolio)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
