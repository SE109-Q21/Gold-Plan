import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../database/prisma.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePriceRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'record-1',
    crawlSessionId: 'session-1',
    brand: 'SJC',
    goldType: 'MIEN_SJC',
    buyPrice: 8_000_000_000n,
    sellPrice: 8_100_000_000n,
    recordedAt: new Date('2024-01-15T10:00:00Z'),
    isAnomalous: true,
    anomalyReason: 'price spike',
    approvedAt: null,
    rejectedAt: null,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AdminService', () => {
  let service: AdminService;
  let prisma: {
    user: { count: jest.Mock; findUnique: jest.Mock; update: jest.Mock; findMany: jest.Mock };
    alertTriggerHistory: { count: jest.Mock };
    crawlSession: { findMany: jest.Mock };
    dataSource: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    priceRecord: { findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    anomalyReview: { upsert: jest.Mock };
    adminAuditLog: { create: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      alertTriggerHistory: { count: jest.fn() },
      crawlSession: { findMany: jest.fn() },
      dataSource: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      priceRecord: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      anomalyReview: { upsert: jest.fn() },
      adminAuditLog: { create: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. getStats() returns correct structure ──────────────────────────────

  describe('getStats()', () => {
    it('returns correct structure with calculated crawlSuccessRate', async () => {
      prisma.user.count
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(80);  // activeUsers
      prisma.alertTriggerHistory.count.mockResolvedValue(5);
      prisma.crawlSession.findMany.mockResolvedValue([
        { status: 'completed' },
        { status: 'completed' },
        { status: 'failed' },
        { status: 'completed' },
      ]);
      prisma.dataSource.findMany.mockResolvedValue([
        {
          id: 'ds-1',
          name: 'SJC Crawler',
          brand: 'SJC',
          url: 'https://sjc.com.vn',
          crawlType: 'HTML',
          frequencyMin: 5,
          isActive: true,
          lastCrawledAt: new Date('2024-01-15T09:00:00Z'),
          createdAt: new Date('2024-01-01T00:00:00Z'),
          crawlSessions: [{ status: 'completed' }],
        },
      ]);

      const stats = await service.getStats();

      expect(stats).toMatchObject({
        totalUsers: 100,
        activeUsers: 80,
        alertsSentToday: 5,
        crawlSuccessRate: 75,   // 3/4 = 75%
        dataSources: expect.arrayContaining([
          expect.objectContaining({ id: 'ds-1', lastStatus: 'completed' }),
        ]),
      });
    });

    it('returns 0 crawlSuccessRate when no sessions in last 24h', async () => {
      prisma.user.count.mockResolvedValue(0);
      prisma.alertTriggerHistory.count.mockResolvedValue(0);
      prisma.crawlSession.findMany.mockResolvedValue([]);
      prisma.dataSource.findMany.mockResolvedValue([]);

      const stats = await service.getStats();
      expect(stats.crawlSuccessRate).toBe(0);
    });
  });

  // ── 2. lockUser() sets status to 'locked' ────────────────────────────────

  describe('lockUser()', () => {
    it("sets user status to 'locked'", async () => {
      const user = { id: 'user-1', email: 'test@test.com', status: 'active' };
      const lockedUser = { ...user, status: 'locked' };

      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue(lockedUser);

      prisma.adminAuditLog.create.mockResolvedValue({});
      const result = await service.lockUser('user-1', 'admin-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { status: 'locked' },
      });
      expect(result.status).toBe('locked');
    });

    it('throws NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.lockUser('nonexistent', 'admin-1')).rejects.toThrow(NotFoundException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  // ── 3. reviewAnomaly('approved') clears isAnomalous and sets approvedAt ──

  describe("reviewAnomaly('approved')", () => {
    it('clears isAnomalous and sets approvedAt', async () => {
      const record = makePriceRecord();

      prisma.priceRecord.findUnique.mockResolvedValue(record);
      prisma.anomalyReview.upsert.mockResolvedValue({});
      prisma.priceRecord.update.mockResolvedValue({ ...record, isAnomalous: false, approvedAt: new Date() });
      prisma.adminAuditLog.create.mockResolvedValue({});

      const result = await service.reviewAnomaly('record-1', 'approved', 'admin-1');

      expect(prisma.anomalyReview.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { priceRecordId: 'record-1' },
          create: expect.objectContaining({ action: 'approved', reviewedBy: 'admin-1' }),
          update: expect.objectContaining({ action: 'approved', reviewedBy: 'admin-1' }),
        }),
      );
      expect(prisma.priceRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'record-1' },
          data: expect.objectContaining({ isAnomalous: false, approvedAt: expect.any(Date) }),
        }),
      );
      expect(result.action).toBe('approved');
    });
  });

  // ── 4. reviewAnomaly('rejected') sets rejectedAt but keeps isAnomalous ───

  describe("reviewAnomaly('rejected')", () => {
    it('sets rejectedAt but keeps isAnomalous=true', async () => {
      const record = makePriceRecord();

      prisma.priceRecord.findUnique.mockResolvedValue(record);
      prisma.anomalyReview.upsert.mockResolvedValue({});
      prisma.priceRecord.update.mockResolvedValue({ ...record, rejectedAt: new Date() });
      prisma.adminAuditLog.create.mockResolvedValue({});

      const result = await service.reviewAnomaly('record-1', 'rejected', 'admin-1');

      expect(prisma.priceRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'record-1' },
          data: expect.objectContaining({ rejectedAt: expect.any(Date) }),
        }),
      );

      // isAnomalous should NOT be set to false in the update data
      const updateCall = prisma.priceRecord.update.mock.calls[0][0];
      expect(updateCall.data.isAnomalous).toBeUndefined();

      expect(result.action).toBe('rejected');
    });

    it('throws NotFoundException when priceRecord not found', async () => {
      prisma.priceRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.reviewAnomaly('nonexistent', 'rejected', 'admin-1'),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.anomalyReview.upsert).not.toHaveBeenCalled();
    });
  });
});
