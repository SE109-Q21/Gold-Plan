import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ForecastService } from './forecast.service';
import { PrismaService } from '../database/prisma.service';
import { PriceService } from '../price/price.service';
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
    forecastVote: {
      upsert: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    userForecastScore: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
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
      forecastVote: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      userForecastScore: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
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

  // ─── Test 2: vote throws BadRequestException when session is closed ───────────
  it('vote: throws BadRequestException when session is closed', async () => {
    const closedSession = makeSession({ sessionClosed: true, votes: [] });
    prisma.forecastSession.findUnique.mockResolvedValue(closedSession);

    await expect(
      service.vote('user-1', 'session-1', 'up'),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.forecastVote.upsert).not.toHaveBeenCalled();
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
});
