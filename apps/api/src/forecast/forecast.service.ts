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

      for (const session of unscoredSessions) {
        // Compare SJC price at session open vs session close to derive actual direction
        const [openRecord, closeRecord] = await Promise.all([
          this.prisma.priceRecord.findFirst({
            where: { brand: 'SJC', goldType: 'MIEN_SJC', isAnomalous: false, recordedAt: { gte: session.opensAt } },
            orderBy: { recordedAt: 'asc' },
            select: { buyPrice: true },
          }),
          this.prisma.priceRecord.findFirst({
            where: { brand: 'SJC', goldType: 'MIEN_SJC', isAnomalous: false, recordedAt: { lte: session.closesAt } },
            orderBy: { recordedAt: 'desc' },
            select: { buyPrice: true },
          }),
        ]);

        let actualResult: ForecastDirection;
        if (!openRecord || !closeRecord) {
          this.logger.warn(`ForecastService: no price bracket for session ${session.id} (${session.date}), skipping`);
          continue;
        }
        const diff = Number(closeRecord.buyPrice) - Number(openRecord.buyPrice);
        actualResult = diff > 0 ? ForecastDirection.up : diff < 0 ? ForecastDirection.down : ForecastDirection.flat;

        await this.scoreOneSession(session, actualResult);
      }
    } catch (err) {
      this.logger.error(`ForecastService: scoreSessions failed: ${(err as Error).message}`);
    }
  }

  /** Score a single session — updates votes and UserForecastScore records */
  async scoreOneSession(
    session: { id: string; date: string; votes: { id: string; userId: string; direction: ForecastDirection }[] },
    actualResult: ForecastDirection,
  ): Promise<void> {
    const month = session.date.slice(0, 7);

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
