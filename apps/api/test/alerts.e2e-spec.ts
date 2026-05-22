import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import cookieParser = require('cookie-parser');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtService } from '../src/auth/jwt.service';
import { AlertsService } from '../src/alerts/alerts.service';

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

const alertsMock = {
  findAllForUser: jest.fn(),
  createAlert: jest.fn(),
  updateAlert: jest.fn(),
  toggleAlert: jest.fn(),
  deleteAlert: jest.fn(),
  getHistory: jest.fn(),
};

describe('Alerts endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(JwtService)
      .useValue(jwtMock)
      .overrideProvider(AlertsService)
      .useValue(alertsMock)
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

  it('GET /api/alerts returns 401 without auth', async () => {
    await request(app.getHttpServer())
      .get('/api/alerts')
      .expect(401);
  });

  it('GET /api/alerts returns list with auth', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    alertsMock.findAllForUser.mockResolvedValue([
      {
        id: 'alert-1',
        userId: 'user-1',
        brand: 'SJC',
        goldType: 'MIEN_SJC',
        condition: 'lte',
        thresholdPrice: 80000000,
        status: 'active',
        repeatMode: false,
      },
    ]);

    const res = await request(app.getHttpServer())
      .get('/api/alerts')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(alertsMock.findAllForUser).toHaveBeenCalledWith('user-1');
    expect(res.body).toHaveLength(1);
  });

  it('POST /api/alerts returns 400 for invalid payload', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });

    await request(app.getHttpServer())
      .post('/api/alerts')
      .set('Authorization', 'Bearer valid-token')
      .send({
        brand: 'BAD',
        goldType: 'MIEN_SJC',
        condition: 'lte',
        thresholdPrice: '80000000',
      })
      .expect(400);

    expect(alertsMock.createAlert).not.toHaveBeenCalled();
  });

  it('POST /api/alerts creates alert', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    alertsMock.createAlert.mockResolvedValue({
      id: 'alert-1',
      userId: 'user-1',
      brand: 'SJC',
      goldType: 'MIEN_SJC',
      condition: 'lte',
      thresholdPrice: 80000000,
      status: 'active',
      repeatMode: false,
    });

    const res = await request(app.getHttpServer())
      .post('/api/alerts')
      .set('Authorization', 'Bearer valid-token')
      .send({
        brand: 'SJC',
        goldType: 'MIEN_SJC',
        condition: 'lte',
        thresholdPrice: '80000000',
        repeatMode: false,
      })
      .expect(201);

    expect(alertsMock.createAlert).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ brand: 'SJC' }),
    );
    expect(res.body.id).toBe('alert-1');
  });

  it('PATCH /api/alerts/:id returns 400 for invalid payload', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });

    await request(app.getHttpServer())
      .patch('/api/alerts/alert-1')
      .set('Authorization', 'Bearer valid-token')
      .send({ condition: 'invalid' })
      .expect(400);

    expect(alertsMock.updateAlert).not.toHaveBeenCalled();
  });

  it('PATCH /api/alerts/:id/toggle returns updated alert', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    alertsMock.toggleAlert.mockResolvedValue({
      id: 'alert-1',
      status: 'inactive',
    });

    const res = await request(app.getHttpServer())
      .patch('/api/alerts/alert-1/toggle')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(alertsMock.toggleAlert).toHaveBeenCalledWith('user-1', 'alert-1');
    expect(res.body.status).toBe('inactive');
  });

  it('DELETE /api/alerts/:id returns 204', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    alertsMock.deleteAlert.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .delete('/api/alerts/alert-1')
      .set('Authorization', 'Bearer valid-token')
      .expect(204);

    expect(alertsMock.deleteAlert).toHaveBeenCalledWith('user-1', 'alert-1');
  });

  it('GET /api/alerts/history returns history', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    alertsMock.getHistory.mockResolvedValue([
      { id: 'history-1', triggeredAt: '2026-05-20T00:00:00.000Z' },
    ]);

    const res = await request(app.getHttpServer())
      .get('/api/alerts/history')
      .set('Authorization', 'Bearer valid-token')
      .query({ page: '1' })
      .expect(200);

    expect(alertsMock.getHistory).toHaveBeenCalledWith('user-1', 1);
    expect(res.body).toHaveLength(1);
  });
});
