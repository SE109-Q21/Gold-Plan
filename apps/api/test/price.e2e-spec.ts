import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtService } from '../src/auth/jwt.service';

type PriceRecord = {
  id: string;
  brand: string;
  goldType: string;
  buyPrice: bigint;
  sellPrice: bigint;
  recordedAt: Date;
  isAnomalous: boolean;
  crawlSessionId: string;
  anomalyReason: string | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
};

function makeRecord(overrides: Partial<PriceRecord> = {}): PriceRecord {
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

function makeRecords(count: number, start: Date, stepMs = 60_000): PriceRecord[] {
  return Array.from({ length: count }, (_, i) =>
    makeRecord({
      id: `rec-${i}`,
      recordedAt: new Date(start.getTime() + i * stepMs),
      buyPrice: BigInt(85_000_000 + i),
      sellPrice: BigInt(85_020_000 + i),
    }),
  );
}

const mockPrismaService = {
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
  onModuleInit: jest.fn().mockResolvedValue(undefined),
  priceRecord: {
    findMany: jest.fn(),
  },
} as unknown as PrismaService;

const jwtMock = {
  signAccess: jest.fn(),
  signRefresh: jest.fn(),
  verifyAccess: jest.fn(),
  verifyRefresh: jest.fn(),
};

describe('Price endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(JwtService)
      .useValue(jwtMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/prices/domestic returns current prices with status and changePercent', async () => {
    const now = new Date('2026-05-12T10:00:00Z');
    jest.useFakeTimers().setSystemTime(now);

    const currentRec = makeRecord({ recordedAt: new Date(now.getTime() - 2 * 60_000) });
    const prevRec = makeRecord({
      id: 'rec-0',
      buyPrice: 85_000_000n,
      sellPrice: 85_020_000n,
      recordedAt: new Date(now.getTime() - 7 * 60_000),
    });

    (mockPrismaService.priceRecord.findMany as jest.Mock).mockResolvedValue([
      currentRec,
      prevRec,
    ]);

    const response = await request(app.getHttpServer())
      .get('/api/prices/domestic')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].brand).toBe('SJC');
    expect(response.body[0].goldType).toBe('MIEN_SJC');
    expect(response.body[0].buyPrice).toBe(85_500_000);
    expect(response.body[0].status).toBe('live');
    expect(response.body[0].changePercent).toBeCloseTo(
      ((85_500_000 - 85_000_000) / 85_000_000) * 100,
      1,
    );

    jest.useRealTimers();
  });

  it('GET /api/prices/domestic returns empty array when no data', async () => {
    (mockPrismaService.priceRecord.findMany as jest.Mock).mockResolvedValue([]);

    const response = await request(app.getHttpServer())
      .get('/api/prices/domestic')
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('GET /api/prices/domestic marks outdated and null changePercent with single record', async () => {
    const now = new Date('2026-05-12T10:00:00Z');
    jest.useFakeTimers().setSystemTime(now);

    const oldRec = makeRecord({ recordedAt: new Date(now.getTime() - 40 * 60_000) });
    (mockPrismaService.priceRecord.findMany as jest.Mock).mockResolvedValue([oldRec]);

    const response = await request(app.getHttpServer())
      .get('/api/prices/domestic')
      .expect(200);

    expect(response.body[0].status).toBe('outdated');
    expect(response.body[0].changePercent).toBeNull();

    jest.useRealTimers();
  });

  it('GET /api/prices/history returns chart points for range', async () => {
    const records = [
      makeRecord({ recordedAt: new Date('2026-05-12T08:00:00Z'), buyPrice: 85_000_000n, sellPrice: 85_020_000n }),
      makeRecord({ recordedAt: new Date('2026-05-12T08:05:00Z'), buyPrice: 85_100_000n, sellPrice: 85_120_000n }),
    ];
    (mockPrismaService.priceRecord.findMany as jest.Mock).mockResolvedValue(records);

    const response = await request(app.getHttpServer())
      .get('/api/prices/history')
      .query({ brand: 'SJC', goldType: 'MIEN_SJC', range: '1D' })
      .expect(200);

    expect(response.body).toEqual([
      {
        recordedAt: '2026-05-12T08:00:00.000Z',
        buyPrice: 85_000_000,
        sellPrice: 85_020_000,
      },
      {
        recordedAt: '2026-05-12T08:05:00.000Z',
        buyPrice: 85_100_000,
        sellPrice: 85_120_000,
      },
    ]);
  });

  it('GET /api/prices/history returns 400 for missing params', async () => {
    await request(app.getHttpServer())
      .get('/api/prices/history')
      .query({ brand: 'SJC' })
      .expect(400);
  });

  it('GET /api/prices/history returns 400 for invalid range', async () => {
    await request(app.getHttpServer())
      .get('/api/prices/history')
      .query({ brand: 'SJC', goldType: 'MIEN_SJC', range: '10Y' })
      .expect(400);
  });

  it('GET /api/prices/history returns empty array when no records', async () => {
    (mockPrismaService.priceRecord.findMany as jest.Mock).mockResolvedValue([]);

    const response = await request(app.getHttpServer())
      .get('/api/prices/history')
      .query({ brand: 'SJC', goldType: 'MIEN_SJC', range: '1D' })
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('GET /api/prices/history thins 1Y range to max points', async () => {
    const records = makeRecords(1200, new Date('2026-01-01T00:00:00Z'));
    (mockPrismaService.priceRecord.findMany as jest.Mock).mockResolvedValue(records);

    const response = await request(app.getHttpServer())
      .get('/api/prices/history')
      .query({ brand: 'SJC', goldType: 'MIEN_SJC', range: '1Y' })
      .expect(200);

    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body.length).toBeLessThanOrEqual(365);
  });

  it('GET /api/prices/history thins 3M range to max points', async () => {
    const records = makeRecords(800, new Date('2026-03-01T00:00:00Z'));
    (mockPrismaService.priceRecord.findMany as jest.Mock).mockResolvedValue(records);

    const response = await request(app.getHttpServer())
      .get('/api/prices/history')
      .query({ brand: 'SJC', goldType: 'MIEN_SJC', range: '3M' })
      .expect(200);

    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body.length).toBeLessThanOrEqual(500);
  });

  it('GET /api/prices/comparison returns per-brand best buy/sell flags', async () => {
    const sjcRec = makeRecord({ brand: 'SJC', buyPrice: 85_500_000n, sellPrice: 85_520_000n });
    const dojiRec = makeRecord({ id: 'rec-2', brand: 'DOJI', buyPrice: 85_200_000n, sellPrice: 85_380_000n });
    (mockPrismaService.priceRecord.findMany as jest.Mock).mockResolvedValue([sjcRec, dojiRec]);

    const response = await request(app.getHttpServer())
      .get('/api/prices/comparison')
      .query({ goldType: 'MIEN_SJC' })
      .expect(200);

    const sjcRow = response.body[0].brands.find((b: { brand: string }) => b.brand === 'SJC');
    const dojiRow = response.body[0].brands.find((b: { brand: string }) => b.brand === 'DOJI');

    expect(sjcRow.isBestBuy).toBe(true);
    expect(dojiRow.isBestBuy).toBe(false);
    expect(dojiRow.isBestSell).toBe(true);
    expect(sjcRow.isBestSell).toBe(false);
  });

  it('GET /api/prices/comparison returns 400 for invalid goldType', async () => {
    await request(app.getHttpServer())
      .get('/api/prices/comparison')
      .query({ goldType: 'BAD_TYPE' })
      .expect(400);
  });

  it('GET /api/prices/comparison returns empty brands when no records', async () => {
    (mockPrismaService.priceRecord.findMany as jest.Mock).mockResolvedValue([]);

    const response = await request(app.getHttpServer())
      .get('/api/prices/comparison')
      .query({ goldType: 'MIEN_SJC' })
      .expect(200);

    expect(response.body[0].brands).toEqual([]);
  });

  it('GET /api/prices/history/export returns 401 without auth', async () => {
    await request(app.getHttpServer())
      .get('/api/prices/history/export')
      .query({ brand: 'SJC', goldType: 'MIEN_SJC', range: '1D' })
      .expect(401);
  });

  it('GET /api/prices/history/export returns CSV with auth', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });

    const records = [
      makeRecord({ recordedAt: new Date('2026-05-12T08:00:00Z') }),
    ];
    (mockPrismaService.priceRecord.findMany as jest.Mock).mockResolvedValue(records);

    const response = await request(app.getHttpServer())
      .get('/api/prices/history/export')
      .set('Authorization', 'Bearer valid-token')
      .query({ brand: 'SJC', goldType: 'MIEN_SJC', range: '1D' })
      .expect(200);

    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.text).toContain('timestamp');
    expect(response.text).toContain('SJC');
  });

  it('GET /api/prices/history/export uses large take and returns all rows', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });

    const records = makeRecords(25, new Date('2026-05-01T00:00:00Z'));
    (mockPrismaService.priceRecord.findMany as jest.Mock).mockResolvedValue(records);

    const response = await request(app.getHttpServer())
      .get('/api/prices/history/export')
      .set('Authorization', 'Bearer valid-token')
      .query({ brand: 'SJC', goldType: 'MIEN_SJC', range: '1Y' })
      .expect(200);

    expect(mockPrismaService.priceRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10000 }),
    );
    const lines = response.text.trim().split('\n');
    expect(lines.length).toBe(26);
  });
});
