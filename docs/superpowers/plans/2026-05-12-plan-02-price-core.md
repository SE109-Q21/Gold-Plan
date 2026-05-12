# GPLS Plan 2 — Price Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement M01 (SJC/DOJI domestic price crawlers + REST API), M02 (international XAU/USD price), M03 (price history charts), and M04 (brand comparison table) — the complete gold price display layer for R1.

**Architecture:** Two new NestJS modules (`PriceModule`, `InternationalModule`) serve read queries from the Prisma DB; two concrete crawlers (`SjcCrawlerService`, `DojiCrawlerService`) extend `BaseCrawlerService` and self-register with `CrawlSchedulerService` on module init. The Next.js frontend calls these APIs via TanStack Query hooks and renders four components: `PriceTable`, `PriceHistoryChart`, `ComparisonTable`, `InternationalPriceCard`, assembled on the home page.

**Tech Stack:** NestJS 11 · Prisma 7 · axios · cheerio 1.x · Recharts 2 · TanStack Query v5 · Tailwind CSS 3 · TypeScript 5

**Depends on:** Plan 1 (Infrastructure) — `BaseCrawlerService`, `CrawlSchedulerService`, `PrismaService`, `DatabaseModule`, `CrawlerModule`, shared types all already exist.

---

## File Map

```
apps/api/src/
├── crawler/
│   ├── sjc-crawler.service.ts         NEW  HTML scraper for SJC
│   ├── sjc-crawler.service.spec.ts    NEW  unit tests for parseHtml()
│   ├── doji-crawler.service.ts        NEW  JSON scraper for DOJI
│   ├── doji-crawler.service.spec.ts   NEW
│   └── crawler.module.ts              MODIFY  register SJC + DOJI, seed DataSources
├── price/
│   ├── price.module.ts                NEW
│   ├── price.service.ts               NEW  getCurrentPrices, getHistory, getComparison
│   ├── price.service.spec.ts          NEW
│   ├── price.controller.ts            NEW  GET /prices/domestic, /history, /comparison
│   └── dto/
│       ├── history-query.dto.ts       NEW  query-string validation
│       └── comparison-query.dto.ts    NEW
└── international/
    ├── international.module.ts        NEW
    ├── international.service.ts       NEW  fetch XAU/USD, convert, cache
    ├── international.service.spec.ts  NEW
    └── international.controller.ts    NEW  GET /prices/international

packages/shared/src/types/
└── gold.types.ts                      MODIFY  add ChartPointDto, ComparisonRowDto

apps/web/src/
├── lib/
│   └── price.api.ts                   NEW  typed API calls + TQ hooks
├── components/
│   ├── PriceTable.tsx                 NEW  M01 table with status badges
│   ├── PriceHistoryChart.tsx          NEW  M03 Recharts line chart
│   ├── ComparisonTable.tsx            NEW  M04 brand comparison
│   └── InternationalPriceCard.tsx     NEW  M02 XAU/USD card
└── app/
    └── page.tsx                       MODIFY  assemble all components
```

---

### Task 1: SJC Crawler Service

**Files:**
- Create: `apps/api/src/crawler/sjc-crawler.service.ts`
- Test: `apps/api/src/crawler/sjc-crawler.service.spec.ts`

- [ ] **Step 1: Install cheerio**

```powershell
cd C:/Users/nguye/OneDrive/Desktop/GoldPlan/apps/api
pnpm add cheerio axios
pnpm add -D @types/cheerio
```

Note: `axios` is already installed but re-running `pnpm add` is safe.

- [ ] **Step 2: Write failing test**

Create `apps/api/src/crawler/sjc-crawler.service.spec.ts`:

```typescript
import { SjcCrawlerService } from './sjc-crawler.service';
import { PrismaService } from '../database/prisma.service';
import { AnomalyDetectorService } from './anomaly-detector.service';

// Minimal mock — parseHtml is a pure function, doesn't need DB
const mockPrisma = {} as unknown as PrismaService;
const mockDetector = {} as unknown as AnomalyDetectorService;

const SAMPLE_HTML = `
<table>
  <tr>
    <td>SJC 1L,10L,1KG</td>
    <td>85.500</td>
    <td>85.520</td>
  </tr>
  <tr>
    <td>Nhẫn SJC 1-2-5 chỉ 99.9</td>
    <td>83.400</td>
    <td>84.100</td>
  </tr>
  <tr>
    <td>Vàng nữ trang 24K</td>
    <td>82.000</td>
    <td>83.000</td>
  </tr>
  <tr>
    <td>Vàng nữ trang 18K</td>
    <td>61.500</td>
    <td>62.000</td>
  </tr>
