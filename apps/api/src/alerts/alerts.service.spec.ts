import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { PrismaService } from '../database/prisma.service';
import { CreateAlertDto } from './dto/create-alert.dto';

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
    trendN: null,
    spreadThreshold: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeValidDto(overrides: Partial<CreateAlertDto> = {}): CreateAlertDto {
  return {
    brand: 'SJC',
    goldType: 'MIEN_SJC',
    condition: 'lte',
    thresholdPrice: 80_000_000n,
    repeatMode: false,
    ...overrides,
  };
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe('AlertsService', () => {
  let service: AlertsService;
  let prisma: {
    priceAlert: {
      create: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    alertTriggerHistory: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      priceAlert: {
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      alertTriggerHistory: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ----------------------------------------------------------------
  // 1. createAlert — happy path
  // ----------------------------------------------------------------
  it('createAlert: saves and returns the new alert', async () => {
    const dto = makeValidDto();
    const savedAlert = makeAlert();

    prisma.priceAlert.count.mockResolvedValue(0);
    prisma.priceAlert.create.mockResolvedValue(savedAlert);

    const result = await service.createAlert('user-1', dto);

    expect(prisma.priceAlert.count).toHaveBeenCalledWith({
      where: { userId: 'user-1', status: 'active' },
    });
    expect(prisma.priceAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          thresholdPrice: 80_000_000n,
        }),
      }),
    );
    expect(result).toEqual(savedAlert);
  });

  // ----------------------------------------------------------------
  // 2. createAlert — throws 400 when user has >= 10 active alerts
  // ----------------------------------------------------------------
  it('createAlert: throws 400 when user already has 10 active alerts', async () => {
    prisma.priceAlert.count.mockResolvedValue(10);

    await expect(
      service.createAlert('user-1', makeValidDto()),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.priceAlert.create).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------------
  // 3. createAlert — throws 400 when thresholdPrice < 100_000
  // ----------------------------------------------------------------
  it('createAlert: throws 400 when thresholdPrice is below 100_000', async () => {
    const dto = makeValidDto({ thresholdPrice: 99_999n });

    await expect(service.createAlert('user-1', dto)).rejects.toThrow(
      BadRequestException,
    );

    expect(prisma.priceAlert.count).not.toHaveBeenCalled();
    expect(prisma.priceAlert.create).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------------
  // 4. deleteAlert — throws NotFoundException when not owner
  // ----------------------------------------------------------------
  it('deleteAlert: throws NotFoundException when alertId does not belong to user', async () => {
    prisma.priceAlert.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteAlert('user-1', 'non-existent-alert'),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.priceAlert.delete).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------------
  // 5. toggleAlert — flips active → inactive and inactive → active
  // ----------------------------------------------------------------
  it('toggleAlert: flips active → inactive', async () => {
    const activeAlert = makeAlert({ status: 'active' });
    const inactiveAlert = makeAlert({ status: 'inactive' });

    prisma.priceAlert.findFirst.mockResolvedValue(activeAlert);
    prisma.priceAlert.update.mockResolvedValue(inactiveAlert);

    const result = await service.toggleAlert('user-1', 'alert-1');

    expect(prisma.priceAlert.update).toHaveBeenCalledWith({
      where: { id: 'alert-1' },
      data: { status: 'inactive' },
    });
    expect(result.status).toBe('inactive');
  });

  it('toggleAlert: flips inactive → active', async () => {
    const inactiveAlert = makeAlert({ status: 'inactive' });
    const activeAlert = makeAlert({ status: 'active' });

    prisma.priceAlert.findFirst.mockResolvedValue(inactiveAlert);
    prisma.priceAlert.update.mockResolvedValue(activeAlert);

    const result = await service.toggleAlert('user-1', 'alert-1');

    expect(prisma.priceAlert.update).toHaveBeenCalledWith({
      where: { id: 'alert-1' },
      data: { status: 'active' },
    });
    expect(result.status).toBe('active');
  });
});
