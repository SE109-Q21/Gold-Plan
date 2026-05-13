import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { PrismaService } from '../database/prisma.service';
import { PriceService } from '../price/price.service';

// Helper to build a mock PortfolioTransaction
function makeTx(overrides: Partial<{
  id: string;
  userId: string;
  type: string;
  brand: string;
  goldType: string;
  quantity: number;
  pricePerTael: number;
  transactedAt: Date;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  return {
    id: overrides.id ?? 'tx1',
    userId: overrides.userId ?? 'user1',
    type: overrides.type ?? 'BUY',
    brand: overrides.brand ?? 'SJC',
    goldType: overrides.goldType ?? 'MIEN_SJC',
    quantity: { toNumber: () => overrides.quantity ?? 1, valueOf: () => overrides.quantity ?? 1 },
    pricePerTael: BigInt(overrides.pricePerTael ?? 80_000_000),
    transactedAt: overrides.transactedAt ?? new Date('2024-01-01T00:00:00.000Z'),
    note: overrides.note ?? null,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  };
}

// Mock Prisma and PriceService
const mockPrismaService = {
  portfolioTransaction: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  priceRecord: {
    findMany: jest.fn(),
  },
};

const mockPriceService = {
  getCurrentPrices: jest.fn(),
};

// Override Number() conversion for Decimal mock — transactions use Number(tx.quantity)
// We store raw numbers in fixture and the service calls Number(tx.quantity)
function makeTxRaw(overrides: {
  id?: string;
  userId?: string;
  type: string;
  brand: string;
  goldType: string;
  quantity: number;
  pricePerTael: number;
  transactedAt?: Date;
}) {
  return {
    id: overrides.id ?? 'tx1',
    userId: overrides.userId ?? 'user1',
    type: overrides.type,
    brand: overrides.brand,
    goldType: overrides.goldType,
    // Prisma Decimal — Number() coercion needed
    quantity: overrides.quantity,
    pricePerTael: BigInt(overrides.pricePerTael),
    transactedAt: overrides.transactedAt ?? new Date('2024-01-01T00:00:00.000Z'),
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('PortfolioService', () => {
  let service: PortfolioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PriceService, useValue: mockPriceService },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
    jest.clearAllMocks();
  });

  describe('getPortfolio — 2 BUY transactions, same brand/goldType', () => {
    it('computes correct netQty and weighted avg cost', async () => {
      const tx1 = makeTxRaw({
        type: 'BUY', brand: 'SJC', goldType: 'MIEN_SJC',
        quantity: 2, pricePerTael: 80_000_000,
      });
      const tx2 = makeTxRaw({
        id: 'tx2', type: 'BUY', brand: 'SJC', goldType: 'MIEN_SJC',
        quantity: 1, pricePerTael: 82_000_000,
      });

      mockPrismaService.portfolioTransaction.findMany.mockResolvedValue([tx1, tx2]);
      mockPriceService.getCurrentPrices.mockResolvedValue([
        { brand: 'SJC', goldType: 'MIEN_SJC', buyPrice: 85_000_000 },
      ]);

      const summary = await service.getPortfolio('user1');

      expect(summary.holdings).toHaveLength(1);
      const h = summary.holdings[0];

      // netQty = 2 + 1 = 3
      expect(h.netQty).toBeCloseTo(3, 5);

      // avgCostPerTael = (2*80M + 1*82M) / 3 = 242M / 3 ≈ 80_666_666.67
      const expectedAvgCost = (2 * 80_000_000 + 1 * 82_000_000) / 3;
      expect(h.avgCostPerTael).toBeCloseTo(expectedAvgCost, 0);

      // currentValueVnd = 3 * 85M = 255M
      expect(h.currentValueVnd).toBeCloseTo(3 * 85_000_000, 0);
    });
  });

  describe('getPortfolio — BUY then SELL reduces netQty', () => {
    it('netQty is reduced correctly after a SELL', async () => {
      const buy = makeTxRaw({
        type: 'BUY', brand: 'SJC', goldType: 'MIEN_SJC',
        quantity: 3, pricePerTael: 80_000_000,
      });
      const sell = makeTxRaw({
        id: 'tx2', type: 'SELL', brand: 'SJC', goldType: 'MIEN_SJC',
        quantity: 1, pricePerTael: 85_000_000,
        transactedAt: new Date('2024-02-01T00:00:00.000Z'),
      });

      mockPrismaService.portfolioTransaction.findMany.mockResolvedValue([buy, sell]);
      mockPriceService.getCurrentPrices.mockResolvedValue([
        { brand: 'SJC', goldType: 'MIEN_SJC', buyPrice: 85_000_000 },
      ]);

      const summary = await service.getPortfolio('user1');

      expect(summary.holdings).toHaveLength(1);
      // netQty = 3 - 1 = 2
      expect(summary.holdings[0].netQty).toBeCloseTo(2, 5);
    });
  });

  describe('addTransaction — quantity validation', () => {
    it('throws BadRequestException when quantity is 0', async () => {
      await expect(
        service.addTransaction('user1', {
          type: 'BUY',
          brand: 'SJC',
          goldType: 'MIEN_SJC',
          quantity: 0,
          pricePerTael: 80_000_000,
          transactedAt: '2024-01-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when quantity is negative', async () => {
      await expect(
        service.addTransaction('user1', {
          type: 'BUY',
          brand: 'SJC',
          goldType: 'MIEN_SJC',
          quantity: -1,
          pricePerTael: 80_000_000,
          transactedAt: '2024-01-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteTransaction — ownership check', () => {
    it('throws NotFoundException when wrong userId is used', async () => {
      // findFirst returns null → not owned by this user
      mockPrismaService.portfolioTransaction.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteTransaction('wrong-user', 'tx1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