</table>
`;

describe('SjcCrawlerService.parseHtml', () => {
  let service: SjcCrawlerService;

  beforeEach(() => {
    service = new SjcCrawlerService(mockPrisma, mockDetector);
  });

  it('returns 4 price records from sample HTML', () => {
    const result = service.parseHtml(SAMPLE_HTML);
    expect(result).toHaveLength(4);
  });

  it('maps SJC 1L,10L,1KG row to MIEN_SJC', () => {
    const result = service.parseHtml(SAMPLE_HTML);
    const mien = result.find((r) => r.goldType === 'MIEN_SJC');
    expect(mien).toBeDefined();
    expect(mien!.buyPrice).toBe(85_500_000n);
    expect(mien!.sellPrice).toBe(85_520_000n);
  });

  it('maps Nhẫn row to NHAN_9999', () => {
    const result = service.parseHtml(SAMPLE_HTML);
    const nhan = result.find((r) => r.goldType === 'NHAN_9999');
    expect(nhan).toBeDefined();
    expect(nhan!.buyPrice).toBe(83_400_000n);
    expect(nhan!.sellPrice).toBe(84_100_000n);
  });

  it('maps Vàng nữ trang 24K to VANG_24K', () => {
    const result = service.parseHtml(SAMPLE_HTML);
    const v24 = result.find((r) => r.goldType === 'VANG_24K');
    expect(v24).toBeDefined();
    expect(v24!.buyPrice).toBe(82_000_000n);
  });

  it('maps Vàng nữ trang 18K to VANG_18K', () => {
    const result = service.parseHtml(SAMPLE_HTML);
    const v18 = result.find((r) => r.goldType === 'VANG_18K');
    expect(v18).toBeDefined();
    expect(v18!.buyPrice).toBe(61_500_000n);
  });

  it('returns empty array for empty HTML', () => {
    const result = service.parseHtml('<html></html>');
    expect(result).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

```bash
cd /c/Users/nguye/OneDrive/Desktop/GoldPlan/apps/api
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use 22
pnpm test --testPathPattern="sjc-crawler" --no-coverage 2>&1 | tail -10
```

Expected: `FAIL — Cannot find module './sjc-crawler.service'`

- [ ] **Step 4: Implement SjcCrawlerService**

Create `apps/api/src/crawler/sjc-crawler.service.ts`:

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoldBrand, GoldType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AnomalyDetectorService } from './anomaly-detector.service';
import { CrawlSchedulerService } from './crawl-scheduler.service';
import { BaseCrawlerService, RawPriceData } from './base-crawler.service';

const SJC_URL = 'https://sjc.com.vn/giavang/textContent.php';
const SJC_DATA_SOURCE_NAME = 'SJC Official';

// Maps row label keywords to our GoldType enum
const GOLD_TYPE_MAP: Array<{ keywords: string[]; type: GoldType }> = [
  { keywords: ['1l,10l,1kg', '1 l,10 l', 'miếng'], type: 'MIEN_SJC' },
  { keywords: ['nhẫn', 'nhan', '99.9', '9999'], type: 'NHAN_9999' },
  { keywords: ['24k', '24 k', 'nữ trang 24', 'nu trang 24'], type: 'VANG_24K' },
  { keywords: ['18k', '18 k', 'nữ trang 18', 'nu trang 18'], type: 'VANG_18K' },
];

function parsePrice(raw: string): bigint {
  // SJC prices are in thousands VND: "85.500" → 85_500_000
  const cleaned = raw.replace(/[.\s,]/g, '').trim();
  return BigInt(cleaned) * 1000n;
}

function detectGoldType(label: string): GoldType | null {
  const lower = label.toLowerCase();
  for (const { keywords, type } of GOLD_TYPE_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) return type;
  }
  return null;
}

@Injectable()
export class SjcCrawlerService extends BaseCrawlerService implements OnModuleInit {
  protected readonly brand: GoldBrand = 'SJC';

  constructor(
    prisma: PrismaService,
    anomalyDetector: AnomalyDetectorService,
    private readonly scheduler?: CrawlSchedulerService,
  ) {
    super(prisma, anomalyDetector);
  }

  onModuleInit() {
    if (this.scheduler) {
      this.scheduler.registerCrawler('SJC', () =>
        this.crawl(SJC_DATA_SOURCE_NAME),
      );
    }
  }

  async fetchPrices(): Promise<RawPriceData[]> {
    const { data: html } = await axios.get<string>(SJC_URL, { timeout: 10_000 });
    return this.parseHtml(html);
  }

  parseHtml(html: string): RawPriceData[] {
    const $ = cheerio.load(html);
    const results: RawPriceData[] = [];

    $('table tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 3) return;

      const label = $(cells[0]).text().trim();
      const buyRaw = $(cells[1]).text().trim();
      const sellRaw = $(cells[2]).text().trim();

      const goldType = detectGoldType(label);
      if (!goldType) return;

      try {
        results.push({
          goldType,
          buyPrice: parsePrice(buyRaw),
          sellPrice: parsePrice(sellRaw),
        });
      } catch {
        this.logger.warn(`SJC: failed to parse price row "${label}"`);
      }
    });

    return results;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm test --testPathPattern="sjc-crawler" --no-coverage 2>&1 | tail -10
```

Expected: `PASS — 6 tests`

- [ ] **Step 6: Commit**

```bash
cd /c/Users/nguye/OneDrive/Desktop/GoldPlan
git add apps/api/src/crawler/sjc-crawler.service.ts apps/api/src/crawler/sjc-crawler.service.spec.ts apps/api/package.json pnpm-lock.yaml
git commit -m "feat: add SjcCrawlerService with HTML parsing (TDD)"
```

---

### Task 2: DOJI Crawler Service

**Files:**
- Create: `apps/api/src/crawler/doji-crawler.service.ts`
- Test: `apps/api/src/crawler/doji-crawler.service.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/src/crawler/doji-crawler.service.spec.ts`:

```typescript
import { DojiCrawlerService } from './doji-crawler.service';
import { PrismaService } from '../database/prisma.service';
import { AnomalyDetectorService } from './anomaly-detector.service';

const mockPrisma = {} as unknown as PrismaService;
const mockDetector = {} as unknown as AnomalyDetectorService;

// DOJI provides a JSON API response
const SAMPLE_RESPONSE = {
  data: [
    { name: 'Vàng DOJI 9999 (Vàng miếng)', buy: '85200000', sell: '85380000' },
    { name: 'Nhẫn DOJI 9999', buy: '83200000', sell: '83850000' },
    { name: 'Vàng nữ trang 24K', buy: '81800000', sell: '82600000' },
    { name: 'Vàng nữ trang 18K', buy: '61300000', sell: '61900000' },
  ],
};

describe('DojiCrawlerService.parseResponse', () => {
  let service: DojiCrawlerService;

  beforeEach(() => {
    service = new DojiCrawlerService(mockPrisma, mockDetector);
  });

  it('returns 4 price records from sample response', () => {
    const result = service.parseResponse(SAMPLE_RESPONSE);
    expect(result).toHaveLength(4);
  });

  it('maps Vàng miếng row to MIEN_SJC goldType', () => {
    const result = service.parseResponse(SAMPLE_RESPONSE);
    const mien = result.find((r) => r.goldType === 'MIEN_SJC');
    expect(mien).toBeDefined();
    expect(mien!.buyPrice).toBe(85_200_000n);
    expect(mien!.sellPrice).toBe(85_380_000n);
  });

  it('maps Nhẫn 9999 row to NHAN_9999', () => {
    const result = service.parseResponse(SAMPLE_RESPONSE);
    const nhan = result.find((r) => r.goldType === 'NHAN_9999');
    expect(nhan).toBeDefined();
    expect(nhan!.buyPrice).toBe(83_200_000n);
  });

  it('maps 24K to VANG_24K', () => {
    const result = service.parseResponse(SAMPLE_RESPONSE);
    const v24 = result.find((r) => r.goldType === 'VANG_24K');
    expect(v24).toBeDefined();
    expect(v24!.buyPrice).toBe(81_800_000n);
  });

  it('maps 18K to VANG_18K', () => {
    const result = service.parseResponse(SAMPLE_RESPONSE);
    const v18 = result.find((r) => r.goldType === 'VANG_18K');
    expect(v18).toBeDefined();
    expect(v18!.buyPrice).toBe(61_300_000n);
  });

  it('returns empty array for empty data', () => {
    const result = service.parseResponse({ data: [] });
    expect(result).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /c/Users/nguye/OneDrive/Desktop/GoldPlan/apps/api
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use 22
pnpm test --testPathPattern="doji-crawler" --no-coverage 2>&1 | tail -10
```

Expected: `FAIL — Cannot find module './doji-crawler.service'`

- [ ] **Step 3: Implement DojiCrawlerService**

Create `apps/api/src/crawler/doji-crawler.service.ts`:

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { GoldBrand, GoldType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AnomalyDetectorService } from './anomaly-detector.service';
import { CrawlSchedulerService } from './crawl-scheduler.service';
import { BaseCrawlerService, RawPriceData } from './base-crawler.service';

const DOJI_URL = 'https://www.dojigroup.com.vn/api/gold-price';
const DOJI_DATA_SOURCE_NAME = 'DOJI Official';

const GOLD_TYPE_MAP: Array<{ keywords: string[]; type: GoldType }> = [
  { keywords: ['miếng', 'mien', '9999 (v', 'sjc'], type: 'MIEN_SJC' },
  { keywords: ['nhẫn', 'nhan', 'ring'], type: 'NHAN_9999' },
  { keywords: ['24k', '24 k', 'nữ trang 24', 'nu trang 24'], type: 'VANG_24K' },
  { keywords: ['18k', '18 k', 'nữ trang 18', 'nu trang 18'], type: 'VANG_18K' },
];

