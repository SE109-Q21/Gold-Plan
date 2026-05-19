import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AdminStatsDto, AdminPeriodStatsDto, AdminStatsPeriod, DataSourceStatusDto } from '@gpls/shared';
import { CreateDataSourceDto, UpdateDataSourceDto } from './dto/admin.dto';
import { ForecastDirection } from '@prisma/client';

export { CreateDataSourceDto, UpdateDataSourceDto };

// ─── Internal types ───────────────────────────────────────────────────────────

export interface ListUsersFilter {
  status?: string;
  role?: string;
  search?: string;
}

// ─── AdminService ─────────────────────────────────────────────────────────────

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Stats ──────────────────────────────────────────────────────────────────

  async getStats(): Promise<AdminStatsDto> {
    const now = new Date();
    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [totalUsers, activeUsers, alertsSentToday, crawlSessions, dataSources] =
      await Promise.all([
        this.prisma.user.count({ where: { status: { not: 'deleted' as any } } }),
        this.prisma.user.count({ where: { status: 'active' as any } }),
        this.prisma.alertTriggerHistory.count({
          where: { triggeredAt: { gte: startOfToday } },
        }),
        this.prisma.crawlSession.findMany({
          where: { startedAt: { gte: since24h } },
          select: { status: true },
        }),
        this.prisma.dataSource.findMany({
          include: {
            crawlSessions: {
              orderBy: { startedAt: 'desc' },
              take: 1,
              select: { status: true },
            },
          },
        }),
      ]);

    const completedSessions = crawlSessions.filter((s) => s.status === 'completed').length;
    const crawlSuccessRate =
      crawlSessions.length > 0
        ? Math.round((completedSessions / crawlSessions.length) * 100 * 100) / 100
        : 0;

    const dataSourceStatuses: DataSourceStatusDto[] = dataSources.map((ds) => ({
      id: ds.id,
      name: ds.name,
      brand: ds.brand as any,
      url: ds.url,
      isActive: ds.isActive,
      lastCrawledAt: ds.lastCrawledAt ? ds.lastCrawledAt.toISOString() : null,
      lastStatus: ds.crawlSessions[0]?.status ?? null,
    }));

    return {
      totalUsers,
      activeUsers,
      alertsSentToday,
      crawlSuccessRate,
      dataSources: dataSourceStatuses,
    };
  }

  async getStatsByPeriod(period: AdminStatsPeriod): Promise<AdminPeriodStatsDto> {
    const now = new Date();
    let since: Date;
    if (period === 'day') {
      since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    } else if (period === 'week') {
      since = new Date(now);
      since.setDate(now.getDate() - 7);
    } else {
      since = new Date(now);
      since.setDate(now.getDate() - 30);
    }

    const [newUsers, alertsSent, crawlSessions] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { gte: since } } }),
      this.prisma.alertTriggerHistory.count({ where: { triggeredAt: { gte: since } } }),
      this.prisma.crawlSession.findMany({
        where: { startedAt: { gte: since } },
        select: { status: true },
      }),
    ]);

    const totalCrawls = crawlSessions.length;
    const successCrawls = crawlSessions.filter((s) => s.status === 'completed').length;

    return {
      period,
      since: since.toISOString(),
      newUsers,
      alertsSent,
      crawlSuccessRate: totalCrawls > 0 ? Math.round((successCrawls / totalCrawls) * 100) : 0,
      totalCrawls,
    };
  }

  // ── User management ────────────────────────────────────────────────────────

  async listUsers(
    page: number = 1,
    limit: number = 20,
    filter?: ListUsersFilter,
  ) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (filter?.status) where['status'] = filter.status;
    if (filter?.role) where['role'] = filter.role;
    if (filter?.search) where['email'] = { contains: filter.search, mode: 'insensitive' };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          displayName: true,
          status: true,
          role: true,
          createdAt: true,
          _count: { select: { priceAlerts: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        status: u.status,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
        alertCount: u._count.priceAlerts,
      })),
      total,
      page,
      limit,
    };
  }

  async lockUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    return this.prisma.user.update({
      where: { id },
      data: { status: 'locked' as any },
    });
  }

  async unlockUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    return this.prisma.user.update({
      where: { id },
      data: { status: 'active' as any },
    });
  }

  async changeUserRole(id: string, role: 'user' | 'admin') {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    return this.prisma.user.update({
      where: { id },
      data: { role: role as any },
      select: { id: true, email: true, role: true },
    });
  }

  // ── Time-series analytics ─────────────────────────────────────────────────

  async getTimeSeries(days: number) {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - days + 1);

    const [users, crawlSessions, alerts, votes] = await Promise.all([
      this.prisma.user.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.prisma.crawlSession.findMany({
        where: { startedAt: { gte: since } },
        select: { startedAt: true, status: true },
      }),
      this.prisma.alertTriggerHistory.findMany({
        where: { triggeredAt: { gte: since } },
        select: { triggeredAt: true },
      }),
      this.prisma.forecastVote.findMany({
        where: { votedAt: { gte: since } },
        select: { votedAt: true },
      }),
    ]);

    const series = [];
    for (let i = 0; i < days; i++) {
      const dayStart = new Date(since);
      dayStart.setUTCDate(since.getUTCDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayStart.getUTCDate() + 1);

      const dayCrawls = crawlSessions.filter(
        (c) => c.startedAt >= dayStart && c.startedAt < dayEnd,
      );

      series.push({
        date: dayStart.toISOString().slice(0, 10),
        newUsers: users.filter((u) => u.createdAt >= dayStart && u.createdAt < dayEnd).length,
        crawlsTotal: dayCrawls.length,
        crawlsSuccess: dayCrawls.filter((c) => c.status === 'completed').length,
        alertsFired: alerts.filter((a) => a.triggeredAt >= dayStart && a.triggeredAt < dayEnd).length,
        forecastVotes: votes.filter((v) => v.votedAt >= dayStart && v.votedAt < dayEnd).length,
      });
    }

    return { days, series };
  }

  // ── Data sources ───────────────────────────────────────────────────────────

  async listDataSources() {
    const sources = await this.prisma.dataSource.findMany({
      include: {
        crawlSessions: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          select: { status: true, startedAt: true, completedAt: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return sources.map((ds) => ({
      id: ds.id,
      name: ds.name,
      brand: ds.brand,
      url: ds.url,
      crawlType: ds.crawlType,
      frequencyMin: ds.frequencyMin,
      isActive: ds.isActive,
      lastCrawledAt: ds.lastCrawledAt ? ds.lastCrawledAt.toISOString() : null,
      lastStatus: ds.crawlSessions[0]?.status ?? null,
      createdAt: ds.createdAt.toISOString(),
    }));
  }

  async createDataSource(dto: CreateDataSourceDto) {
    return this.prisma.dataSource.create({
      data: {
        name: dto.name,
        brand: dto.brand as any,
        url: dto.url,
        crawlType: dto.crawlType,
        frequencyMin: dto.frequencyMin ?? 5,
      },
    });
  }

  async updateDataSource(id: string, dto: UpdateDataSourceDto) {
    const existing = await this.prisma.dataSource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`DataSource ${id} not found`);

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data['name'] = dto.name;
    if (dto.url !== undefined) data['url'] = dto.url;
    if (dto.crawlType !== undefined) data['crawlType'] = dto.crawlType;
    if (dto.frequencyMin !== undefined) data['frequencyMin'] = dto.frequencyMin;
    if (dto.isActive !== undefined) data['isActive'] = dto.isActive;

    return this.prisma.dataSource.update({ where: { id }, data });
  }

  async disableDataSource(id: string) {
    const existing = await this.prisma.dataSource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`DataSource ${id} not found`);

    return this.prisma.dataSource.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ── Anomaly management ─────────────────────────────────────────────────────

  async listAnomalies() {
    const records = await this.prisma.priceRecord.findMany({
      where: { isAnomalous: true },
      include: { anomalyReview: true },
      orderBy: { recordedAt: 'desc' },
    });

    return records.map((r) => ({
      id: r.id,
      brand: r.brand,
      goldType: r.goldType,
      buyPrice: r.buyPrice.toString(),
      sellPrice: r.sellPrice.toString(),
      recordedAt: r.recordedAt.toISOString(),
      isAnomalous: r.isAnomalous,
      anomalyReason: r.anomalyReason,
      anomalyReview: r.anomalyReview
        ? {
            action: r.anomalyReview.action,
            reviewedAt: r.anomalyReview.reviewedAt.toISOString(),
            reviewedBy: r.anomalyReview.reviewedBy,
          }
        : null,
    }));
  }

  async reviewAnomaly(
    priceRecordId: string,
    action: 'approved' | 'rejected',
    adminId: string,
  ) {
    const record = await this.prisma.priceRecord.findUnique({
      where: { id: priceRecordId },
    });
    if (!record) {
      throw new NotFoundException(`PriceRecord ${priceRecordId} not found`);
    }

    const now = new Date();

    // Upsert AnomalyReview
    await this.prisma.anomalyReview.upsert({
      where: { priceRecordId },
      create: {
        priceRecordId,
        reviewedBy: adminId,
        action,
        reviewedAt: now,
      },
      update: {
        reviewedBy: adminId,
        action,
        reviewedAt: now,
      },
    });

    // Update PriceRecord based on action
    const priceRecordUpdate: Record<string, unknown> =
      action === 'approved'
        ? { approvedAt: now, isAnomalous: false }
        : { rejectedAt: now };

    await this.prisma.priceRecord.update({
      where: { id: priceRecordId },
      data: priceRecordUpdate,
    });

    // Log to AdminAuditLog
    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action: `anomaly_${action}`,
        entityType: 'PriceRecord',
        entityId: priceRecordId,
        newValue: { action },
      },
    });

    return { priceRecordId, action, reviewedAt: now.toISOString() };
  }

  // ── Forecast management ──────────────────────────────────────────────────────

  async listForecastSessions(limit = 30) {
    const sessions = await this.prisma.forecastSession.findMany({
      orderBy: { opensAt: 'desc' },
      take: limit,
      include: { votes: { select: { direction: true } } },
    });
    return sessions.map(s => ({
      id: s.id,
      date: s.date,
      opensAt: s.opensAt.toISOString(),
      closesAt: s.closesAt.toISOString(),
      sessionClosed: s.sessionClosed,
      actualResult: s.actualResult,
      scoredAt: s.scoredAt ? s.scoredAt.toISOString() : null,
      voteCounts: {
        up:    s.votes.filter(v => v.direction === ForecastDirection.up).length,
        down:  s.votes.filter(v => v.direction === ForecastDirection.down).length,
        flat:  s.votes.filter(v => v.direction === ForecastDirection.flat).length,
        total: s.votes.length,
      },
    }));
  }

  async openForecastSession(date: string, closesAt: string) {
    const existing = await this.prisma.forecastSession.findUnique({ where: { date } });
    if (existing) throw new BadRequestException(`Session for ${date} already exists`);
    return this.prisma.forecastSession.create({
      data: { date, opensAt: new Date(), closesAt: new Date(closesAt) },
    });
  }

  async closeForecastSession(id: string) {
    const session = await this.prisma.forecastSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    return this.prisma.forecastSession.update({
      where: { id },
      data: { sessionClosed: true },
    });
  }

  async setForecastResult(id: string, actualResult: ForecastDirection, adminId: string) {
    const session = await this.prisma.forecastSession.findUnique({
      where: { id },
      include: { votes: true },
    });
    if (!session) throw new NotFoundException(`Session ${id} not found`);

    const month = session.date.slice(0, 7);
    for (const vote of session.votes) {
      const isCorrect = vote.direction === actualResult;
      await this.prisma.forecastVote.update({ where: { id: vote.id }, data: { isCorrect } });
      if (isCorrect) {
        await this.prisma.userForecastScore.upsert({
          where: { userId_month: { userId: vote.userId, month } },
          create: { userId: vote.userId, month, totalPoints: 10, correctCount: 1, streak: 1 },
          update: { totalPoints: { increment: 10 }, correctCount: { increment: 1 }, streak: { increment: 1 } },
        });
      } else {
        await this.prisma.userForecastScore.upsert({
          where: { userId_month: { userId: vote.userId, month } },
          create: { userId: vote.userId, month, totalPoints: 0, correctCount: 0, streak: 0 },
          update: { streak: 0 },
        });
      }
    }

    const now = new Date();
    await this.prisma.forecastSession.update({
      where: { id },
      data: { actualResult, scoredAt: now, sessionClosed: true },
    });

    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'forecast_result_set',
        entityType: 'ForecastSession',
        entityId: id,
        newValue: { actualResult },
      },
    });

    return { id, actualResult, scoredAt: now.toISOString() };
  }

  async getForecastSessionVotes(id: string) {
    const session = await this.prisma.forecastSession.findUnique({
      where: { id },
      include: {
        votes: {
          include: { user: { select: { email: true, displayName: true } } },
          orderBy: { votedAt: 'asc' },
        },
      },
    });
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    return {
      sessionId: id,
      date: session.date,
      actualResult: session.actualResult,
      votes: session.votes.map(v => ({
        id: v.id,
        direction: v.direction,
        votedAt: v.votedAt.toISOString(),
        isCorrect: v.isCorrect,
        email: v.user.email,
        displayName: v.user.displayName,
      })),
    };
  }

  async enableDataSource(id: string) {
    const existing = await this.prisma.dataSource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`DataSource ${id} not found`);
    return this.prisma.dataSource.update({ where: { id }, data: { isActive: true } });
  }

  // ── Audit log ──────────────────────────────────────────────────────────────

  async listAuditLog(page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adminAuditLog.count(),
    ]);
    return {
      data: items.map(log => ({
        id: log.id,
        adminId: log.adminId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        newValue: log.newValue,
        createdAt: log.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }
}
