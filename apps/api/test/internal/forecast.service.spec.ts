import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ForecastService } from '../../src/forecast/forecast.service';
import { PrismaService } from '../../src/database/prisma.service';
import { PriceService } from '../../src/price/price.service';
import { ForecastDirection } from '@prisma/client';

// ─── Mock factories ───────────────────────────────────────────────────────────

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-1',
    date: '2026-05-16',
    opensAt: new Date('2026-05-15T10:00:00Z'),
    closesAt: new Date('2026-05-16T00:00:00Z'),
    sessionClosed: false,
    scoredAt: null,
    actualResult: null,
    createdAt: new Date(),
    votes: [],
    ...overrides,
  };
}

function makeVote(overrides: Record<string, unknown> = {}) {
  return {
    id: 'vote-1',
    sessionId: 'session-1',
    userId: 'user-1',
    direction: ForecastDirection.up,
    votedAt: new Date(),
    isCorrect: null,
    ...overrides,
  };
}

function makeScore(overrides: Record<string, unknown> = {}) {
  return {
    id: 'score-1',
    userId: 'user-1',
    month: '2026-05',
    totalPoints: 0,
    correctCount: 0,
    streak: 0,
    updatedAt: new Date(),
    ...overrides,
  };
}

function nextBusinessDayString(from: Date): string {
  const next = new Date(from);
  next.setDate(next.getDate() + 1);
  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }
  return next.toISOString().slice(0, 10);
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('ForecastService', () => {
  let service: ForecastService;
  let prisma: {
    forecastSession: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    priceRecord: {
      findFirst: jest.Mock;
    };
    forecastVote: {
      upsert: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    userForecastScore: {
      findMany: jest.Mock;
      upsert: jest.Mock;
    };
  };
  let priceService: { getCurrentPrices: jest.Mock };

  beforeEach(async () => {
    prisma = {
      forecastSession: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      priceRecord: {
        findFirst: jest.fn(),
      },
      forecastVote: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      userForecastScore: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
    };

    priceService = {
      getCurrentPrices: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForecastService,
        { provide: PrismaService, useValue: prisma },
        { provide: PriceService, useValue: priceService },
      ],
    }).compile();

    service = module.get<ForecastService>(ForecastService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── Test 1: getActiveSession returns null when no open sessions ─────────────
  it('getActiveSession: returns null when no open sessions exist', async () => {
    prisma.forecastSession.findFirst.mockResolvedValue(null);

    const result = await service.getActiveSession();

    expect(result).toBeNull();
    expect(prisma.forecastSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionClosed: false },
      }),
    );
  });

  it('getActiveSession: shows ratios after user votes', async () => {
    const session = makeSession({
      votes: [
        makeVote({ userId: 'user-1', direction: ForecastDirection.up }),
        makeVote({ id: 'vote-2', userId: 'user-2', direction: ForecastDirection.down }),
      ],
    });
    prisma.forecastSession.findFirst.mockResolvedValue(session);

    const result = await service.getActiveSession('user-1');

    expect(result?.userVote).toBe(ForecastDirection.up);
    expect(result?.ratios?.up).toBeCloseTo(0.5, 5);
    expect(result?.ratios?.down).toBeCloseTo(0.5, 5);
    expect(result?.ratios?.flat).toBeCloseTo(0, 5);
  });

  it('getActiveSession: hides ratios before user votes', async () => {
    const session = makeSession({
      votes: [makeVote({ userId: 'user-2', direction: ForecastDirection.up })],
    });
    prisma.forecastSession.findFirst.mockResolvedValue(session);

    const result = await service.getActiveSession('user-1');

    expect(result?.userVote).toBeNull();
    expect(result?.ratios).toBeNull();
  });

  // ─── Test 2: vote throws BadRequestException when session is closed ───────────
  it('vote: throws BadRequestException when session is closed', async () => {
    const closedSession = makeSession({ sessionClosed: true, votes: [] });
    prisma.forecastSession.findUnique.mockResolvedValue(closedSession);

    await expect(
      service.vote('user-1', 'session-1', 'up'),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.forecastVote.upsert).not.toHaveBeenCalled();
  });

  it('vote: throws BadRequestException when session not found', async () => {
    prisma.forecastSession.findUnique.mockResolvedValue(null);

    await expect(
      service.vote('user-1', 'missing', 'up'),
    ).rejects.toThrow(BadRequestException);
  });

  it('vote: returns updated vote counts', async () => {
    prisma.forecastSession.findUnique
      .mockResolvedValueOnce(makeSession({ votes: [] }))
      .mockResolvedValueOnce(
        makeSession({
          votes: [
            makeVote({ direction: ForecastDirection.up }),
            makeVote({ id: 'vote-2', direction: ForecastDirection.down }),
          ],
        }),
      );

    const result = await service.vote('user-1', 'session-1', 'up');

    expect(result.session.voteCounts).toEqual({
      up: 1,
      down: 1,
      flat: 0,
      total: 2,
    });
  });

  // ─── Test 3: up vote + SJC price increased → isCorrect = true ────────────────
  it('scoreOneSession: up vote with SJC price increased → isCorrect = true', async () => {
    const vote = makeVote({ direction: ForecastDirection.up });
    const session = makeSession({ votes: [vote] });

    // scoreOneSession needs the date from prisma for month calculation
    prisma.forecastSession.findUnique.mockResolvedValue({ date: '2026-05-16' });
    prisma.forecastVote.update.mockResolvedValue({ ...vote, isCorrect: true });
    prisma.userForecastScore.upsert.mockResolvedValue(makeScore());
    prisma.forecastSession.update.mockResolvedValue({
      ...session,
      scoredAt: new Date(),
      actualResult: ForecastDirection.up,
    });

    await service.scoreOneSession(session, ForecastDirection.up);

    expect(prisma.forecastVote.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'vote-1' },
        data: { isCorrect: true },
      }),
    );
    expect(prisma.userForecastScore.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          totalPoints: { increment: 10 },
          correctCount: { increment: 1 },
        }),
      }),
    );
  });

  // ─── Test 4: down vote + SJC price increased → isCorrect = false ─────────────
  it('scoreOneSession: down vote with SJC price increased → isCorrect = false', async () => {
    const vote = makeVote({ direction: ForecastDirection.down });
    const session = makeSession({ votes: [vote] });

    prisma.forecastSession.findUnique.mockResolvedValue({ date: '2026-05-16' });
    prisma.forecastVote.update.mockResolvedValue({ ...vote, isCorrect: false });
    prisma.userForecastScore.upsert.mockResolvedValue(makeScore());
    prisma.forecastSession.update.mockResolvedValue({
      ...session,
      scoredAt: new Date(),
      actualResult: ForecastDirection.up,
    });

    await service.scoreOneSession(session, ForecastDirection.up);

    expect(prisma.forecastVote.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'vote-1' },
        data: { isCorrect: false },
      }),
    );
    // Streak should be reset (not increment points)
    expect(prisma.userForecastScore.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          streak: 0,
        }),
      }),
    );
    // totalPoints should NOT be incremented
    expect(prisma.userForecastScore.upsert).not.toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          totalPoints: { increment: 10 },
        }),
      }),
    );
  });

  // ─── Test 5: getLeaderboard returns results ordered by totalPoints desc ───────
  it('getLeaderboard: returns results ordered by totalPoints desc', async () => {
    const scores = [
      {
        ...makeScore({ userId: 'user-1', totalPoints: 100, correctCount: 10, streak: 5 }),
        user: { displayName: 'Alice', email: 'alice@example.com' },
      },
      {
        ...makeScore({ userId: 'user-2', totalPoints: 80, correctCount: 8, streak: 3 }),
        user: { displayName: null, email: 'bob@example.com' },
      },
      {
        ...makeScore({ userId: 'user-3', totalPoints: 60, correctCount: 6, streak: 1 }),
        user: { displayName: 'Charlie', email: 'charlie@example.com' },
      },
    ];

    prisma.userForecastScore.findMany.mockResolvedValue(scores);

    const result = await service.getLeaderboard('2026-05');

    expect(prisma.userForecastScore.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { month: '2026-05' },
        orderBy: { totalPoints: 'desc' },
        take: 20,
      }),
    );

    expect(result.entries).toHaveLength(3);
    expect(result.month).toBe('2026-05');
    expect(result.entries[0]).toEqual({ rank: 1, userId: 'user-1', displayName: 'Alice', totalPoints: 100, correctCount: 10, streak: 5 });
    expect(result.entries[1]).toEqual({ rank: 2, userId: 'user-2', displayName: null, totalPoints: 80, correctCount: 8, streak: 3 });
    expect(result.entries[2]).toEqual({ rank: 3, userId: 'user-3', displayName: 'Charlie', totalPoints: 60, correctCount: 6, streak: 1 });
  });

  it('getUserHistory: returns paginated votes', async () => {
    prisma.forecastVote.findMany.mockResolvedValue([
      {
        id: 'vote-1',
        direction: ForecastDirection.up,
        votedAt: new Date('2026-05-20T01:00:00Z'),
        isCorrect: true,
        session: { date: '2026-05-20', actualResult: ForecastDirection.up },
      },
    ]);
    prisma.forecastVote.count.mockResolvedValue(1);

    const result = await service.getUserHistory('user-1', 1);

    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: 'vote-1',
        direction: ForecastDirection.up,
        isCorrect: true,
        session: { date: '2026-05-20', actualResult: ForecastDirection.up },
      }),
    );
  });

  it('openNextSession: creates next business-day session when missing', async () => {
    const now = new Date('2026-05-22T12:00:00Z');
    jest.useFakeTimers().setSystemTime(now);

    prisma.forecastSession.findUnique.mockResolvedValue(null);
    prisma.forecastSession.create.mockResolvedValue({ id: 'session-2' });

    await service.openNextSession();

    const expectedDate = nextBusinessDayString(now);
    expect(prisma.forecastSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ date: expectedDate }),
    });

    jest.useRealTimers();
  });

  it('openNextSession: skips when session already exists', async () => {
    prisma.forecastSession.findUnique.mockResolvedValue({ id: 'existing' });

    await service.openNextSession();

    expect(prisma.forecastSession.create).not.toHaveBeenCalled();
  });

  it('closeCurrentSession: updates today session to closed', async () => {
    const now = new Date('2026-05-20T12:00:00Z');
    jest.useFakeTimers().setSystemTime(now);

    prisma.forecastSession.updateMany.mockResolvedValue({ count: 1 });

    await service.closeCurrentSession();

    expect(prisma.forecastSession.updateMany).toHaveBeenCalledWith({
      where: { date: now.toISOString().slice(0, 10), sessionClosed: false },
      data: { sessionClosed: true },
    });

    jest.useRealTimers();
  });

  it('scoreSessions: skips when no sessions to score', async () => {
    prisma.forecastSession.findMany.mockResolvedValue([]);

    await service.scoreSessions();

    expect(prisma.priceRecord.findFirst).not.toHaveBeenCalled();
  });

  it('scoreSessions: skips when price bracket missing', async () => {
    const session = makeSession({
      id: 'session-1',
      sessionClosed: true,
      scoredAt: null,
      votes: [],
    });
    prisma.forecastSession.findMany.mockResolvedValue([session]);
    prisma.priceRecord.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ buyPrice: 80_000_000n });

    const spy = jest.spyOn(service, 'scoreOneSession').mockResolvedValue();

    await service.scoreSessions();

    expect(spy).not.toHaveBeenCalled();
  });

  it('scoreSessions: calls scoreOneSession with actualResult up', async () => {
    const session = makeSession({
      id: 'session-1',
      sessionClosed: true,
      scoredAt: null,
      votes: [],
      opensAt: new Date('2026-05-20T00:00:00Z'),
      closesAt: new Date('2026-05-20T07:00:00Z'),
    });
    prisma.forecastSession.findMany.mockResolvedValue([session]);
    prisma.priceRecord.findFirst
      .mockResolvedValueOnce({ buyPrice: 80_000_000n })
      .mockResolvedValueOnce({ buyPrice: 81_000_000n });

    const spy = jest.spyOn(service, 'scoreOneSession').mockResolvedValue();

    await service.scoreSessions();

    expect(spy).toHaveBeenCalledWith(session, ForecastDirection.up);
  });

  it('scoreSessions: calls scoreOneSession with actualResult down', async () => {
    const session = makeSession({
      id: 'session-1',
      sessionClosed: true,
      scoredAt: null,
      votes: [],
      opensAt: new Date('2026-05-20T00:00:00Z'),
      closesAt: new Date('2026-05-20T07:00:00Z'),
    });
    prisma.forecastSession.findMany.mockResolvedValue([session]);
    prisma.priceRecord.findFirst
      .mockResolvedValueOnce({ buyPrice: 81_000_000n })
      .mockResolvedValueOnce({ buyPrice: 80_000_000n });

    const spy = jest.spyOn(service, 'scoreOneSession').mockResolvedValue();

    await service.scoreSessions();

    expect(spy).toHaveBeenCalledWith(session, ForecastDirection.down);
  });

  it('scoreSessions: calls scoreOneSession with actualResult flat', async () => {
    const session = makeSession({
      id: 'session-1',
      sessionClosed: true,
      scoredAt: null,
      votes: [],
      opensAt: new Date('2026-05-20T00:00:00Z'),
      closesAt: new Date('2026-05-20T07:00:00Z'),
    });
    prisma.forecastSession.findMany.mockResolvedValue([session]);
    prisma.priceRecord.findFirst
      .mockResolvedValueOnce({ buyPrice: 80_000_000n })
      .mockResolvedValueOnce({ buyPrice: 80_000_000n });

    const spy = jest.spyOn(service, 'scoreOneSession').mockResolvedValue();

    await service.scoreSessions();

    expect(spy).toHaveBeenCalledWith(session, ForecastDirection.flat);
  });
});
