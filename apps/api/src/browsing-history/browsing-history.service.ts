import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GoldBrand, GoldType } from '@prisma/client';

export interface BrowsingContextDto {
  lastViewedAt: string;
  deltaPct: number | null;
}

export interface BrowsingHistoryItemDto {
  id: string;
  brand: string;
  goldType: string;
  buyPrice: number;
  viewedAt: string;
}

@Injectable()
export class BrowsingHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async recordView(userId: string, brand: string, goldType: string, buyPrice: number): Promise<void> {
    await this.prisma.viewHistory.create({
      data: {
        userId,
        brand: brand as GoldBrand,
        goldType: goldType as GoldType,
        buyPrice: BigInt(Math.round(buyPrice)),
      },
    });

    const count = await this.prisma.viewHistory.count({ where: { userId } });

    if (count > 500) {
      const excess = count - 500;
      const oldest = await this.prisma.viewHistory.findMany({
        where: { userId },
        orderBy: { viewedAt: 'asc' },
        take: excess,
        select: { id: true },
      });
      const ids = oldest.map((r) => r.id);
      await this.prisma.viewHistory.deleteMany({ where: { id: { in: ids } } });
    }
  }

  async getInlineContext(userId: string, brand: string, goldType: string): Promise<BrowsingContextDto | null> {
    const rows = await this.prisma.viewHistory.findMany({
      where: { userId, brand: brand as GoldBrand, goldType: goldType as GoldType },
      orderBy: { viewedAt: 'desc' },
      take: 2,
    });

    if (rows.length === 0) return null;

    const current = rows[0];
    const previous = rows[1] ?? null;

    let deltaPct: number | null = null;
    if (previous) {
      const cur = Number(current.buyPrice);
      const prev = Number(previous.buyPrice);
      deltaPct = Math.round(((cur - prev) / prev) * 100 * 100) / 100;
    }

    return {
      lastViewedAt: current.viewedAt.toISOString(),
      deltaPct,
    };
  }

  async getHistory(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: BrowsingHistoryItemDto[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.prisma.viewHistory.findMany({
        where: { userId },
        orderBy: { viewedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.viewHistory.count({ where: { userId } }),
    ]);

    const items: BrowsingHistoryItemDto[] = rows.map((r) => ({
      id: r.id,
      brand: r.brand,
      goldType: r.goldType,
      buyPrice: Number(r.buyPrice),
      viewedAt: r.viewedAt.toISOString(),
    }));

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getLowestSeen(userId: string, brand: string, goldType: string): Promise<number | null> {
    const result = await this.prisma.viewHistory.aggregate({
      where: { userId, brand: brand as GoldBrand, goldType: goldType as GoldType },
      _min: { buyPrice: true },
    });

    const min = result._min.buyPrice;
    return min !== null ? Number(min) : null;
  }

  async clearHistory(userId: string): Promise<void> {
    await this.prisma.viewHistory.deleteMany({ where: { userId } });
  }
}
