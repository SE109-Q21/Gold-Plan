import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AdminStatsDto, AdminPeriodStatsDto, AdminStatsPeriod, DataSourceStatusDto } from '@gpls/shared';
import { CreateDataSourceDto, UpdateDataSourceDto } from './dto/admin.dto';

export { CreateDataSourceDto, UpdateDataSourceDto };

// ─── Internal types ───────────────────────────────────────────────────────────

export interface ListUsersFilter {
  status?: string;
  role?: string;
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
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
}
