import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import cookieParser = require('cookie-parser');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtService } from '../src/auth/jwt.service';
import { ForecastService } from '../src/forecast/forecast.service';

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

const forecastMock = {
  getActiveSession: jest.fn(),
  vote: jest.fn(),
  getLeaderboard: jest.fn(),
  getUserHistory: jest.fn(),
};

describe('Forecast endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(JwtService)
      .useValue(jwtMock)
      .overrideProvider(ForecastService)
      .useValue(forecastMock)
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

  it('GET /api/forecast/session returns session without auth', async () => {
    forecastMock.getActiveSession.mockResolvedValue({
      id: 'session-1',
      date: '2026-05-20',
      opensAt: '2026-05-20T00:00:00.000Z',
      closesAt: '2026-05-20T07:00:00.000Z',
      sessionClosed: false,
      actualResult: null,
      userVote: null,
      ratios: null,
      totalVotes: 0,
    });

    const res = await request(app.getHttpServer())
      .get('/api/forecast/session')
      .expect(200);

    expect(forecastMock.getActiveSession).toHaveBeenCalledWith(undefined);
    expect(res.body.id).toBe('session-1');
  });

  it('GET /api/forecast/session returns null when no active session', async () => {
    forecastMock.getActiveSession.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .get('/api/forecast/session')
      .expect(200);

    expect(forecastMock.getActiveSession).toHaveBeenCalledWith(undefined);
    expect(res.body).toBeNull();
  });

  it('GET /api/forecast/session ignores invalid token', async () => {
    jwtMock.verifyAccess.mockImplementation(() => {
      throw new Error('invalid');
    });
    forecastMock.getActiveSession.mockResolvedValue({
      id: 'session-1',
      date: '2026-05-20',
      opensAt: '2026-05-20T00:00:00.000Z',
      closesAt: '2026-05-20T07:00:00.000Z',
      sessionClosed: false,
      actualResult: null,
      userVote: null,
      ratios: null,
      totalVotes: 0,
    });

    await request(app.getHttpServer())
      .get('/api/forecast/session')
      .set('Authorization', 'Bearer bad-token')
      .expect(200);

    expect(forecastMock.getActiveSession).toHaveBeenCalledWith(undefined);
  });

  it('GET /api/forecast/session passes userId with valid token', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    forecastMock.getActiveSession.mockResolvedValue({
      id: 'session-1',
      date: '2026-05-20',
      opensAt: '2026-05-20T00:00:00.000Z',
      closesAt: '2026-05-20T07:00:00.000Z',
      sessionClosed: false,
      actualResult: null,
      userVote: 'up',
      ratios: { up: 1, down: 0, flat: 0 },
      totalVotes: 1,
    });

    const res = await request(app.getHttpServer())
      .get('/api/forecast/session')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(forecastMock.getActiveSession).toHaveBeenCalledWith('user-1');
    expect(res.body.userVote).toBe('up');
  });

  it('POST /api/forecast/vote returns 401 without auth', async () => {
    await request(app.getHttpServer())
      .post('/api/forecast/vote')
      .send({ sessionId: 'session-1', direction: 'up' })
      .expect(401);
  });

  it('POST /api/forecast/vote returns 401 for invalid token', async () => {
    jwtMock.verifyAccess.mockImplementation(() => {
      throw new Error('invalid');
    });

    await request(app.getHttpServer())
      .post('/api/forecast/vote')
      .set('Authorization', 'Bearer bad-token')
      .send({ sessionId: 'session-1', direction: 'up' })
      .expect(401);

    expect(forecastMock.vote).not.toHaveBeenCalled();
  });

  it('POST /api/forecast/vote returns 400 for invalid direction', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });

    await request(app.getHttpServer())
      .post('/api/forecast/vote')
      .set('Authorization', 'Bearer valid-token')
      .send({ sessionId: 'session-1', direction: 'sideways' })
      .expect(400);

    expect(forecastMock.vote).not.toHaveBeenCalled();
  });

  it('POST /api/forecast/vote returns 400 when sessionId missing', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });

    await request(app.getHttpServer())
      .post('/api/forecast/vote')
      .set('Authorization', 'Bearer valid-token')
      .send({ direction: 'up' })
      .expect(400);

    expect(forecastMock.vote).not.toHaveBeenCalled();
  });

  it('POST /api/forecast/vote returns 400 when direction missing', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });

    await request(app.getHttpServer())
      .post('/api/forecast/vote')
      .set('Authorization', 'Bearer valid-token')
      .send({ sessionId: 'session-1' })
      .expect(400);

    expect(forecastMock.vote).not.toHaveBeenCalled();
  });

  it('POST /api/forecast/vote returns vote counts with auth', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    forecastMock.vote.mockResolvedValue({
      session: {
        id: 'session-1',
        date: '2026-05-20',
        voteCounts: { up: 1, down: 0, flat: 0, total: 1 },
      },
    });

    const res = await request(app.getHttpServer())
      .post('/api/forecast/vote')
      .set('Authorization', 'Bearer valid-token')
      .send({ sessionId: 'session-1', direction: 'up' })
      .expect(201);

    expect(forecastMock.vote).toHaveBeenCalledWith('user-1', 'session-1', 'up');
    expect(res.body.session.voteCounts.total).toBe(1);
  });

  it('GET /api/forecast/leaderboard returns leaderboard', async () => {
    forecastMock.getLeaderboard.mockResolvedValue({
      month: '2026-05',
      entries: [{ rank: 1, userId: 'user-1', displayName: 'Ada', totalPoints: 10, correctCount: 1, streak: 1 }],
    });

    const res = await request(app.getHttpServer())
      .get('/api/forecast/leaderboard')
      .expect(200);

    expect(res.body.month).toBe('2026-05');
  });

  it('GET /api/forecast/leaderboard passes month query', async () => {
    forecastMock.getLeaderboard.mockResolvedValue({
      month: '2026-04',
      entries: [],
    });

    const res = await request(app.getHttpServer())
      .get('/api/forecast/leaderboard')
      .query({ month: '2026-04' })
      .expect(200);

    expect(forecastMock.getLeaderboard).toHaveBeenCalledWith('2026-04');
    expect(res.body.month).toBe('2026-04');
  });

  it('GET /api/forecast/leaderboard defaults month when missing', async () => {
    const now = new Date('2026-05-20T00:00:00Z');
    jest.useFakeTimers().setSystemTime(now);
    forecastMock.getLeaderboard.mockResolvedValue({
      month: '2026-05',
      entries: [],
    });

    const res = await request(app.getHttpServer())
      .get('/api/forecast/leaderboard')
      .expect(200);

    expect(forecastMock.getLeaderboard).toHaveBeenCalledWith('2026-05');
    expect(res.body.month).toBe('2026-05');

    jest.useRealTimers();
  });

  it('GET /api/forecast/history returns 401 without auth', async () => {
    await request(app.getHttpServer())
      .get('/api/forecast/history')
      .expect(401);
  });

  it('GET /api/forecast/history returns history with auth', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    forecastMock.getUserHistory.mockResolvedValue({
      items: [
        {
          id: 'vote-1',
          direction: 'up',
          votedAt: '2026-05-20T01:00:00.000Z',
          isCorrect: true,
          session: { date: '2026-05-20', actualResult: 'up' },
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    });

    const res = await request(app.getHttpServer())
      .get('/api/forecast/history')
      .set('Authorization', 'Bearer valid-token')
      .query({ page: '1' })
      .expect(200);

    expect(forecastMock.getUserHistory).toHaveBeenCalledWith('user-1', 1);
    expect(res.body.total).toBe(1);
  });

  it('GET /api/forecast/history passes page query', async () => {
    jwtMock.verifyAccess.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    forecastMock.getUserHistory.mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      totalPages: 0,
    });

    const res = await request(app.getHttpServer())
      .get('/api/forecast/history')
      .set('Authorization', 'Bearer valid-token')
      .query({ page: '2' })
      .expect(200);

    expect(forecastMock.getUserHistory).toHaveBeenCalledWith('user-1', 2);
    expect(res.body.page).toBe(2);
  });
});
