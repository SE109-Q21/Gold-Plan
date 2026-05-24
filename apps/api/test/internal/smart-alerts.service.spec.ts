import { Test, TestingModule } from '@nestjs/testing';
import { SmartAlertsService } from '../../src/smart-alerts/smart-alerts.service';
import { PrismaService } from '../../src/database/prisma.service';
import { MailService } from '../../src/mail/mail.service';

class TestableService extends SmartAlertsService {
  public testEvaluateTrend = this.evaluateTrend.bind(this);
  public testEvaluateSpread = this.evaluateSpread.bind(this);
  public testEvaluateCondition = this.evaluateCondition.bind(this);
}

describe('SmartAlertsService — protected evaluation helpers', () => {
  let service: TestableService;

  beforeEach(() => {
    service = new TestableService(null as any, null as any);
  });

  it('evaluateTrend: [100,110,120] n=3 up → true', () => {
    expect(service.testEvaluateTrend([100, 110, 120], 3, 'up')).toBe(true);
  });

  it('evaluateTrend: [130,120,110] n=3 down → true', () => {
    expect(service.testEvaluateTrend([130, 120, 110], 3, 'down')).toBe(true);
  });

  it('evaluateTrend: [100,110,120] n=3 down → false', () => {
    expect(service.testEvaluateTrend([100, 110, 120], 3, 'down')).toBe(false);
  });

  it('evaluateTrend: [100,110] n=3 up → false (insufficient data)', () => {
    expect(service.testEvaluateTrend([100, 110], 3, 'up')).toBe(false);
  });

  it('evaluateSpread: buy=79_000_000 sell=79_150_000 threshold=200_000 → true (spread 150k ≤ 200k)', () => {
    expect(service.testEvaluateSpread(79_000_000, 79_150_000, 200_000)).toBe(true);
  });

  it('evaluateSpread: buy=79_000_000 sell=79_300_000 threshold=200_000 → false (spread 300k > 200k)', () => {
    expect(service.testEvaluateSpread(79_000_000, 79_300_000, 200_000)).toBe(false);
  });

  it('evaluateCondition: THRESHOLD lte is true when price below threshold', () => {
    const cond = { type: 'THRESHOLD', params: { condition: 'lte', priceVnd: 80_000_000 } };
    const records = [{ buyPrice: 79_000_000n, sellPrice: 79_200_000n }];
    expect(service.testEvaluateCondition(cond, records)).toBe(true);
  });

  it('evaluateCondition: THRESHOLD gte is false when price below threshold', () => {
    const cond = { type: 'THRESHOLD', params: { condition: 'gte', priceVnd: 80_000_000 } };
    const records = [{ buyPrice: 79_000_000n, sellPrice: 79_200_000n }];
    expect(service.testEvaluateCondition(cond, records)).toBe(false);
  });

  it('evaluateCondition: THRESHOLD returns false when no records', () => {
    const cond = { type: 'THRESHOLD', params: { condition: 'lte', priceVnd: 80_000_000 } };
    expect(service.testEvaluateCondition(cond, [])).toBe(false);
  });

  it('evaluateCondition: SPREAD returns false when no records', () => {
    const cond = { type: 'SPREAD', params: { thresholdVnd: 200_000 } };
    expect(service.testEvaluateCondition(cond, [])).toBe(false);
  });

  it('evaluateCondition: TREND returns false when insufficient data', () => {
    const cond = { type: 'TREND', params: { n: 3, direction: 'up' } };
    const records = [{ buyPrice: 79_000_000n, sellPrice: 79_200_000n }];
    expect(service.testEvaluateCondition(cond, records)).toBe(false);
  });

  it('evaluateCondition: unknown type returns false', () => {
    const cond = { type: 'UNKNOWN', params: {} };
    const records = [{ buyPrice: 79_000_000n, sellPrice: 79_200_000n }];
    expect(service.testEvaluateCondition(cond, records)).toBe(false);
  });
});

