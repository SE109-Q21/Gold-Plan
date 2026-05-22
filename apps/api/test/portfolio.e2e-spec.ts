import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import cookieParser = require('cookie-parser');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtService } from '../src/auth/jwt.service';
import { PortfolioService } from '../src/portfolio/portfolio.service';

const prismaMock = {
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
  onModuleInit: jest.fn().mockResolvedValue(undefined),
};

const jwtMock = {
  signAccess: jest.fn(),
  signRefresh: jest.fn(),
  verifyAccess: jest.fn(),
  verifyRefresh: jest.fn(),
};

const portfolioMock = {
  getPortfolio: jest.fn(),
  getValueChart: jest.fn(),
  getAllocationBreakdown: jest.fn(),
  listTransactions: jest.fn(),
  addTransaction: jest.fn(),
  editTransaction: jest.fn(),
  deleteTransaction: jest.fn(),
};

describe('Portfolio endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(JwtService)
      .useValue(jwtMock)
      .overrideProvider(PortfolioService)
      .useValue(portfolioMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/portfolio returns 401 without auth', async () => {
    await request(app.getHttpServer())
      .get('/api/portfolio')
      .expect(401);
  });

  it('GET /api/portfolio returns 401 for invalid token', async () => {
    jwtMock.verifyAccess.mockImplementation(() => {
      throw new Error('invalid');
    });

    await request(app.getHttpServer())
      .get('/api/portfolio')
      .set('Authorization', 'Bearer bad-token')
      .expect(401);
  });

  it('GET /api/portfolio returns summary with auth', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    portfolioMock.getPortfolio.mockResolvedValue({
      holdings: [],
      totalValueVnd: 0,
      totalCostVnd: 0,
      totalPnlVnd: 0,
      totalPnlPct: 0,
    });

    const res = await request(app.getHttpServer())
      .get('/api/portfolio')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(portfolioMock.getPortfolio).toHaveBeenCalledWith('user-1');
    expect(res.body).toEqual({
      holdings: [],
      totalValueVnd: 0,
      totalCostVnd: 0,
      totalPnlVnd: 0,
      totalPnlPct: 0,
    });
  });

  it('GET /api/portfolio/chart returns empty array when no data', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    portfolioMock.getValueChart.mockResolvedValue([]);

    const res = await request(app.getHttpServer())
      .get('/api/portfolio/chart')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(portfolioMock.getValueChart).toHaveBeenCalledWith('user-1');
    expect(res.body).toEqual([]);
  });

  it('GET /api/portfolio/allocation returns empty breakdown', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    portfolioMock.getAllocationBreakdown.mockResolvedValue({
      byBrand: [],
      byGoldType: [],
    });

    const res = await request(app.getHttpServer())
      .get('/api/portfolio/allocation')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(portfolioMock.getAllocationBreakdown).toHaveBeenCalledWith('user-1');
    expect(res.body).toEqual({ byBrand: [], byGoldType: [] });
  });

  it('GET /api/portfolio/transactions returns paged results', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    portfolioMock.listTransactions.mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      limit: 20,
      totalPages: 0,
    });

    const res = await request(app.getHttpServer())
      .get('/api/portfolio/transactions')
      .set('Authorization', 'Bearer valid-token')
      .query({ page: '2' })
      .expect(200);

    expect(portfolioMock.listTransactions).toHaveBeenCalledWith('user-1', 2);
    expect(res.body.page).toBe(2);
  });

  it('GET /api/portfolio/transactions defaults page to 1', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    portfolioMock.listTransactions.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });

    const res = await request(app.getHttpServer())
      .get('/api/portfolio/transactions')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(portfolioMock.listTransactions).toHaveBeenCalledWith('user-1', 1);
    expect(res.body.page).toBe(1);
  });

  it('POST /api/portfolio/transactions returns 400 for invalid quantity', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });

    await request(app.getHttpServer())
      .post('/api/portfolio/transactions')
      .set('Authorization', 'Bearer valid-token')
      .send({
        type: 'BUY',
        brand: 'SJC',
        goldType: 'MIEN_SJC',
        quantity: 0,
        pricePerTael: 80_000_000,
        transactedAt: '2026-05-01',
      })
      .expect(400);

    expect(portfolioMock.addTransaction).not.toHaveBeenCalled();
  });

  it('POST /api/portfolio/transactions returns 400 for invalid date', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });

    await request(app.getHttpServer())
      .post('/api/portfolio/transactions')
      .set('Authorization', 'Bearer valid-token')
      .send({
        type: 'BUY',
        brand: 'SJC',
        goldType: 'MIEN_SJC',
        quantity: 1,
        pricePerTael: 80_000_000,
        transactedAt: 'not-a-date',
      })
      .expect(400);

    expect(portfolioMock.addTransaction).not.toHaveBeenCalled();
  });

  it('POST /api/portfolio/transactions returns 400 for invalid goldType', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });

    await request(app.getHttpServer())
      .post('/api/portfolio/transactions')
      .set('Authorization', 'Bearer valid-token')
      .send({
        type: 'BUY',
        brand: 'SJC',
        goldType: 'BAD_TYPE',
        quantity: 1,
        pricePerTael: 80_000_000,
        transactedAt: '2026-05-01',
      })
      .expect(400);

    expect(portfolioMock.addTransaction).not.toHaveBeenCalled();
  });

  it('POST /api/portfolio/transactions creates transaction', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    portfolioMock.addTransaction.mockResolvedValue({
      id: 'tx-1',
      type: 'BUY',
      brand: 'SJC',
      goldType: 'MIEN_SJC',
      quantity: 1,
      pricePerTael: 80_000_000,
      transactedAt: '2026-05-01T00:00:00.000Z',
      note: null,
    });

    const res = await request(app.getHttpServer())
      .post('/api/portfolio/transactions')
      .set('Authorization', 'Bearer valid-token')
      .send({
        type: 'BUY',
        brand: 'SJC',
        goldType: 'MIEN_SJC',
        quantity: '1',
        pricePerTael: '80000000',
        transactedAt: '2026-05-01',
      })
      .expect(201);

    expect(portfolioMock.addTransaction).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        quantity: 1,
        pricePerTael: 80000000,
      }),
    );
    expect(res.body.id).toBe('tx-1');
  });

  it('PATCH /api/portfolio/transactions/:id returns 400 for invalid input', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });

    await request(app.getHttpServer())
      .patch('/api/portfolio/transactions/tx-1')
      .set('Authorization', 'Bearer valid-token')
      .send({ quantity: -1 })
      .expect(400);

    expect(portfolioMock.editTransaction).not.toHaveBeenCalled();
  });

  it('PATCH /api/portfolio/transactions/:id returns 400 for invalid date', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });

    await request(app.getHttpServer())
      .patch('/api/portfolio/transactions/tx-1')
      .set('Authorization', 'Bearer valid-token')
      .send({ transactedAt: 'bad-date' })
      .expect(400);

    expect(portfolioMock.editTransaction).not.toHaveBeenCalled();
  });

  it('DELETE /api/portfolio/transactions/:id returns 204', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    portfolioMock.deleteTransaction.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .delete('/api/portfolio/transactions/tx-1')
      .set('Authorization', 'Bearer valid-token')
      .expect(204);

    expect(portfolioMock.deleteTransaction).toHaveBeenCalledWith('user-1', 'tx-1');
  });
});
