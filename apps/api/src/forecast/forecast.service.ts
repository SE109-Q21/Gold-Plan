import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { PriceService } from '../price/price.service';
import { ForecastDirection } from '@prisma/client';

const PAGE_SIZE = 20;

@Injectable()
export class ForecastService {
  private readonly logger = new Logger(ForecastService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly priceService: PriceService,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private toDateString(d: Date): string {
    return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
  }

  private nextBusinessDay(from: Date): Date {
    const next = new Date(from);
    next.setDate(next.getDate() + 1);
    // Skip Saturday (6) and Sunday (0)
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  private todayString(): string {
    return this.toDateString(new Date());
  }

  // ─── Crons ───────────────────────────────────────────────────────────────────

  /** 17:00 ICT weekdays (ICT = UTC+7, so 10:00 UTC) — open next session */
  @Cron('0 17 * * 1-5', { timeZone: 'Asia/Bangkok' })
  async openNextSession(): Promise<void> {
    try {
      const nextDay = this.nextBusinessDay(new Date());
      const dateStr = this.toDateString(nextDay);

      const existing = await this.prisma.forecastSession.findUnique({
        where: { date: dateStr },
      });
      if (existing) {
        this.logger.log(`ForecastService: session for ${dateStr} already exists, skipping`);
        return;
      }

      // closesAt = next business day at 07:00 ICT = 00:00 UTC
      const closesAt = new Date(nextDay);
      closesAt.setUTCHours(0, 0, 0, 0);

      await this.prisma.forecastSession.create({
        data: {
          date: dateStr,
          opensAt: new Date(),
          closesAt,
        },
      });

      this.logger.log(`ForecastService: opened session for ${dateStr}`);
    } catch (err) {
      this.logger.error(`ForecastService: openNextSession failed: ${(err as Error).message}`);
    }
  }

  /** 00:00 UTC = 07:00 ICT — close current session */
  @Cron('0 0 * * 1-5')
  async closeCurrentSession(): Promise<void> {
    try {
      const dateStr = this.todayString();

      await this.prisma.forecastSession.updateMany({
        where: { date: dateStr, sessionClosed: false },
        data: { sessionClosed: true },
      });

      this.logger.log(`ForecastService: closed session for ${dateStr}`);
    } catch (err) {
      this.logger.error(`ForecastService: closeCurrentSession failed: ${(err as Error).message}`);
    }
  }

  /** 02:00 UTC = 09:00 ICT — score closed sessions */
  @Cron('0 2 * * 1-5')
  async scoreSessions(): Promise<void> {
    try {
      const unscoredSessions = await this.prisma.forecastSession.findMany({
        where: { sessionClosed: true, scoredAt: null },
        include: { votes: true },
      });

      if (unscoredSessions.length === 0) {
        this.logger.log('ForecastService: no sessions to score');
        return;
      }

      // Get SJC current prices to compare
      const allPrices = await this.priceService.getCurrentPrices();
      const sjcPrices = allPrices.filter((p) => p.brand === 'SJC');

      // Determine actual direction based on SJC MIEN_SJC or first SJC price
      const sjcPrice =
        sjcPrices.find((p) => p.goldType === 'MIEN_SJC') ?? sjcPrices[0];

      if (!sjcPrice) {
        this.logger.warn('ForecastService: no SJC price available for scoring');
        return;
      }

      // Derive direction from changePercent
      let actualResult: ForecastDirection;
      if (sjcPrice.changePercent === null) {
        actualResult = ForecastDirection.flat;
      } else if (sjcPrice.changePercent > 0) {
        actualResult = ForecastDirection.up;
      } else if (sjcPrice.changePercent < 0) {
        actualResult = ForecastDirection.down;
      } else {
        actualResult = ForecastDirection.flat;
      }

      for (const session of unscoredSessions) {
        await this.scoreOneSession(session, actualResult);
      }
    } catch (err) {
      this.logger.error(`ForecastService: scoreSessions failed: ${(err as Error).message}`);
    }
  }

  /** Score a single session — updates votes and UserForecastScore records */
  async scoreOneSession(
    session: { id: string; votes: { id: string; userId: string; direction: ForecastDirection }[] },
    actualResult: ForecastDirection,
  ): Promise<void> {
    const month = session.id
      ? (await this.prisma.forecastSession.findUnique({ where: { id: session.id }, select: { date: true } }))
          ?.date?.slice(0, 7) ?? new Date().toISOString().slice(0, 7)
      : new Date().toISOString().slice(0, 7);

    for (const vote of session.votes) {
      const isCorrect = vote.direction === actualResult;

      await this.prisma.forecastVote.update({
        where: { id: vote.id },
        data: { isCorrect },
      });

      if (isCorrect) {
        await this.prisma.userForecastScore.upsert({
          where: { userId_month: { userId: vote.userId, month } },
          create: {
            userId: vote.userId,
            month,
            totalPoints: 10,
            correctCount: 1,
            streak: 1,
          },
          update: {
            totalPoints: { increment: 10 },
            correctCount: { increment: 1 },
            streak: { increment: 1 },
          },
        });
      } else {
        // Reset streak on incorrect
        await this.prisma.userForecastScore.upsert({
          where: { userId_month: { userId: vote.userId, month } },
          create: {
            userId: vote.userId,
            month,
            totalPoints: 0,
            correctCount: 0,
            streak: 0,
          },
          update: {
            streak: 0,
          },
        });
      }
    }

    await this.prisma.forecastSession.update({
      where: { id: session.id },
      data: { scoredAt: new Date(), actualResult },
    });

    this.logger.log(`ForecastService: scored session ${session.id} → ${actualResult}`);
  }

  // ─── API Methods ─────────────────────────────────────────────────────────────

  async vote(
    userId: string,
    sessionId: string,
    direction: string,
  ): Promise<{
    session: {
      id: string;
      date: string;
      voteCounts: { up: number; down: number; flat: number; total: number };
    };
  }> {
    const session = await this.prisma.forecastSession.findUnique({
      where: { id: sessionId },
      include: { votes: true },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    if (session.sessionClosed) {
      throw new BadRequestException('This forecast session is already closed');
    }

    await this.prisma.forecastVote.upsert({
      where: { sessionId_userId: { sessionId, userId } },
      create: {
        sessionId,
        userId,
        direction: direction as ForecastDirection,
      },
      update: {
        direction: direction as ForecastDirection,
        votedAt: new Date(),
      },
    });

    // Re-fetch updated session
    const updated = await this.prisma.forecastSession.findUnique({
      where: { id: sessionId },
      include: { votes: true },
    });

    const votes = updated!.votes;
    const voteCounts = {
      up: votes.filter((v) => v.direction === ForecastDirection.up).length,
      down: votes.filter((v) => v.direction === ForecastDirection.down).length,
      flat: votes.filter((v) => v.direction === ForecastDirection.flat).length,
      total: votes.length,
    };

    return {
      session: {
        id: updated!.id,
        date: updated!.date,
        voteCounts,
      },
    };
  }

  async getActiveSession(userId?: string): Promise<{
    id: string;
    date: string;
    opensAt: Date;
    closesAt: Date;
    sessionClosed: boolean;
    actualResult: ForecastDirection | null;
    userVote: string | null;
    ratios: { up: number; down: number; flat: number } | null;
    totalVotes: number;
  } | null> {
    const session = await this.prisma.forecastSession.findFirst({
      where: { sessionClosed: false },
      orderBy: { opensAt: 'desc' },
      include: { votes: true },
    });

    if (!session) return null;

    const userVote = userId
      ? (session.votes.find((v) => v.userId === userId)?.direction ?? null)
      : null;

    const showRatios = userVote !== null || session.sessionClosed;
    const total = session.votes.length;

    const ratios = showRatios && total > 0
      ? {
          up:   session.votes.filter((v) => v.direction === ForecastDirection.up).length   / total,
          down: session.votes.filter((v) => v.direction === ForecastDirection.down).length / total,
          flat: session.votes.filter((v) => v.direction === ForecastDirection.flat).length / total,
        }
      : null;

    return {
      id: session.id,
      date: session.date,
      opensAt: session.opensAt,
      closesAt: session.closesAt,
      sessionClosed: session.sessionClosed,
      actualResult: session.actualResult,
      userVote: userVote as string | null,
      ratios,
      totalVotes: total,
    };
  }

  async getLeaderboard(month: string): Promise<{
    month: string;
    entries: {
      rank: number;
      userId: string;
      displayName: string | null;
      totalPoints: number;
      correctCount: number;
      streak: number;
    }[];
  }> {
    const scores = await this.prisma.userForecastScore.findMany({
      where: { month },
      orderBy: { totalPoints: 'desc' },
      take: 20,
      include: {
        user: {
          select: { displayName: true, email: true },
        },
      },
    });

    return {
      month,
      entries: scores.map((s, index) => ({
        rank: index + 1,
        userId: s.userId,
        displayName: s.user.displayName ?? null,
        totalPoints: s.totalPoints,
        correctCount: s.correctCount,
        streak: s.streak,
      })),
    };
  }

  async getUserHistory(
    userId: string,
    page = 1,
  ): Promise<{
    items: {
      id: string;
      direction: string;
      votedAt: Date;
      isCorrect: boolean | null;
      session: { date: string; actualResult: ForecastDirection | null };
    }[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * PAGE_SIZE;

    const [items, total] = await Promise.all([
      this.prisma.forecastVote.findMany({
        where: { userId },
        orderBy: { votedAt: 'desc' },
        skip,
        take: PAGE_SIZE,
        include: {
          session: {
            select: { date: true, actualResult: true },
          },
        },
      }),
      this.prisma.forecastVote.count({ where: { userId } }),
    ]);

    return {
      items: items.map((v) => ({
        id: v.id,
        direction: v.direction,
        votedAt: v.votedAt,
        isCorrect: v.isCorrect,
        session: {
          date: v.session.date,
          actualResult: v.session.actualResult,
        },
      })),
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  }
}