describe('SmartAlertsService.evaluate', () => {
  let service: SmartAlertsService;
  let prisma: {
    smartAlert: {
      findMany: jest.Mock;
      update: jest.Mock;
    };
    priceRecord: {
      findMany: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
  };
  let mailService: { sendAlertEmail: jest.Mock };

  beforeEach(async () => {
    prisma = {
      smartAlert: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      priceRecord: {
        findMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    mailService = {
      sendAlertEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmartAlertsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<SmartAlertsService>(SmartAlertsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fires alert, updates status, and emails user when condition met', async () => {
    prisma.smartAlert.findMany.mockResolvedValue([
      {
        id: 'alert-1',
        userId: 'user-1',
        brand: 'SJC',
        goldType: 'MIEN_SJC',
        condition1: { type: 'THRESHOLD', params: { condition: 'lte', priceVnd: 80_000_000 } },
        condition2: null,
        status: 'active',
      },
    ]);
    prisma.priceRecord.findMany
      .mockResolvedValueOnce([
        { buyPrice: 79_000_000n, sellPrice: 79_200_000n },
      ])
      .mockResolvedValueOnce([
        { buyPrice: 79_000_000n, recordedAt: new Date('2026-05-20T00:00:00Z') },
        { buyPrice: 79_100_000n, recordedAt: new Date('2026-05-20T01:00:00Z') },
      ]);
    prisma.user.findUnique.mockResolvedValue({ email: 'user@example.com' });
    prisma.smartAlert.update.mockResolvedValue({ id: 'alert-1', status: 'triggered' });

    await service.evaluate();

    expect(prisma.smartAlert.update).toHaveBeenCalledWith({
      where: { id: 'alert-1' },
      data: { status: 'triggered', lastFiredAt: expect.any(Date) },
    });
    expect(mailService.sendAlertEmail).toHaveBeenCalled();
  });

  it('does not fire when no price records exist', async () => {
    prisma.smartAlert.findMany.mockResolvedValue([
      {
        id: 'alert-1',
        userId: 'user-1',
        brand: 'SJC',
        goldType: 'MIEN_SJC',
        condition1: { type: 'THRESHOLD', params: { condition: 'lte', priceVnd: 80_000_000 } },
        condition2: null,
        status: 'active',
      },
    ]);
    prisma.priceRecord.findMany.mockResolvedValueOnce([]);

    await service.evaluate();

    expect(prisma.smartAlert.update).not.toHaveBeenCalled();
    expect(mailService.sendAlertEmail).not.toHaveBeenCalled();
  });

  it('chartSvg is empty when less than 2 records', async () => {
    prisma.smartAlert.findMany.mockResolvedValue([
      {
        id: 'alert-1',
        userId: 'user-1',
        brand: 'SJC',
        goldType: 'MIEN_SJC',
        condition1: { type: 'THRESHOLD', params: { condition: 'lte', priceVnd: 80_000_000 } },
        condition2: null,
        status: 'active',
      },
    ]);
    prisma.priceRecord.findMany
      .mockResolvedValueOnce([
        { buyPrice: 79_000_000n, sellPrice: 79_200_000n },
      ])
      .mockResolvedValueOnce([
        { buyPrice: 79_000_000n, recordedAt: new Date('2026-05-20T00:00:00Z') },
      ]);
    prisma.user.findUnique.mockResolvedValue({ email: 'user@example.com' });
    prisma.smartAlert.update.mockResolvedValue({ id: 'alert-1', status: 'triggered' });

    await service.evaluate();

    expect(mailService.sendAlertEmail).toHaveBeenCalled();
    const payload = mailService.sendAlertEmail.mock.calls[0][1];
    expect(payload.chartSvg).toBe('');
  });

  it('does not fire when condition2 fails', async () => {
    prisma.smartAlert.findMany.mockResolvedValue([
      {
        id: 'alert-1',
        userId: 'user-1',
        brand: 'SJC',
        goldType: 'MIEN_SJC',
        condition1: { type: 'THRESHOLD', params: { condition: 'lte', priceVnd: 80_000_000 } },
        condition2: { type: 'SPREAD', params: { thresholdVnd: 100_000 } },
        status: 'active',
      },
    ]);
    prisma.priceRecord.findMany.mockResolvedValue([
      { buyPrice: 79_000_000n, sellPrice: 79_300_000n },
    ]);

    await service.evaluate();

    expect(prisma.smartAlert.update).not.toHaveBeenCalled();
    expect(mailService.sendAlertEmail).not.toHaveBeenCalled();
  });

  it('skips email when user is missing', async () => {
    prisma.smartAlert.findMany.mockResolvedValue([
      {
        id: 'alert-1',
        userId: 'user-1',
        brand: 'SJC',
        goldType: 'MIEN_SJC',
        condition1: { type: 'THRESHOLD', params: { condition: 'lte', priceVnd: 80_000_000 } },
        condition2: null,
        status: 'active',
      },
    ]);
    prisma.priceRecord.findMany
      .mockResolvedValueOnce([
        { buyPrice: 79_000_000n, sellPrice: 79_200_000n },
      ])
      .mockResolvedValueOnce([
        { buyPrice: 79_000_000n, recordedAt: new Date('2026-05-20T00:00:00Z') },
        { buyPrice: 79_100_000n, recordedAt: new Date('2026-05-20T01:00:00Z') },
      ]);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.smartAlert.update.mockResolvedValue({ id: 'alert-1', status: 'triggered' });

    await service.evaluate();

    expect(prisma.smartAlert.update).toHaveBeenCalled();
    expect(mailService.sendAlertEmail).not.toHaveBeenCalled();
  });

  it('continues processing after one alert throws', async () => {
    prisma.smartAlert.findMany.mockResolvedValue([
      { id: 'alert-1', userId: 'user-1', brand: 'SJC', goldType: 'MIEN_SJC', condition1: { type: 'THRESHOLD', params: { condition: 'lte', priceVnd: 80_000_000 } }, condition2: null, status: 'active' },
      { id: 'alert-2', userId: 'user-2', brand: 'SJC', goldType: 'MIEN_SJC', condition1: { type: 'THRESHOLD', params: { condition: 'lte', priceVnd: 80_000_000 } }, condition2: null, status: 'active' },
    ]);
    prisma.priceRecord.findMany
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([
        { buyPrice: 79_000_000n, sellPrice: 79_200_000n },
      ])
      .mockResolvedValueOnce([
        { buyPrice: 79_000_000n, recordedAt: new Date('2026-05-20T00:00:00Z') },
        { buyPrice: 79_100_000n, recordedAt: new Date('2026-05-20T01:00:00Z') },
      ]);
    prisma.user.findUnique.mockResolvedValue({ email: 'user2@example.com' });
    prisma.smartAlert.update.mockResolvedValue({ id: 'alert-2', status: 'triggered' });

    await service.evaluate();

    expect(prisma.smartAlert.update).toHaveBeenCalledWith({
      where: { id: 'alert-2' },
      data: { status: 'triggered', lastFiredAt: expect.any(Date) },
    });
  });
});