interface DojiApiRow {
  name: string;
  buy: string;
  sell: string;
}

interface DojiApiResponse {
  data: DojiApiRow[];
}

function detectGoldType(label: string): GoldType | null {
  const lower = label.toLowerCase();
  for (const { keywords, type } of GOLD_TYPE_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) return type;
  }
  return null;
}

@Injectable()
export class DojiCrawlerService extends BaseCrawlerService implements OnModuleInit {
  protected readonly brand: GoldBrand = 'DOJI';

  constructor(
    prisma: PrismaService,
    anomalyDetector: AnomalyDetectorService,
    private readonly scheduler?: CrawlSchedulerService,
  ) {
    super(prisma, anomalyDetector);
  }

  onModuleInit() {
    if (this.scheduler) {
      this.scheduler.registerCrawler('DOJI', () =>
        this.crawl(DOJI_DATA_SOURCE_NAME),
      );
    }
  }

  async fetchPrices(): Promise<RawPriceData[]> {
    const { data } = await axios.get<DojiApiResponse>(DOJI_URL, { timeout: 10_000 });
    return this.parseResponse(data);
  }

  parseResponse(response: DojiApiResponse): RawPriceData[] {
    const results: RawPriceData[] = [];

    for (const row of response.data) {
      const goldType = detectGoldType(row.name);
      if (!goldType) continue;

      try {
        results.push({
          goldType,
          buyPrice: BigInt(row.buy),
          sellPrice: BigInt(row.sell),
        });
      } catch {
        this.logger.warn(`DOJI: failed to parse row "${row.name}"`);
      }
    }

    return results;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test --testPathPattern="doji-crawler" --no-coverage 2>&1 | tail -10
```

Expected: `PASS — 6 tests`

- [ ] **Step 5: Commit**

```bash
cd /c/Users/nguye/OneDrive/Desktop/GoldPlan
git add apps/api/src/crawler/doji-crawler.service.ts apps/api/src/crawler/doji-crawler.service.spec.ts
git commit -m "feat: add DojiCrawlerService with JSON API parsing (TDD)"
```

---

### Task 3: Register Crawlers in CrawlerModule

**Files:**
- Modify: `apps/api/src/crawler/crawler.module.ts`

- [ ] **Step 1: Update CrawlerModule to register SJC and DOJI crawlers**

Replace `apps/api/src/crawler/crawler.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AnomalyDetectorService } from './anomaly-detector.service';
import { CrawlSchedulerService } from './crawl-scheduler.service';
import { SjcCrawlerService } from './sjc-crawler.service';
import { DojiCrawlerService } from './doji-crawler.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    AnomalyDetectorService,
    CrawlSchedulerService,
    SjcCrawlerService,
    DojiCrawlerService,
  ],
  exports: [AnomalyDetectorService, CrawlSchedulerService],
})
export class CrawlerModule {}
```

- [ ] **Step 2: Run existing tests to confirm nothing broke**

```bash
cd /c/Users/nguye/OneDrive/Desktop/GoldPlan/apps/api
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use 22
pnpm test --no-coverage 2>&1 | tail -15
```

Expected: All tests PASS (including the 12 new crawler tests).

- [ ] **Step 3: Run E2E to confirm health still works**

```bash
pnpm test:e2e --no-coverage 2>&1 | tail -10
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd /c/Users/nguye/OneDrive/Desktop/GoldPlan
git add apps/api/src/crawler/crawler.module.ts
git commit -m "feat: register SJC and DOJI crawlers in CrawlerModule"
```

---

### Task 4: PriceService (M01 + M03 + M04 queries)

**Files:**
- Create: `apps/api/src/price/price.service.ts`
- Create: `apps/api/src/price/price.service.spec.ts`
- Create: `apps/api/src/price/dto/history-query.dto.ts`
- Create: `apps/api/src/price/dto/comparison-query.dto.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/price/price.service.spec.ts`:

```typescript
import { PriceService } from './price.service';
import { PrismaService } from '../database/prisma.service';

function makeRecord(overrides: Partial<{
  id: string;
  brand: string;
  goldType: string;
  buyPrice: bigint;
  sellPrice: bigint;
  recordedAt: Date;
  isAnomalous: boolean;
  crawlSessionId: string;
}> = {}) {
  return {
    id: 'rec-1',
    brand: 'SJC',
    goldType: 'MIEN_SJC',
    buyPrice: 85_500_000n,
    sellPrice: 85_520_000n,
    recordedAt: new Date('2026-05-12T10:00:00Z'),
    isAnomalous: false,
    crawlSessionId: 'session-1',
    anomalyReason: null,
    approvedAt: null,
    rejectedAt: null,
    ...overrides,
  };
}

const mockPrisma = {
  priceRecord: {
    findMany: jest.fn(),
  },
} as unknown as PrismaService;

