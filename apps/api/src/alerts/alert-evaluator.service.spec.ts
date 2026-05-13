import { Test, TestingModule } from '@nestjs/testing';
import { AlertEvaluatorService } from './alert-evaluator.service';
import { PrismaService } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function makeAlert(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'alert-1',
    userId: 'user-1',
    brand: 'SJC',
    goldType: 'MIEN_SJC',
    condition: 'lte',
    thresholdPrice: 80_000_000n,
    status: 'active',
    repeatMode: false,
    lastTriggeredAt: null,
    user: { email: 'test@example.com' },
    ...overrides,
  };
}

function makePriceRecord(buyPrice: bigint = 79_000_000n) {
  return {
    brand: 'SJC',
    goldType: 'MIEN_SJC',
    buyPrice,
    isAnomalous: false,
    recordedAt: new Date(),
  };
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe('AlertEvaluatorService', () => {
  let service: AlertEvaluatorService;
  let prisma: {
    priceAlert: {
      findMany: jest.Mock;
      update: jest.Mock;
    };
    priceRecord: {
      findFirst: jest.Mock;
    };
    alertTriggerHistory: {
      create: jest.Mock;
    };
  };
  let mailService: { sendAlertEmail: jest.Mock };

  beforeEach(async () => {
    prisma = {
      priceAlert: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      priceRecord: {
        findFirst: jest.fn(),
      },
      alertTriggerHistory: {
        create: jest.fn(),
      },
    };

    mailService = {
      sendAlertEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertEvaluatorService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<AlertEvaluatorService>(AlertEvaluatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ----------------------------------------------------------------
  // 1. condition met + repeatMode=false → status becomes "triggered", history created
  // ----------------------------------------------------------------
  it('condition met + repeatMode=false → triggers alert and sets status to triggered', async () => {
    const alert = makeAlert({ condition: 'lte', thresholdPrice: 80_000_000n, repeatMode: false });
    // buyPrice (79M) <= thresholdPrice (80M) → condition met
    const record = makePriceRecord(79_000_000n);

    prisma.priceAlert.findMany.mockResolvedValue([alert]);
    prisma.priceRecord.findFirst.mockResolvedValue(record);
    prisma.alertTriggerHistory.create.mockResolvedValue({});
    prisma.priceAlert.update.mockResolvedValue({});

    await service.evaluate();

    expect(mailService.sendAlertEmail).toHaveBeenCalledWith(
      'test@example.com',
      expect.objectContaining({
        brand: 'SJC',
        goldType: 'MIEN_SJC',
        condition: 'lte',
        thresholdPrice: 80_000_000n,
        currentPrice: 79_000_000n,
      }),
    );

    expect(prisma.alertTriggerHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          alertId: 'alert-1',
          priceAtTrigger: 79_000_000n,
        }),
      }),
    );

    expect(prisma.priceAlert.update).toHaveBeenCalledWith({
      where: { id: 'alert-1' },
      data: { status: 'triggered' },
    });
  });

  // ----------------------------------------------------------------
  // 2. condition met + repeatMode=true + cooldown NOT expired → skipped
  // ----------------------------------------------------------------
  it('condition met + repeatMode=true + cooldown not expired → skipped (no history, no update)', async () => {
    // lastTriggeredAt = 10 minutes ago → cooldown not expired (< 30 min)
    const recentFire = new Date(Date.now() - 10 * 60_000);
    const alert = makeAlert({
      condition: 'lte',
      thresholdPrice: 80_000_000n,
      repeatMode: true,
      lastTriggeredAt: recentFire,
    });
    const record = makePriceRecord(79_000_000n);

    prisma.priceAlert.findMany.mockResolvedValue([alert]);
    prisma.priceRecord.findFirst.mockResolvedValue(record);

    await service.evaluate();

    expect(mailService.sendAlertEmail).not.toHaveBeenCalled();
    expect(prisma.alertTriggerHistory.create).not.toHaveBeenCalled();
    expect(prisma.priceAlert.update).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------------
  // 3. condition met + repeatMode=true + cooldown expired → history created, lastTriggeredAt updated
  // ----------------------------------------------------------------
  it('condition met + repeatMode=true + cooldown expired → history created, lastTriggeredAt updated', async () => {
    // lastTriggeredAt = 35 minutes ago → cooldown expired (> 30 min)
    const oldFire = new Date(Date.now() - 35 * 60_000);
    const alert = makeAlert({
      condition: 'lte',
      thresholdPrice: 80_000_000n,
      repeatMode: true,
      lastTriggeredAt: oldFire,
    });
    const record = makePriceRecord(79_000_000n);

    prisma.priceAlert.findMany.mockResolvedValue([alert]);
    prisma.priceRecord.findFirst.mockResolvedValue(record);
    prisma.alertTriggerHistory.create.mockResolvedValue({});
    prisma.priceAlert.update.mockResolvedValue({});

    await service.evaluate();

    expect(mailService.sendAlertEmail).toHaveBeenCalled();

    expect(prisma.alertTriggerHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          alertId: 'alert-1',
          priceAtTrigger: 79_000_000n,
        }),
      }),
    );

    // Should update lastTriggeredAt, NOT status
    expect(prisma.priceAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'alert-1' },
        data: expect.objectContaining({ lastTriggeredAt: expect.any(Date) }),
      }),
    );
    // Ensure status was NOT set to triggered
    const updateCall = prisma.priceAlert.update.mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty('status');
  });

  // ----------------------------------------------------------------
  // 4. condition NOT met → no action
  // ----------------------------------------------------------------
  it('condition NOT met → no email, no history, no update', async () => {
    const alert = makeAlert({ condition: 'lte', thresholdPrice: 80_000_000n, repeatMode: false });
    // buyPrice (81M) > thresholdPrice (80M) → lte condition NOT met
    const record = makePriceRecord(81_000_000n);

    prisma.priceAlert.findMany.mockResolvedValue([alert]);
    prisma.priceRecord.findFirst.mockResolvedValue(record);

    await service.evaluate();

    expect(mailService.sendAlertEmail).not.toHaveBeenCalled();
    expect(prisma.alertTriggerHistory.create).not.toHaveBeenCalled();
    expect(prisma.priceAlert.update).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------------
  // 5. gte condition met
  // ----------------------------------------------------------------
  it('gte condition met → triggers alert', async () => {
    const alert = makeAlert({ condition: 'gte', thresholdPrice: 80_000_000n, repeatMode: false });
    // buyPrice (85M) >= thresholdPrice (80M) → gte condition met
    const record = makePriceRecord(85_000_000n);

    prisma.priceAlert.findMany.mockResolvedValue([alert]);
    prisma.priceRecord.findFirst.mockResolvedValue(record);
    prisma.alertTriggerHistory.create.mockResolvedValue({});
    prisma.priceAlert.update.mockResolvedValue({});

    await service.evaluate();

    expect(mailService.sendAlertEmail).toHaveBeenCalled();
    expect(prisma.alertTriggerHistory.create).toHaveBeenCalled();
    expect(prisma.priceAlert.update).toHaveBeenCalledWith({
      where: { id: 'alert-1' },
      data: { status: 'triggered' },
    });
  });

  // ----------------------------------------------------------------
  // 6. No price record → skipped
  // ----------------------------------------------------------------
  it('no price record found → alert skipped', async () => {
    const alert = makeAlert();

    prisma.priceAlert.findMany.mockResolvedValue([alert]);
    prisma.priceRecord.findFirst.mockResolvedValue(null);

    await service.evaluate();

    expect(mailService.sendAlertEmail).not.toHaveBeenCalled();
    expect(prisma.alertTriggerHistory.create).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------------
  // 7. Email failure → history still created (emailSentAt=null)
  // ----------------------------------------------------------------
  it('email send failure → history still created with emailSentAt=null', async () => {
    const alert = makeAlert({ condition: 'lte', thresholdPrice: 80_000_000n, repeatMode: false });
    const record = makePriceRecord(79_000_000n);

    prisma.priceAlert.findMany.mockResolvedValue([alert]);
    prisma.priceRecord.findFirst.mockResolvedValue(record);
    prisma.alertTriggerHistory.create.mockResolvedValue({});
    prisma.priceAlert.update.mockResolvedValue({});

    mailService.sendAlertEmail.mockRejectedValue(new Error('SMTP failure'));

    await service.evaluate();

    expect(prisma.alertTriggerHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          alertId: 'alert-1',
          priceAtTrigger: 79_000_000n,
          emailSentAt: null,
        }),
      }),
    );

    expect(prisma.priceAlert.update).toHaveBeenCalledWith({
      where: { id: 'alert-1' },
      data: { status: 'triggered' },
    });
  });
});
