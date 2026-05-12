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
        makeRecord({ recordedAt: new Date('2026-05-12T08:00:00Z'), buyPrice: 85_000_000n, sellPrice: 85_020_000n }),
        makeRecord({ recordedAt: new Date('2026-05-12T08:05:00Z'), buyPrice: 85_100_000n, sellPrice: 85_120_000n }),
      ];
      (mockPrisma.priceRecord.findMany as jest.Mock).mockResolvedValue(records);

      const result = await service.getHistory('SJC' as any, 'MIEN_SJC' as any, '1D');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        recordedAt: '2026-05-12T08:00:00.000Z',
        buyPrice: 85_000_000,
        sellPrice: 85_020_000,
      });

      expect(mockPrisma.priceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            brand: 'SJC',
            goldType: 'MIEN_SJC',
            recordedAt: expect.objectContaining({ gte: expect.any(Date) }),
          }),
          orderBy: { recordedAt: 'asc' },
        }),
      );
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
