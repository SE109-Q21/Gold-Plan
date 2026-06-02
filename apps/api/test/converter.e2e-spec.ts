import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ConverterService } from '../src/converter/converter.service';

const prismaMock = {
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
  onModuleInit: jest.fn().mockResolvedValue(undefined),
};

const converterMock = {
  calculate: jest.fn(),
};

describe('Converter endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(ConverterService)
      .useValue(converterMock)
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

  it('GET /api/converter/calculate returns 400 for invalid qty', async () => {
    await request(app.getHttpServer())
      .get('/api/converter/calculate')
      .query({
        unit: 'TAEL',
        qty: 0,
        purity: '24K',
        brand: 'SJC',
        goldType: 'MIEN_SJC',
      })
      .expect(400);

    expect(converterMock.calculate).not.toHaveBeenCalled();
  });

  it('GET /api/converter/calculate returns 400 for invalid unit', async () => {
    await request(app.getHttpServer())
      .get('/api/converter/calculate')
      .query({
        unit: 'POUND',
        qty: 1,
        purity: '24K',
        brand: 'SJC',
        goldType: 'MIEN_SJC',
      })
      .expect(400);

    expect(converterMock.calculate).not.toHaveBeenCalled();
  });

  it('GET /api/converter/calculate returns 400 for invalid brand', async () => {
    await request(app.getHttpServer())
      .get('/api/converter/calculate')
      .query({
        unit: 'TAEL',
        qty: 1,
        purity: '24K',
        brand: 'BAD',
        goldType: 'MIEN_SJC',
      })
      .expect(400);

    expect(converterMock.calculate).not.toHaveBeenCalled();
  });

  it('GET /api/converter/calculate returns 400 for invalid purity', async () => {
    await request(app.getHttpServer())
      .get('/api/converter/calculate')
      .query({
        unit: 'TAEL',
        qty: 1,
        purity: '12K',
        brand: 'SJC',
        goldType: 'MIEN_SJC',
      })
      .expect(400);

    expect(converterMock.calculate).not.toHaveBeenCalled();
  });

  it('GET /api/converter/calculate returns 400 for invalid goldType', async () => {
    await request(app.getHttpServer())
      .get('/api/converter/calculate')
      .query({
        unit: 'TAEL',
        qty: 1,
        purity: '24K',
        brand: 'SJC',
        goldType: 'BAD_TYPE',
      })
      .expect(400);

    expect(converterMock.calculate).not.toHaveBeenCalled();
  });

  it('GET /api/converter/calculate returns 400 for non-numeric qty', async () => {
    await request(app.getHttpServer())
      .get('/api/converter/calculate')
      .query({
        unit: 'TAEL',
        qty: 'abc',
        purity: '24K',
        brand: 'SJC',
        goldType: 'MIEN_SJC',
      })
      .expect(400);

    expect(converterMock.calculate).not.toHaveBeenCalled();
  });

  it('GET /api/converter/calculate returns conversion result', async () => {
    converterMock.calculate.mockResolvedValue({
      weightInGrams: 37.5,
      weightInTael: 1,
      valuations: { VND: 79000000, USD: 3100, EUR: 2800 },
      priceUsed: 79000000,
      priceUpdatedAt: '2026-05-20T00:00:00.000Z',
    });

    const res = await request(app.getHttpServer())
      .get('/api/converter/calculate')
      .query({
        unit: 'TAEL',
        qty: 1,
        purity: '24K',
        brand: 'SJC',
        goldType: 'MIEN_SJC',
      })
      .expect(200);

    expect(converterMock.calculate).toHaveBeenCalled();
    expect(res.body.priceUsed).toBe(79000000);
  });

  it('GET /api/converter/calculate transforms qty to number', async () => {
    converterMock.calculate.mockResolvedValue({
      weightInGrams: 56.25,
      weightInTael: 1.5,
      valuations: { VND: 118500000, USD: 4600, EUR: 4200 },
      priceUsed: 79000000,
      priceUpdatedAt: '2026-05-20T00:00:00.000Z',
    });

    await request(app.getHttpServer())
      .get('/api/converter/calculate')
      .query({
        unit: 'TAEL',
        qty: '1.5',
        purity: '24K',
        brand: 'SJC',
        goldType: 'MIEN_SJC',
      })
      .expect(200);

    expect(converterMock.calculate).toHaveBeenCalledWith(
      expect.objectContaining({ qty: 1.5 }),
    );
  });
});