describe('PriceService', () => {
  let service: PriceService;

  beforeEach(() => {
    service = new PriceService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('getCurrentPrices', () => {
    it('returns DomesticPriceDto array with status and changePercent', async () => {
      const now = new Date('2026-05-12T10:00:00Z');
      jest.useFakeTimers().setSystemTime(now);

      // Two records: current SJC MIEN_SJC and a previous one 3 minutes ago
      const currentRec = makeRecord({ recordedAt: new Date(now.getTime() - 2 * 60_000) }); // 2 min ago → 'live'
      const prevRec = makeRecord({
        id: 'rec-0',
        buyPrice: 85_000_000n,
        sellPrice: 85_020_000n,
        recordedAt: new Date(now.getTime() - 7 * 60_000),
      });
      (mockPrisma.priceRecord.findMany as jest.Mock).mockResolvedValue([currentRec, prevRec]);

      const result = await service.getCurrentPrices();

      expect(result).toHaveLength(1); // only latest per brand+goldType
      expect(result[0].brand).toBe('SJC');
      expect(result[0].goldType).toBe('MIEN_SJC');
      expect(result[0].buyPrice).toBe(85_500_000);
      expect(result[0].status).toBe('live'); // 2 min < 5 min
      expect(result[0].changePercent).toBeCloseTo((85_500_000 - 85_000_000) / 85_000_000 * 100, 1);

      jest.useRealTimers();
    });

    it('returns status "recent" for records 10 minutes old', async () => {
      const now = new Date('2026-05-12T10:00:00Z');
      jest.useFakeTimers().setSystemTime(now);

      const rec = makeRecord({ recordedAt: new Date(now.getTime() - 10 * 60_000) });
      (mockPrisma.priceRecord.findMany as jest.Mock).mockResolvedValue([rec]);

      const result = await service.getCurrentPrices();
      expect(result[0].status).toBe('recent');

      jest.useRealTimers();
    });

    it('returns status "outdated" for records older than 30 minutes', async () => {
      const now = new Date('2026-05-12T10:00:00Z');
      jest.useFakeTimers().setSystemTime(now);

      const rec = makeRecord({ recordedAt: new Date(now.getTime() - 31 * 60_000) });
      (mockPrisma.priceRecord.findMany as jest.Mock).mockResolvedValue([rec]);

      const result = await service.getCurrentPrices();
      expect(result[0].status).toBe('outdated');

      jest.useRealTimers();
    });

    it('returns changePercent null when there is no previous record', async () => {
      const rec = makeRecord();
      (mockPrisma.priceRecord.findMany as jest.Mock).mockResolvedValue([rec]);

      const result = await service.getCurrentPrices();
      expect(result[0].changePercent).toBeNull();
    });
  });

  describe('getHistory', () => {
    it('returns chart points for a given brand/goldType/range', async () => {
      const records = [
        makeRecord({ recordedAt: new Date('2026-05-12T08:00:00Z'), buyPrice: 85_000_000n }),
        makeRecord({ recordedAt: new Date('2026-05-12T08:05:00Z'), buyPrice: 85_100_000n }),
      ];
      (mockPrisma.priceRecord.findMany as jest.Mock).mockResolvedValue(records);

      const result = await service.getHistory('SJC' as any, 'MIEN_SJC' as any, '1D');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        recordedAt: '2026-05-12T08:00:00.000Z',
        buyPrice: 85_000_000,
        sellPrice: 85_520_000,
      });
    });
  });

  describe('getComparison', () => {
    it('marks isBestBuy on the record with the highest buyPrice', async () => {
      const sjcRec = makeRecord({ brand: 'SJC', buyPrice: 85_500_000n, sellPrice: 85_520_000n });
      const dojiRec = makeRecord({ id: 'rec-2', brand: 'DOJI', buyPrice: 85_200_000n, sellPrice: 85_380_000n });
      (mockPrisma.priceRecord.findMany as jest.Mock).mockResolvedValue([sjcRec, dojiRec]);

      const result = await service.getComparison('MIEN_SJC' as any);

      const sjcRow = result[0].brands.find((b) => b.brand === 'SJC');
      const dojiRow = result[0].brands.find((b) => b.brand === 'DOJI');

      expect(sjcRow!.isBestBuy).toBe(true);   // 85.5M > 85.2M
      expect(dojiRow!.isBestBuy).toBe(false);
      expect(dojiRow!.isBestSell).toBe(true);  // 85.38M < 85.52M
      expect(sjcRow!.isBestSell).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /c/Users/nguye/OneDrive/Desktop/GoldPlan/apps/api
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use 22
pnpm test --testPathPattern="price.service" --no-coverage 2>&1 | tail -10
```

Expected: `FAIL — Cannot find module './price.service'`

- [ ] **Step 3: Create DTOs**

Create `apps/api/src/price/dto/history-query.dto.ts`:

```typescript
import { IsEnum, IsIn } from 'class-validator';
import { GoldBrand, GoldType } from '@prisma/client';

export class HistoryQueryDto {
  @IsEnum(['SJC', 'DOJI', 'PNJ', 'BAO_TIN'])
  brand: GoldBrand;

  @IsEnum(['MIEN_SJC', 'NHAN_9999', 'VANG_24K', 'VANG_18K'])
  goldType: GoldType;

  @IsIn(['1D', '1W', '1M'])
  range: '1D' | '1W' | '1M';
}
```

Create `apps/api/src/price/dto/comparison-query.dto.ts`:

```typescript
import { IsEnum } from 'class-validator';
import { GoldType } from '@prisma/client';

export class ComparisonQueryDto {
  @IsEnum(['MIEN_SJC', 'NHAN_9999', 'VANG_24K', 'VANG_18K'])
  goldType: GoldType;
}
```

- [ ] **Step 4: Implement PriceService**

Create `apps/api/src/price/price.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { GoldBrand, GoldType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

const LIVE_MS = 5 * 60_000;
const RECENT_MS = 30 * 60_000;

const RANGE_MS: Record<string, number> = {
  '1D': 24 * 60 * 60_000,
  '1W': 7 * 24 * 60 * 60_000,
  '1M': 30 * 24 * 60 * 60_000,
};

function getStatus(recordedAt: Date): 'live' | 'recent' | 'outdated' {
  const ageMs = Date.now() - recordedAt.getTime();
  if (ageMs < LIVE_MS) return 'live';
  if (ageMs < RECENT_MS) return 'recent';
  return 'outdated';
}

@Injectable()
export class PriceService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentPrices(brand?: GoldBrand) {
    const where: Record<string, unknown> = { isAnomalous: false };
    if (brand) where.brand = brand;

    // Fetch last 2 records per brand+goldType to compute changePercent
    const records = await this.prisma.priceRecord.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      take: 200,
    });

    // Group by brand+goldType, take latest 2 per group
    const groups = new Map<string, typeof records>();
    for (const r of records) {
      const key = `${r.brand}:${r.goldType}`;
      const group = groups.get(key) ?? [];
      if (group.length < 2) {
        group.push(r);
        groups.set(key, group);
      }
    }

    return Array.from(groups.values()).map(([current, prev]) => {
      const changePercent = prev
        ? ((Number(current.buyPrice) - Number(prev.buyPrice)) / Number(prev.buyPrice)) * 100
        : null;

      return {
        brand: current.brand as GoldBrand,
        goldType: current.goldType as GoldType,
        buyPrice: Number(current.buyPrice),
        sellPrice: Number(current.sellPrice),
        recordedAt: current.recordedAt.toISOString(),
        status: getStatus(current.recordedAt),
        changePercent: changePercent !== null ? Math.round(changePercent * 100) / 100 : null,
      };
    });
  }

  async getHistory(brand: GoldBrand, goldType: GoldType, range: '1D' | '1W' | '1M') {
    const since = new Date(Date.now() - RANGE_MS[range]);
    const records = await this.prisma.priceRecord.findMany({
      where: { brand, goldType, isAnomalous: false, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
    });

    return records.map((r) => ({
      recordedAt: r.recordedAt.toISOString(),
      buyPrice: Number(r.buyPrice),
      sellPrice: Number(r.sellPrice),
    }));
  }

  async getComparison(goldType: GoldType) {
    const records = await this.prisma.priceRecord.findMany({
      where: { goldType, isAnomalous: false },
      orderBy: { recordedAt: 'desc' },
      take: 20,
    });

    // Latest per brand
    const latestPerBrand = new Map<string, (typeof records)[number]>();
    for (const r of records) {
      if (!latestPerBrand.has(r.brand)) latestPerBrand.set(r.brand, r);
    }

    const rows = Array.from(latestPerBrand.values());
    const maxBuy = rows.reduce((m, r) => (r.buyPrice > m ? r.buyPrice : m), 0n);
    const minSell = rows.reduce((m, r) => (r.sellPrice < m ? r.sellPrice : m), BigInt(Number.MAX_SAFE_INTEGER));

    return [
      {
        goldType,
        brands: rows.map((r) => ({
          brand: r.brand as GoldBrand,
          buyPrice: Number(r.buyPrice),
          sellPrice: Number(r.sellPrice),
          isBestBuy: r.buyPrice === maxBuy,
          isBestSell: r.sellPrice === minSell,
          crawlSessionId: r.crawlSessionId,
        })),
      },
    ];
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm test --testPathPattern="price.service" --no-coverage 2>&1 | tail -15
```

Expected: `PASS — 7 tests`

- [ ] **Step 6: Commit**

```bash
cd /c/Users/nguye/OneDrive/Desktop/GoldPlan
git add apps/api/src/price/
git commit -m "feat: add PriceService — getCurrentPrices (M01), getHistory (M03), getComparison (M04)"
```

---

### Task 5: PriceController + PriceModule

**Files:**
- Create: `apps/api/src/price/price.controller.ts`
- Create: `apps/api/src/price/price.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create PriceController**

Create `apps/api/src/price/price.controller.ts`:

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { GoldBrand, GoldType } from '@prisma/client';
import { PriceService } from './price.service';
import { HistoryQueryDto } from './dto/history-query.dto';
import { ComparisonQueryDto } from './dto/comparison-query.dto';

@Controller('prices')
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Get('domestic')
  getDomestic(@Query('brand') brand?: GoldBrand) {
    return this.priceService.getCurrentPrices(brand);
  }

  @Get('history')
  getHistory(@Query() query: HistoryQueryDto) {
    return this.priceService.getHistory(query.brand, query.goldType, query.range);
  }

  @Get('comparison')
  getComparison(@Query() query: ComparisonQueryDto) {
    return this.priceService.getComparison(query.goldType);
  }
}
```

- [ ] **Step 2: Create PriceModule**

Create `apps/api/src/price/price.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PriceService } from './price.service';
import { PriceController } from './price.controller';

@Module({
  providers: [PriceService],
  controllers: [PriceController],
})
export class PriceModule {}
```

- [ ] **Step 3: Register PriceModule in AppModule**

Read `apps/api/src/app.module.ts`, then replace it:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { CrawlerModule } from './crawler/crawler.module';
import { PriceModule } from './price/price.module';
import { HealthController } from './health/health.controller';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { allowUnknown: true },
    }),
    DatabaseModule,
    CrawlerModule,
    PriceModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

- [ ] **Step 4: Run E2E smoke test**

```bash
cd /c/Users/nguye/OneDrive/Desktop/GoldPlan/apps/api
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use 22
pnpm test:e2e --no-coverage 2>&1 | tail -10
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /c/Users/nguye/OneDrive/Desktop/GoldPlan
git add apps/api/src/price/price.controller.ts apps/api/src/price/price.module.ts apps/api/src/app.module.ts
git commit -m "feat: add PriceController with domestic/history/comparison endpoints (M01, M03, M04)"
```

---

### Task 6: InternationalService (M02)

**Files:**
- Create: `apps/api/src/international/international.service.ts`
- Test: `apps/api/src/international/international.service.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/src/international/international.service.spec.ts`:

```typescript
import { InternationalService } from './international.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('InternationalService', () => {
  let service: InternationalService;

  beforeEach(() => {
    service = new InternationalService();
    jest.clearAllMocks();
  });

  it('returns correct InternationalPriceDto', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { price: 2350.5, currency: 'USD' } }) // gold API
      .mockResolvedValueOnce({ data: { rates: { VND: 25450 } } });          // exchange rate API

    const result = await service.getInternationalPrice();

    expect(result.spotPriceUsd).toBe(2350.5);
    expect(result.exchangeRate).toBe(25450);
    // VND/tael = 2350.5 × (37.5/31.1035) × 25450
    const expected = Math.round(2350.5 * (37.5 / 31.1035) * 25450);
    expect(result.spotPriceVnd).toBe(expected);
    expect(typeof result.recordedAt).toBe('string');
  });

  it('returns cached result on second call within 5 minutes', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { price: 2350.5, currency: 'USD' } })
      .mockResolvedValueOnce({ data: { rates: { VND: 25450 } } });

    await service.getInternationalPrice();
    await service.getInternationalPrice(); // should use cache

    expect(mockedAxios.get).toHaveBeenCalledTimes(2); // called only for the first fetch
  });

  it('fetches fresh data after cache expires', async () => {
    mockedAxios.get
      .mockResolvedValue({ data: { price: 2350.5, currency: 'USD' } })
      .mockResolvedValue({ data: { rates: { VND: 25450 } } });

    jest.useFakeTimers();
    await service.getInternationalPrice();

    jest.advanceTimersByTime(6 * 60_000); // advance 6 minutes past TTL
    await service.getInternationalPrice();

    expect(mockedAxios.get).toHaveBeenCalledTimes(4); // 2 calls × 2 fetches
    jest.useRealTimers();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /c/Users/nguye/OneDrive/Desktop/GoldPlan/apps/api
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use 22
pnpm test --testPathPattern="international.service" --no-coverage 2>&1 | tail -10
```

Expected: `FAIL — Cannot find module './international.service'`

- [ ] **Step 3: Implement InternationalService**

Create `apps/api/src/international/international.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

// 1 tael (lượng) = 37.5g, 1 troy oz = 31.1035g
const TAEL_PER_TROY_OZ = 37.5 / 31.1035;
const CACHE_TTL_MS = 5 * 60_000;

interface CacheEntry {
  data: ReturnType<InternationalService['buildDto']>;
  expiresAt: number;
}

@Injectable()
export class InternationalService {
  private readonly logger = new Logger(InternationalService.name);
  private cache: CacheEntry | null = null;

  async getInternationalPrice() {
    if (this.cache && Date.now() < this.cache.expiresAt) {
      return this.cache.data;
    }

    const goldApiKey = process.env.GOLD_API_KEY ?? '';
    const exchangeApiKey = process.env.EXCHANGE_RATE_API_KEY ?? '';

    const [goldRes, fxRes] = await Promise.all([
      axios.get<{ price: number; currency: string }>(
        `https://www.goldapi.io/api/XAU/USD`,
        { headers: { 'x-access-token': goldApiKey }, timeout: 8_000 },
      ),
      axios.get<{ rates: Record<string, number> }>(
        `https://v6.exchangerate-api.com/v6/${exchangeApiKey}/latest/USD`,
        { timeout: 8_000 },
      ),
    ]);

    const spotPriceUsd = goldRes.data.price;
    const exchangeRate = fxRes.data.rates['VND'] ?? 25_000;
    const dto = this.buildDto(spotPriceUsd, exchangeRate);

    this.cache = { data: dto, expiresAt: Date.now() + CACHE_TTL_MS };
    return dto;
  }

  private buildDto(spotPriceUsd: number, exchangeRate: number) {
    return {
      spotPriceUsd,
      spotPriceVnd: Math.round(spotPriceUsd * TAEL_PER_TROY_OZ * exchangeRate),
      exchangeRate,
      recordedAt: new Date().toISOString(),
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test --testPathPattern="international.service" --no-coverage 2>&1 | tail -15
```

Expected: `PASS — 3 tests`

- [ ] **Step 5: Commit**

```bash
cd /c/Users/nguye/OneDrive/Desktop/GoldPlan
git add apps/api/src/international/international.service.ts apps/api/src/international/international.service.spec.ts
git commit -m "feat: add InternationalService — XAU/USD fetch with 5-min cache (M02)"
```

---

### Task 7: InternationalController + Module + AppModule wiring

**Files:**
- Create: `apps/api/src/international/international.controller.ts`
- Create: `apps/api/src/international/international.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create InternationalController**

Create `apps/api/src/international/international.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';
import { InternationalService } from './international.service';

@Controller('prices')
export class InternationalController {
  constructor(private readonly internationalService: InternationalService) {}

  @Get('international')
  getInternational() {
    return this.internationalService.getInternationalPrice();
  }
}
```

- [ ] **Step 2: Create InternationalModule**

Create `apps/api/src/international/international.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { InternationalService } from './international.service';
import { InternationalController } from './international.controller';

@Module({
  providers: [InternationalService],
  controllers: [InternationalController],
})
export class InternationalModule {}
```

- [ ] **Step 3: Register InternationalModule in AppModule**

Replace `apps/api/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { CrawlerModule } from './crawler/crawler.module';
import { PriceModule } from './price/price.module';
import { InternationalModule } from './international/international.module';
import { HealthController } from './health/health.controller';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { allowUnknown: true },
    }),
    DatabaseModule,
    CrawlerModule,
    PriceModule,
    InternationalModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

- [ ] **Step 4: Run full test suite + E2E**

```bash
cd /c/Users/nguye/OneDrive/Desktop/GoldPlan/apps/api
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use 22
pnpm test --no-coverage 2>&1 | tail -10
pnpm test:e2e --no-coverage 2>&1 | tail -10
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
cd /c/Users/nguye/OneDrive/Desktop/GoldPlan
git add apps/api/src/international/ apps/api/src/app.module.ts
git commit -m "feat: add InternationalController and wire InternationalModule (M02)"
```

---

### Task 8: Shared Types + Frontend API client

**Files:**
- Modify: `packages/shared/src/types/gold.types.ts`
- Create: `apps/web/src/lib/price.api.ts`

- [ ] **Step 1: Add ChartPointDto and ComparisonRowDto to shared types**

Edit `packages/shared/src/types/gold.types.ts` — append these interfaces after the existing ones:

```typescript
export interface ChartPointDto {
  recordedAt: string;
  buyPrice: number;
  sellPrice: number;
}

export interface ComparisonBrandDto {
  brand: GoldBrand;
  buyPrice: number;
  sellPrice: number;
  isBestBuy: boolean;
  isBestSell: boolean;
  crawlSessionId: string;
}

export interface ComparisonRowDto {
  goldType: GoldType;
  brands: ComparisonBrandDto[];
}
```

- [ ] **Step 2: Install recharts in apps/web**

```powershell
cd C:/Users/nguye/OneDrive/Desktop/GoldPlan/apps/web
pnpm add recharts
```

- [ ] **Step 3: Create price API client**

Create `apps/web/src/lib/price.api.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type {
  DomesticPriceDto,
  InternationalPriceDto,
  ChartPointDto,
  ComparisonRowDto,
  GoldBrand,
  GoldType,
} from '@gpls/shared';

// ─── Raw API calls ────────────────────────────────────────────────────────────

export async function fetchDomesticPrices(brand?: GoldBrand): Promise<DomesticPriceDto[]> {
  const params = brand ? { brand } : {};
  const { data } = await apiClient.get<DomesticPriceDto[]>('/prices/domestic', { params });
  return data;
}

export async function fetchInternationalPrice(): Promise<InternationalPriceDto> {
  const { data } = await apiClient.get<InternationalPriceDto>('/prices/international');
  return data;
}

export async function fetchPriceHistory(
  brand: GoldBrand,
  goldType: GoldType,
  range: '1D' | '1W' | '1M',
): Promise<ChartPointDto[]> {
  const { data } = await apiClient.get<ChartPointDto[]>('/prices/history', {
    params: { brand, goldType, range },
  });
  return data;
}

export async function fetchComparison(goldType: GoldType): Promise<ComparisonRowDto[]> {
  const { data } = await apiClient.get<ComparisonRowDto[]>('/prices/comparison', {
    params: { goldType },
  });
  return data;
}

// ─── TanStack Query hooks ─────────────────────────────────────────────────────

export function useDomesticPrices(brand?: GoldBrand) {
  return useQuery({
    queryKey: ['prices', 'domestic', brand],
    queryFn: () => fetchDomesticPrices(brand),
    staleTime: 30_000, // re-fetch every 30s
    refetchInterval: 60_000,
  });
}

export function useInternationalPrice() {
  return useQuery({
    queryKey: ['prices', 'international'],
    queryFn: fetchInternationalPrice,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}

export function usePriceHistory(
  brand: GoldBrand,
  goldType: GoldType,
  range: '1D' | '1W' | '1M',
) {
  return useQuery({
    queryKey: ['prices', 'history', brand, goldType, range],
    queryFn: () => fetchPriceHistory(brand, goldType, range),
    staleTime: 60_000,
  });
}

export function useComparison(goldType: GoldType) {
  return useQuery({
    queryKey: ['prices', 'comparison', goldType],
    queryFn: () => fetchComparison(goldType),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
```

- [ ] **Step 4: Commit**

```bash
cd /c/Users/nguye/OneDrive/Desktop/GoldPlan
git add packages/shared/src/types/gold.types.ts apps/web/src/lib/price.api.ts apps/web/package.json pnpm-lock.yaml
git commit -m "feat: add ChartPointDto/ComparisonRowDto types and price API hooks"
```

---

### Task 9: PriceTable component (M01)

**Files:**
- Create: `apps/web/src/components/PriceTable.tsx`

- [ ] **Step 1: Create PriceTable**

Create `apps/web/src/components/PriceTable.tsx`:

```tsx
'use client';

import type { DomesticPriceDto, GoldBrand, PriceStatus } from '@gpls/shared';
import { useDomesticPrices } from '@/lib/price.api';

const BRAND_LABELS: Record<GoldBrand, string> = {
  SJC: 'SJC',
  DOJI: 'DOJI',
  PNJ: 'PNJ',
  BAO_TIN: 'Bảo Tín',
};

const GOLD_TYPE_LABELS: Record<string, string> = {
  MIEN_SJC: 'Miếng SJC',
  NHAN_9999: 'Nhẫn 9999',
  VANG_24K: 'Vàng 24K',
  VANG_18K: 'Vàng 18K',
};

const STATUS_CONFIG: Record<PriceStatus, { label: string; className: string }> = {
  live:     { label: 'Trực tiếp',  className: 'bg-green-100 text-green-800' },
  recent:   { label: 'Gần đây',    className: 'bg-yellow-100 text-yellow-800' },
  outdated: { label: 'Cũ',         className: 'bg-red-100 text-red-800' },
};

function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function ChangeIndicator({ changePercent }: { changePercent: number | null }) {
  if (changePercent === null) return <span className="text-gray-400">–</span>;
  const isUp = changePercent > 0;
  const isDown = changePercent < 0;
  return (
    <span className={isUp ? 'text-green-600' : isDown ? 'text-red-600' : 'text-gray-400'}>
      {isUp ? '▲' : isDown ? '▼' : '–'} {Math.abs(changePercent).toFixed(2)}%
    </span>
  );
}

function StatusBadge({ status }: { status: PriceStatus }) {
  const { label, className } = STATUS_CONFIG[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export function PriceTable({ brand }: { brand?: GoldBrand }) {
  const { data: prices, isLoading, error } = useDomesticPrices(brand);

  if (isLoading) return <div className="py-8 text-center text-gray-400">Đang tải...</div>;
  if (error) return <div className="py-8 text-center text-red-500">Không thể tải dữ liệu giá</div>;
  if (!prices?.length) return <div className="py-8 text-center text-gray-400">Không có dữ liệu</div>;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-700">Thương hiệu</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">Loại vàng</th>
            <th className="px-4 py-3 text-right font-medium text-gray-700">Giá mua</th>
            <th className="px-4 py-3 text-right font-medium text-gray-700">Giá bán</th>
            <th className="px-4 py-3 text-center font-medium text-gray-700">Biến động</th>
            <th className="px-4 py-3 text-center font-medium text-gray-700">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {prices.map((p: DomesticPriceDto) => (
            <tr key={`${p.brand}-${p.goldType}`} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-semibold text-yellow-700">{BRAND_LABELS[p.brand]}</td>
              <td className="px-4 py-3 text-gray-600">{GOLD_TYPE_LABELS[p.goldType] ?? p.goldType}</td>
              <td className="px-4 py-3 text-right font-mono text-green-700">{formatVnd(p.buyPrice)}</td>
              <td className="px-4 py-3 text-right font-mono text-red-700">{formatVnd(p.sellPrice)}</td>
              <td className="px-4 py-3 text-center">
                <ChangeIndicator changePercent={p.changePercent} />
              </td>
              <td className="px-4 py-3 text-center">
                <StatusBadge status={p.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /c/Users/nguye/OneDrive/Desktop/GoldPlan
git add apps/web/src/components/PriceTable.tsx
git commit -m "feat: add PriceTable component with status badges and change indicators (M01)"
```

---

### Task 10: PriceHistoryChart component (M03)

**Files:**
- Create: `apps/web/src/components/PriceHistoryChart.tsx`

- [ ] **Step 1: Create PriceHistoryChart**

Create `apps/web/src/components/PriceHistoryChart.tsx`:

```tsx
'use client';

import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';
import type { GoldBrand, GoldType } from '@gpls/shared';
import { usePriceHistory } from '@/lib/price.api';

type Range = '1D' | '1W' | '1M';

const RANGES: Range[] = ['1D', '1W', '1M'];
const RANGE_LABELS: Record<Range, string> = { '1D': '1 ngày', '1W': '1 tuần', '1M': '1 tháng' };

const GOLD_TYPES: GoldType[] = ['MIEN_SJC', 'NHAN_9999', 'VANG_24K', 'VANG_18K'];
const GOLD_TYPE_LABELS: Record<GoldType, string> = {
  MIEN_SJC: 'Miếng SJC',
  NHAN_9999: 'Nhẫn 9999',
  VANG_24K: 'Vàng 24K',
  VANG_18K: 'Vàng 18K',
};

function formatDate(iso: string, range: Range): string {
  const d = new Date(iso);
  if (range === '1D') return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function formatVndShort(value: number): string {
  return `${(value / 1_000_000).toFixed(1)}M`;
}

interface Props {
  brand?: GoldBrand;
}

export function PriceHistoryChart({ brand = 'SJC' }: Props) {
  const [range, setRange] = useState<Range>('1D');
  const [goldType, setGoldType] = useState<GoldType>('MIEN_SJC');

  const { data: points, isLoading, error } = usePriceHistory(brand, goldType, range);

  const chartData = (points ?? []).map((p) => ({
    time: formatDate(p.recordedAt, range),
    buyPrice: p.buyPrice,
    sellPrice: p.sellPrice,
  }));

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-md bg-gray-100 p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                range === r ? 'bg-white shadow text-yellow-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
        <select
          value={goldType}
          onChange={(e) => setGoldType(e.target.value as GoldType)}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        >
          {GOLD_TYPES.map((t) => (
            <option key={t} value={t}>{GOLD_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {isLoading && <div className="py-16 text-center text-gray-400">Đang tải biểu đồ...</div>}
      {error && <div className="py-16 text-center text-red-500">Không thể tải dữ liệu</div>}
      {!isLoading && !error && chartData.length === 0 && (
        <div className="py-16 text-center text-gray-400">Chưa có dữ liệu cho khoảng thời gian này</div>
      )}

      {!isLoading && !error && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tickFormatter={formatVndShort} tick={{ fontSize: 11 }} width={55} />
            <Tooltip
              formatter={(value: number) =>
                new Intl.NumberFormat('vi-VN').format(value) + ' ₫'
              }
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="buyPrice"
              name="Giá mua"
              stroke="#16a34a"
              dot={false}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="sellPrice"
              name="Giá bán"
              stroke="#dc2626"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /c/Users/nguye/OneDrive/Desktop/GoldPlan
git add apps/web/src/components/PriceHistoryChart.tsx
git commit -m "feat: add PriceHistoryChart with Recharts line chart and range/type selector (M03)"
```

---

### Task 11: ComparisonTable component (M04)

**Files:**
- Create: `apps/web/src/components/ComparisonTable.tsx`

- [ ] **Step 1: Create ComparisonTable**

Create `apps/web/src/components/ComparisonTable.tsx`:

```tsx
'use client';

import { useState } from 'react';
import type { GoldType, ComparisonBrandDto } from '@gpls/shared';
import { useComparison } from '@/lib/price.api';

const GOLD_TYPES: GoldType[] = ['MIEN_SJC', 'NHAN_9999', 'VANG_24K', 'VANG_18K'];
const GOLD_TYPE_LABELS: Record<GoldType, string> = {
  MIEN_SJC: 'Miếng SJC',
  NHAN_9999: 'Nhẫn 9999',
  VANG_24K: 'Vàng 24K',
  VANG_18K: 'Vàng 18K',
};
const BRAND_LABELS: Record<string, string> = {
  SJC: 'SJC', DOJI: 'DOJI', PNJ: 'PNJ', BAO_TIN: 'Bảo Tín',
};

function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

function BrandCell({ item }: { item: ComparisonBrandDto }) {
  return (
    <td
      className={`px-4 py-3 text-right font-mono text-sm ${
        item.isBestBuy ? 'bg-green-50 font-bold text-green-700' : 'text-gray-700'
      }`}
      title={item.isBestBuy ? 'Giá mua cao nhất' : undefined}
    >
      {formatVnd(item.buyPrice)}
      {item.isBestBuy && <span className="ml-1 text-xs text-green-600">★</span>}
    </td>
  );
}

function BrandSellCell({ item }: { item: ComparisonBrandDto }) {
  return (
    <td
      className={`px-4 py-3 text-right font-mono text-sm ${
        item.isBestSell ? 'bg-blue-50 font-bold text-blue-700' : 'text-gray-700'
      }`}
      title={item.isBestSell ? 'Giá bán thấp nhất' : undefined}
    >
      {formatVnd(item.sellPrice)}
      {item.isBestSell && <span className="ml-1 text-xs text-blue-600">★</span>}
    </td>
  );
}

export function ComparisonTable() {
  const [goldType, setGoldType] = useState<GoldType>('MIEN_SJC');
  const { data: rows, isLoading, error } = useComparison(goldType);

  const brands = rows?.[0]?.brands ?? [];

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Loại vàng:</span>
        <select
          value={goldType}
          onChange={(e) => setGoldType(e.target.value as GoldType)}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        >
          {GOLD_TYPES.map((t) => (
            <option key={t} value={t}>{GOLD_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {isLoading && <div className="py-8 text-center text-gray-400">Đang tải...</div>}
      {error && <div className="py-8 text-center text-red-500">Không thể tải dữ liệu</div>}

      {!isLoading && !error && brands.length > 0 && (
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Thương hiệu</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Giá mua (VNĐ)</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Giá bán (VNĐ)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {brands.map((b) => (
              <tr key={b.brand}>
                <td className="px-4 py-3 font-semibold text-yellow-700">{BRAND_LABELS[b.brand] ?? b.brand}</td>
                <BrandCell item={b} />
                <BrandSellCell item={b} />
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-3 text-xs text-gray-400">
        ★ Giá mua cao nhất&nbsp;&nbsp;|&nbsp;&nbsp;★ Giá bán thấp nhất
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /c/Users/nguye/OneDrive/Desktop/GoldPlan
git add apps/web/src/components/ComparisonTable.tsx
git commit -m "feat: add ComparisonTable with best buy/sell highlights (M04)"
```

---

### Task 12: InternationalPriceCard + Home Page Assembly

**Files:**
- Create: `apps/web/src/components/InternationalPriceCard.tsx`
- Modify: `apps/web/src/app/page.tsx`

- [ ] **Step 1: Create InternationalPriceCard**

Create `apps/web/src/components/InternationalPriceCard.tsx`:

```tsx
'use client';

import { useInternationalPrice } from '@/lib/price.api';

export function InternationalPriceCard() {
  const { data, isLoading, error } = useInternationalPrice();

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 p-4 animate-pulse">
        <div className="h-5 w-32 rounded bg-gray-200" />
        <div className="mt-3 h-8 w-48 rounded bg-gray-200" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        Không thể tải giá quốc tế
      </div>
    );
  }

  const updatedAt = new Date(data.recordedAt).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-yellow-50 to-white p-4">
      <h3 className="text-sm font-medium text-gray-500">Giá vàng quốc tế (XAU/USD)</h3>
      <div className="mt-2 flex items-end gap-3">
        <span className="text-2xl font-bold text-yellow-700">
          ${data.spotPriceUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          <span className="ml-1 text-sm font-normal text-gray-400">/oz</span>
        </span>
      </div>
      <div className="mt-1 text-sm text-gray-600">
        ≈{' '}
        <span className="font-semibold text-yellow-800">
          {new Intl.NumberFormat('vi-VN').format(data.spotPriceVnd)} ₫
        </span>
        /lượng
      </div>
      <div className="mt-1 text-xs text-gray-400">
        Tỷ giá USD/VND: {new Intl.NumberFormat('vi-VN').format(data.exchangeRate)} · Cập nhật {updatedAt}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update home page to assemble all components**

Replace `apps/web/src/app/page.tsx`:

```tsx
import { PriceTable } from '@/components/PriceTable';
import { PriceHistoryChart } from '@/components/PriceHistoryChart';
import { ComparisonTable } from '@/components/ComparisonTable';
import { InternationalPriceCard } from '@/components/InternationalPriceCard';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl p-4 md:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-yellow-700">GPLS — Giá Vàng Việt Nam</h1>
        <p className="mt-1 text-sm text-gray-500">Tra cứu giá vàng SJC, DOJI theo thời gian thực</p>
      </div>

      {/* M02: International price */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-700">Giá vàng quốc tế</h2>
        <InternationalPriceCard />
      </section>

      {/* M01: Domestic prices */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-700">Giá vàng trong nước</h2>
        <PriceTable />
      </section>

      {/* M04: Comparison */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-700">So sánh thương hiệu</h2>
        <ComparisonTable />
      </section>

      {/* M03: History chart */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-700">Lịch sử giá</h2>
        <PriceHistoryChart />
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Verify Next.js build succeeds**

```bash
cd C:/Users/nguye/OneDrive/Desktop/GoldPlan/apps/web
```

Using PowerShell with Node 22 (using nvm from Bash first):

```bash
cd /c/Users/nguye/OneDrive/Desktop/GoldPlan/apps/web
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use 22
pnpm run build 2>&1 | tail -20
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/nguye/OneDrive/Desktop/GoldPlan
git add apps/web/src/components/InternationalPriceCard.tsx apps/web/src/app/page.tsx
git commit -m "feat: add InternationalPriceCard and assemble M01-M04 on home page"
```

---

## Self-Review

### 1. Spec Coverage

| Requirement | Task |
|------------|------|
| FR-01.1 SJC/DOJI prices | Tasks 1–3 (crawlers) + Task 5 (API) |
| FR-01.2 5-min auto-refresh | Tasks 1–3 (registerCrawler) |
| FR-01.3 Last-known price with timestamp | Task 9 (PriceTable recordedAt) |
| FR-01.4 Status badge Live/Recent/Outdated | Tasks 4 + 9 |
| FR-01.5 % change with ▲▼– indicator | Tasks 4 + 9 |
| FR-01.6 Anomaly suppression | Task 4 (isAnomalous: false filter) |
| FR-01.7 All gold types displayed | Tasks 1–2 (all 4 types parsed) |
| FR-02.1 XAU/USD real-time | Tasks 6–7 |
| FR-02.2 VND/tael conversion | Task 6 (TAEL_PER_TROY_OZ formula) |
| FR-03.1 Line chart | Task 10 |
| FR-03.2 1D/1W/1M ranges | Tasks 4 (getHistory) + 10 |
| FR-03.4 Hover tooltip | Task 10 (Recharts Tooltip) |
| FR-03.5 Filter by brand/goldType | Task 10 (dropdowns) |
| FR-03.6 Note when data insufficient | Task 10 (empty state message) |
| FR-04.1 Side-by-side comparison | Tasks 4 (getComparison) + 11 |
| FR-04.2 Highlight highest buy price | Tasks 4 (isBestBuy) + 11 |
| FR-04.3 Highlight lowest sell price | Tasks 4 (isBestSell) + 11 |
| FR-04.4 Filter by gold type | Task 11 (dropdown) |

**Gaps:** None for R1. R2 features (PNJ/DOJI crawlers, XAU/EUR) are explicitly deferred to Plan 5.

### 2. Placeholder scan

No TBD, no "implement later", all code blocks complete. ✓

### 3. Type consistency

- `GoldBrand` / `GoldType` from `@prisma/client` in API code, from `@gpls/shared` in frontend — consistent string values.
- `ChartPointDto` defined in Task 8, consumed in Tasks 10 — field names match.
- `ComparisonRowDto` / `ComparisonBrandDto` defined in Task 8, consumed in Task 11 — `isBestBuy`, `isBestSell`, `brands` all consistent.
- `DomesticPriceDto` was pre-existing in shared types — used in Tasks 4, 9 without modification.
- `InternationalPriceDto` was pre-existing — used in Tasks 6, 12.
- `PriceService.getComparison()` returns `ComparisonRowDto[]` — matches what Task 11 `useComparison()` hook expects. ✓
