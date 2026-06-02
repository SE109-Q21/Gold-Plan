import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ExchangeRateService } from '../src/exchange-rate/exchange-rate.service';

const prismaMock = {
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
  onModuleInit: jest.fn().mockResolvedValue(undefined),
};

const exchangeRateMock = {
  getRates: jest.fn(),
};

describe('Exchange rate endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(ExchangeRateService)
      .useValue(exchangeRateMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/exchange-rate/rates returns rates', async () => {
    exchangeRateMock.getRates.mockResolvedValue({
      usdVnd: 25480,
      eurVnd: 27900,
      updatedAt: '2026-05-20T00:00:00.000Z',
      source: 'fallback',
    });

    const res = await request(app.getHttpServer())
      .get('/api/exchange-rate/rates')
      .expect(200);

    expect(res.body.usdVnd).toBe(25480);
    expect(res.body.source).toBe('fallback');
  });

  it('GET /api/exchange-rate/rates returns 500 when service throws', async () => {
    exchangeRateMock.getRates.mockRejectedValue(new Error('boom'));

    await request(app.getHttpServer())
      .get('/api/exchange-rate/rates')
      .expect(500);
  });
});
