import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GoldBrand, GoldType, HeatIndexRecord } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface HeatIndexDto {
  score: number;
  label: 'Cold' | 'Warm' | 'Hot';
  velocityPct: number;
  spreadVnd: number;
  crossings: number;
  computedAt: string;
}

@Injectable()
export class HeatIndexService {
  constructor(private readonly prisma: PrismaService) {}

  @Cron('*/5 * * * *')
  async computeAndStore(): Promise<void> {
    const record = await this.compute();
    await this.prisma.heatIndexRecord.create({ data: record });
  }

  async compute(): Promise<{
    indexValue: number;
    category: string;
    priceVelocity: number;
    spreadSize: bigint;
    thresholdCrossings: number;
  }> {
    // Component 1 — Price Velocity (40 pts max)
    // Get last 10 SJC MIEN_SJC PriceRecords today, ordered by recordedAt desc
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const recentRecords = await this.prisma.priceRecord.findMany({
      where: {
        brand: GoldBrand.SJC,
        goldType: GoldType.MIEN_SJC,
        isAnomalous: false,
        recordedAt: { gte: todayStart },
      },
      orderBy: { recordedAt: 'desc' },
      take: 10,
    });

    let velocityScore = 0;
    if (recentRecords.length >= 2) {
      let totalChangePct = 0;
      let count = 0;
      for (let i = 0; i < recentRecords.length - 1; i++) {
        const price1 = Number(recentRecords[i].buyPrice);
        const price2 = Number(recentRecords[i + 1].buyPrice);
        if (price2 > 0) {
          totalChangePct += Math.abs((price1 - price2) / price2) * 100;
          count++;
        }
      }
      const averageChangePct = count > 0 ? totalChangePct / count : 0;
      velocityScore = Math.min(averageChangePct / 2.0, 1.0) * 40;
    }

    // Component 2 — Spread Size (30 pts max)
    // Get latest SJC MIEN_SJC record's (sellPrice - buyPrice)
    const latestRecord = recentRecords.length > 0
      ? recentRecords[0]
      : await this.prisma.priceRecord.findFirst({
          where: {
            brand: GoldBrand.SJC,
            goldType: GoldType.MIEN_SJC,
            isAnomalous: false,
          },
          orderBy: { recordedAt: 'desc' },
        });

    let latestSpread = 0;
    let spreadScore = 0;
    if (latestRecord) {
      latestSpread = Number(latestRecord.sellPrice) - Number(latestRecord.buyPrice);
      spreadScore = Math.min(Math.max((latestSpread - 200_000) / 300_000, 0), 1) * 30;
    }

    // Component 3 — Threshold Crossings (30 pts max)
    // Count how many times SJC price crossed a 500k boundary in last 24h
    const since24h = new Date(Date.now() - 24 * 60 * 60_000);
    const records24h = await this.prisma.priceRecord.findMany({
      where: {
        brand: GoldBrand.SJC,
        goldType: GoldType.MIEN_SJC,
        isAnomalous: false,
        recordedAt: { gte: since24h },
      },
      orderBy: { recordedAt: 'asc' },
    });

    let crossings = 0;
    for (let i = 0; i < records24h.length - 1; i++) {
      const price1 = Number(records24h[i].buyPrice);
      const price2 = Number(records24h[i + 1].buyPrice);
      if (Math.floor(price1 / 500_000) !== Math.floor(price2 / 500_000)) {
        crossings++;
      }
    }
    const crossingScore = Math.min(crossings / 10, 1) * 30;

    const totalScore = Math.round(velocityScore + spreadScore + crossingScore);
    const label = totalScore <= 33 ? 'Cold' : totalScore <= 66 ? 'Warm' : 'Hot';

    return {
      indexValue: totalScore,
      category: label,
      priceVelocity: (velocityScore / 40) * 100,
      spreadSize: BigInt(Math.round(latestSpread)),
      thresholdCrossings: crossings,
    };
  }

  async getHistory(days = 7): Promise<HeatIndexDto[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const records = await this.prisma.heatIndexRecord.findMany({
      where: { calculatedAt: { gte: since } },
      orderBy: { calculatedAt: 'asc' },
    });
    return records.map(r => this.toDto(r));
  }

  async getCurrent(): Promise<HeatIndexDto> {
    const latest = await this.prisma.heatIndexRecord.findFirst({
      orderBy: { calculatedAt: 'desc' },
    });

    const tenMinAgo = new Date(Date.now() - 10 * 60_000);
    if (latest && latest.calculatedAt > tenMinAgo) {
      return this.toDto(latest);
    }

    const data = await this.compute();
    const saved = await this.prisma.heatIndexRecord.create({ data });
    return this.toDto(saved);
  }

  private toDto(r: HeatIndexRecord): HeatIndexDto {
    return {
      score: r.indexValue,
      label: r.category as 'Cold' | 'Warm' | 'Hot',
      velocityPct: Number(r.priceVelocity),
      spreadVnd: Number(r.spreadSize),
      crossings: r.thresholdCrossings,
      computedAt: r.calculatedAt.toISOString(),
    };
  }
}
