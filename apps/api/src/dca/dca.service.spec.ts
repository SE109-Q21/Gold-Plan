import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DcaService } from './dca.service';
import { PrismaService } from '../database/prisma.service';

// Helper to build a mock PriceRecord
function makeRecord(dateStr: string, buyPrice: number) {
  return {
    brand: 'SJC' as const,
    goldType: 'MIEN_SJC' as const,
    buyPrice: BigInt(buyPrice),
    sellPrice: BigInt(buyPrice + 500_000),
    recordedAt: new Date(dateStr),
    isAnomalous: false,
  };
}

// 3 weekly purchase points: Jan 01, Jan 08, Jan 15 2024
const FIXTURE_RECORDS = [
  makeRecord('2024-01-01T08:00:00.000Z', 79_000_000),
  makeRecord('2024-01-08T08:00:00.000Z', 80_000_000),
  makeRecord('2024-01-15T08:00:00.000Z', 81_000_000),
];

const mockPrismaService = {
  priceRecord: {
    findMany: jest.fn(),
  },
};

describe('DcaService', () => {
  let service: DcaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DcaService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DcaService>(DcaService);
    jest.clearAllMocks();
  });

  describe('simulate — 3 weekly purchases', () => {
    beforeEach(() => {
      mockPrismaService.priceRecord.findMany.mockResolvedValue(FIXTURE_RECORDS);
    });

    it('totalGoldTael = 3.0', async () => {
      const result = await service.simulate({
        brand: 'SJC' as any,
        goldType: 'MIEN_SJC' as any,
        startDate: '2024-01-01',
        frequency: 'weekly',
        qtyPerPurchase: 1.0,
      });
      expect(result.totalGoldTael).toBe(3.0);
    });

    it('totalSpentVnd = 240_000_000', async () => {
      const result = await service.simulate({
        brand: 'SJC' as any,
        goldType: 'MIEN_SJC' as any,
        startDate: '2024-01-01',
        frequency: 'weekly',
        qtyPerPurchase: 1.0,
      });
      expect(result.totalSpentVnd).toBe(240_000_000);
    });

    it('averageCostVnd = 80_000_000', async () => {
      const result = await service.simulate({
        brand: 'SJC' as any,
        goldType: 'MIEN_SJC' as any,
        startDate: '2024-01-01',
        frequency: 'weekly',
        qtyPerPurchase: 1.0,
      });
      expect(result.averageCostVnd).toBe(80_000_000);
    });

    it('currentValueVnd = 243_000_000', async () => {
      const result = await service.simulate({
        brand: 'SJC' as any,
        goldType: 'MIEN_SJC' as any,
        startDate: '2024-01-01',
        frequency: 'weekly',
        qtyPerPurchase: 1.0,
      });
      expect(result.currentValueVnd).toBe(243_000_000);
    });

    it('dcaPnlVnd = 3_000_000, dcaPnlPct ≈ 1.25%', async () => {
      const result = await service.simulate({
        brand: 'SJC' as any,
        goldType: 'MIEN_SJC' as any,
        startDate: '2024-01-01',
        frequency: 'weekly',
        qtyPerPurchase: 1.0,
      });
      expect(result.dcaPnlVnd).toBe(3_000_000);
      expect(result.dcaPnlPct).toBeCloseTo(1.25, 5);
    });

    it('lump sum: lumpSumGoldTael = 240M/79M, lumpSumCurrentValueVnd correct', async () => {
      const result = await service.simulate({
        brand: 'SJC' as any,
        goldType: 'MIEN_SJC' as any,
        startDate: '2024-01-01',
        frequency: 'weekly',
        qtyPerPurchase: 1.0,
      });
      const lumpSumGoldTael = 240_000_000 / 79_000_000;
      const expectedLumpSumCurrentValue = lumpSumGoldTael * 81_000_000;
      expect(result.lumpSumCostVnd).toBe(240_000_000);
      expect(result.lumpSumCurrentValueVnd).toBeCloseTo(expectedLumpSumCurrentValue, 0);
      const expectedLumpSumPnlPct =
        ((expectedLumpSumCurrentValue - 240_000_000) / 240_000_000) * 100;
      expect(result.lumpSumPnlPct).toBeCloseTo(expectedLumpSumPnlPct, 5);
    });

    it('dataPoints.length = 3', async () => {
      const result = await service.simulate({
        brand: 'SJC' as any,
        goldType: 'MIEN_SJC' as any,
        startDate: '2024-01-01',
        frequency: 'weekly',
        qtyPerPurchase: 1.0,
      });
      expect(result.dataPoints.length).toBe(3);
    });

    it('dataPoints cumulative values are correct', async () => {
      const result = await service.simulate({
        brand: 'SJC' as any,
        goldType: 'MIEN_SJC' as any,
        startDate: '2024-01-01',
        frequency: 'weekly',
        qtyPerPurchase: 1.0,
      });
      const { dataPoints } = result;
      // Point 1: bought 1 tael at 79M, cumulative spent 79M, value at latestPrice 81M
      expect(dataPoints[0].cumulativeGold).toBe(1.0);
      expect(dataPoints[0].cumulativeSpent).toBe(79_000_000);
      expect(dataPoints[0].cumulativeValue).toBe(81_000_000);
      // lumpSumValue at point[0] = lumpSumGoldTael * 79M (price at that date)
      const lumpSumGoldTael = 240_000_000 / 79_000_000;
      expect(dataPoints[0].lumpSumValue).toBeCloseTo(lumpSumGoldTael * 79_000_000, 0);
    });
  });

  describe('simulate — insufficient data throws BadRequestException', () => {
    it('throws when only 1 data point is available', async () => {
      mockPrismaService.priceRecord.findMany.mockResolvedValue([
        makeRecord('2024-01-01T08:00:00.000Z', 79_000_000),
      ]);

      await expect(
        service.simulate({
          brand: 'SJC' as any,
          goldType: 'MIEN_SJC' as any,
          startDate: '2024-01-01',
          frequency: 'weekly',
          qtyPerPurchase: 1.0,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when no data points are available', async () => {
      mockPrismaService.priceRecord.findMany.mockResolvedValue([]);

      await expect(
        service.simulate({
          brand: 'SJC' as any,
          goldType: 'MIEN_SJC' as any,
          startDate: '2024-01-01',
          frequency: 'weekly',
          qtyPerPurchase: 1.0,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
