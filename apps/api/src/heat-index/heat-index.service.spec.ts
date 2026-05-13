import { Test, TestingModule } from '@nestjs/testing';
import { HeatIndexService } from './heat-index.service';
import { PrismaService } from '../database/prisma.service';

// Helper: build a minimal PriceRecord-like object
function makeRecord(buyPrice: number, sellPrice: number, recordedAt?: Date) {
  return {
    id: 'r1',
    crawlSessionId: 's1',
    brand: 'SJC' as const,
    goldType: 'MIEN_SJC' as const,
    buyPrice: BigInt(buyPrice),
    sellPrice: BigInt(sellPrice),
    recordedAt: recordedAt ?? new Date(),
    isAnomalous: false,
    anomalyReason: null,
    approvedAt: null,
    rejectedAt: null,
  };
}

describe('HeatIndexService.compute()', () => {
  let service: HeatIndexService;
  let mockPrisma: {
    priceRecord: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    heatIndexRecord: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    mockPrisma = {
      priceRecord: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      heatIndexRecord: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HeatIndexService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<HeatIndexService>(HeatIndexService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: 2% avg change → velocity score = 40 (capped at max)
  it('10 price records with 2% avg change → velocity score = 40', async () => {
    // Records ordered desc (index 0 = latest). Consecutive pairs: price[i] vs price[i+1].
    // For each pair i: |price[i] - price[i+1]| / price[i+1] = exactly 2%
    // price[i] = price[i+1] * 1.02, so price[i+1] = price[i] / 1.02
    const BASE = 80_000_000;
    const records = Array.from({ length: 10 }, (_, i) => {
      // Each consecutive difference is exactly 2% of the older (higher-index) price
      // price[i] = BASE / 1.02^i → price[i] / price[i+1] = 1.02 → change = 2% exactly
      const price = Math.round(BASE / Math.pow(1.02, i));
      return makeRecord(price, price + 200_000);
    });

    // findMany is called twice: once for today's records (velocity/spread), once for 24h (crossings)
    mockPrisma.priceRecord.findMany
      .mockResolvedValueOnce(records)   // today's records (velocity + latest spread)
      .mockResolvedValueOnce(records);  // 24h records (crossings)

    const result = await service.compute();

    // velocityScore should be capped at 40 (2% >= 2.0% threshold)
    // velocityPct = velocityScore / 40 * 100 = 100 when capped
    expect(result.indexValue).toBeGreaterThanOrEqual(40);
    // Verify by checking velocityPct = 100 (capped)
    expect(result.priceVelocity).toBe(100);
  });

  // Test 2: 0% change → velocity score = 0
  it('all same price (0% change) → velocity score = 0', async () => {
    const price = 80_000_000;
    const records = Array.from({ length: 10 }, () => makeRecord(price, price + 200_000));

    mockPrisma.priceRecord.findMany
      .mockResolvedValueOnce(records)
      .mockResolvedValueOnce(records);

    const result = await service.compute();

    // velocityPct = 0 when no change
    expect(result.priceVelocity).toBe(0);
  });

  // Test 3: Spread scoring
  describe('spread scoring', () => {
    function buildForSpread(spread: number) {
      const buy = 80_000_000;
      const sell = buy + spread;
      const record = makeRecord(buy, sell);
      return [record];
    }

    async function getSpreadScore(spread: number): Promise<number> {
      const records = buildForSpread(spread);
      mockPrisma.priceRecord.findMany
        .mockResolvedValueOnce(records)  // today
        .mockResolvedValueOnce([]);       // 24h (no crossings)

      const result = await service.compute();
      // spreadScore = totalScore - velocityScore(0) - crossingScore(0)
      // velocityScore = 0 (1 record, no pairs)
      // crossingScore = 0 (empty 24h)
      return result.indexValue;
    }

    it('spread = 500,000 → spread score = 30', async () => {
      const score = await getSpreadScore(500_000);
      expect(score).toBe(30);
    });

    it('spread = 200,000 → spread score = 0', async () => {
      const score = await getSpreadScore(200_000);
      expect(score).toBe(0);
    });

    it('spread = 350,000 → spread score = 15', async () => {
      const score = await getSpreadScore(350_000);
      expect(score).toBe(15);
    });
  });

  // Test 4: Threshold crossings
  describe('threshold crossings scoring', () => {
    async function getCrossingsScore(crossingCount: number): Promise<number> {
      // Build records with the exact number of crossings
      // Each crossing: consecutive prices cross a 500k boundary
      // Use prices that alternate across boundaries
      const records: ReturnType<typeof makeRecord>[] = [];
      // start below a boundary e.g. 79_900_000, then cross to 80_100_000 for each crossing
      let below = true;
      for (let i = 0; i <= crossingCount; i++) {
        const price = below ? 79_900_000 : 80_100_000;
        records.push(makeRecord(price, price + 200_000));
        below = !below;
      }

      mockPrisma.priceRecord.findMany
        .mockResolvedValueOnce([records[0]])  // today's records (1 record → no velocity)
        .mockResolvedValueOnce(records);       // 24h records

      const result = await service.compute();
      // crossingScore contributes to total, with no velocity and no spread (spread=200k → 0)
      // indexValue = round(0 + 0 + crossingScore)
      return result.indexValue;
    }

    it('10+ crossings → crossing score = 30', async () => {
      const score = await getCrossingsScore(10);
      expect(score).toBe(30);
    });

    it('5 crossings → crossing score = 15', async () => {
      const score = await getCrossingsScore(5);
      expect(score).toBe(15);
    });
  });

  // Test 5: Label boundaries
  describe('label boundaries', () => {
    // We need to produce exact scores. We'll test via the label field.
    // Build a scenario that produces exactly the right total score.
    // We control crossing score directly.

    function recordsForCrossings(n: number) {
      const recs: ReturnType<typeof makeRecord>[] = [];
      let below = true;
      for (let i = 0; i <= n; i++) {
        recs.push(makeRecord(below ? 79_900_000 : 80_100_000, (below ? 79_900_000 : 80_100_000) + 200_000));
        below = !below;
      }
      return recs;
    }

    it('score 33 → label Cold', async () => {
      // crossingScore = min(11/10, 1) * 30 = 30; spreadScore from spread 200k → 0; velocityScore→ ?
      // Need total = 33: crossings = 11 (score=30), spread = 200k (score=0), velocity=1 record→0
      // That gives 30 not 33. Let's try crossings=11 for 30, and spread tuned...
      // spread=230k: (230k-200k)/300k * 30 = 30k/300k * 30 = 3; total=33
      const spreadBuy = 80_000_000;
      const spreadSell = spreadBuy + 230_000;
      const todayRecord = makeRecord(spreadBuy, spreadSell);
      const recs24h = recordsForCrossings(11);

      mockPrisma.priceRecord.findMany
        .mockResolvedValueOnce([todayRecord])
        .mockResolvedValueOnce(recs24h);

      const result = await service.compute();
      expect(result.indexValue).toBe(33);
      expect(result.category).toBe('Cold');
    });

    it('score 34 → label Warm', async () => {
      // spread=233,333 → (33333/300k)*30 ≈ 3.33; total=33.33 → round to 33 → Cold
      // Need exactly 34: crossings=11 (30) + spread delta of 4
      // spread for score=4: 4 = (spread-200k)/300k * 30 → spread-200k = 40000 → spread=240k
      const spreadBuy = 80_000_000;
      const spreadSell = spreadBuy + 240_000;
      const todayRecord = makeRecord(spreadBuy, spreadSell);
      const recs24h = recordsForCrossings(11);

      mockPrisma.priceRecord.findMany
        .mockResolvedValueOnce([todayRecord])
        .mockResolvedValueOnce(recs24h);

      const result = await service.compute();
      expect(result.indexValue).toBe(34);
      expect(result.category).toBe('Warm');
    });

    it('score 66 → label Warm', async () => {
      // crossingScore=30 (11+ crossings), spreadScore=30 (spread>=500k), velocityScore=6
      // 30+30+6 = 66
      // velocityScore=6: 6 = min(avgPct/2, 1)*40 → avgPct/2=0.15 → avgPct=0.3%
      // Build 2 records: price1=80_000_000, price2=79_760_000 (0.3% change)
      // |80M - 79.76M| / 79.76M = 240k/79.76M ≈ 0.301%, velocityScore = 0.301/2*40 = 6.02 → round gives 66
      const price1 = 80_000_000;
      const price2 = Math.round(price1 / 1.003); // price2 * 1.003 = price1 → change = 0.3%
      const spread = 500_000;
      const todayRecords = [
        makeRecord(price1, price1 + spread),
        makeRecord(price2, price2 + spread),
      ];
      const recs24h = recordsForCrossings(11);

      mockPrisma.priceRecord.findMany
        .mockResolvedValueOnce(todayRecords)
        .mockResolvedValueOnce(recs24h);

      const result = await service.compute();
      expect(result.indexValue).toBe(66);
      expect(result.category).toBe('Warm');
    });

    it('score 67 → label Hot', async () => {
      // Same as above but velocity slightly higher to push to 67
      // velocityScore=7: avgPct=0.35% → price2 = price1/1.0035
      const price1 = 80_000_000;
      const price2 = Math.round(price1 / 1.0035);
      const spread = 500_000;
      const todayRecords = [
        makeRecord(price1, price1 + spread),
        makeRecord(price2, price2 + spread),
      ];
      const recs24h = recordsForCrossings(11);

      mockPrisma.priceRecord.findMany
        .mockResolvedValueOnce(todayRecords)
        .mockResolvedValueOnce(recs24h);

      const result = await service.compute();
      expect(result.indexValue).toBe(67);
      expect(result.category).toBe('Hot');
    });
  });
});
