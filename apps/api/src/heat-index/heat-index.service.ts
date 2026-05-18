import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GoldBrand, GoldType, HeatIndexRecord } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface HeatIndexDto {
  value: number;
  category: string;
  priceVelocity: number;   // normalised 0-100
  spreadSize: number;      // VND
  thresholdCrossings: number;
  calculatedAt: string;    // ISO — matches shared HeatIndexDto
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
    // Component 1 — Price Velocity (40% weight)
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
    let avgChangePct = 0;
    if (recentRecords.length >= 2) {
      let totalChangePct = 0;
      let count = 0;
      for (let i = 0; i < recentRecords.length - 1; i++) {
        const pCurrent = Number(recentRecords[i].buyPrice);
        const pPrev = Number(recentRecords[i + 1].buyPrice);
        if (pPrev > 0) {
          totalChangePct += Math.abs((pCurrent - pPrev) / pPrev) * 100;
          count++;
        }
      }
      avgChangePct = count > 0 ? totalChangePct / count : 0;
      // Scale: 0.5% avg change = 40 pts (cap)
      velocityScore = Math.min((avgChangePct / 0.5) * 40, 40);
    }

    // Component 2 — Buy-sell spread size (30% weight)
    const latestRecord = recentRecords.length > 0 
      ? recentRecords[0] 
      : await this.prisma.priceRecord.findFirst({
          where: { brand: GoldBrand.SJC, goldType: GoldType.MIEN_SJC, isAnomalous: false },
          orderBy: { recordedAt: 'desc' },
        });

    let latestSpread = 0;
    let spreadScore = 0;
    if (latestRecord) {
      latestSpread = Number(latestRecord.sellPrice) - Number(latestRecord.buyPrice);
      // Scale: ≥500k VND spread = 30 pts (max), 200k VND spread = 0 pts
      spreadScore = Math.min(Math.max((latestSpread - 200_000) / 300_000, 0), 1) * 30;
    }

    // Component 3 — Threshold Crossings (30% weight)
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
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
      const p1 = Number(records24h[i].buyPrice);
      const p2 = Number(records24h[i + 1].buyPrice);
      if (Math.floor(p1 / 500_000) !== Math.floor(p2 / 500_000)) {
        crossings++;
      }
    }
    // Scale: 10 crossings = 30 pts
    const crossingScore = Math.min((crossings / 10) * 30, 30);

    const totalScore = Math.round(velocityScore + spreadScore + crossingScore);
    const label = totalScore <= 33 ? 'Cold' : totalScore <= 66 ? 'Warm' : 'Hot';

    // Normalise priceVelocity to 0–100 so the DTO matches the shared type spec
    const priceVelocityNorm = Math.min((avgChangePct / 0.5) * 100, 100);

    return {
      indexValue: totalScore,
      category: label,
      priceVelocity: priceVelocityNorm,
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
      value: r.indexValue,
      category: r.category,
      priceVelocity: Number(r.priceVelocity),
      spreadSize: Number(r.spreadSize),
      thresholdCrossings: r.thresholdCrossings,
      calculatedAt: r.calculatedAt.toISOString(),
    };
  }
}
