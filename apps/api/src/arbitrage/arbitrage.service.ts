import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GoldBrand, GoldType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ArbitrageOpportunityDto, ArbitrageHistoryDto } from '@gpls/shared';

export interface LatestBrandPrice {
  brand: GoldBrand;
  goldType: GoldType;
  buyPrice: bigint;
  sellPrice: bigint;
  recordedAt: Date;
}

@Injectable()
export class ArbitrageService {
  private readonly logger = new Logger(ArbitrageService.name);

  constructor(private readonly prisma: PrismaService) {}

  calculateOpportunities(prices: LatestBrandPrice[]): ArbitrageOpportunityDto[] {
    const byGoldType = new Map<string, LatestBrandPrice[]>();
    for (const p of prices) {
      if (!byGoldType.has(p.goldType)) byGoldType.set(p.goldType, []);
      byGoldType.get(p.goldType)!.push(p);
    }

    const opportunities: ArbitrageOpportunityDto[] = [];

    for (const [goldType, items] of byGoldType.entries()) {
      if (items.length < 2) continue;

      // Cheapest to BUY FROM = lowest sellPrice (what you pay to the store)
      let cheapestSell = items[0];
      // Best to SELL TO = highest buyPrice (what the store pays you)
      let bestBuy = items[0];

      for (const item of items) {
        if (Number(item.sellPrice) < Number(cheapestSell.sellPrice)) cheapestSell = item;
        if (Number(item.buyPrice) > Number(bestBuy.buyPrice)) bestBuy = item;
      }

      if (cheapestSell.brand === bestBuy.brand) continue;

      const grossProfit = Number(bestBuy.buyPrice) - Number(cheapestSell.sellPrice);
      if (grossProfit <= 0) continue;

      const profitPercent =
        Math.round((grossProfit / Number(cheapestSell.sellPrice)) * 10000) / 100;

      opportunities.push({
        goldType,
        buyFromBrand: cheapestSell.brand,
        buyFromPrice: Number(cheapestSell.sellPrice),
        sellToBrand: bestBuy.brand,
        sellToPrice: Number(bestBuy.buyPrice),
        grossProfit,
        profitPercent,
        updatedAt: new Date(
          Math.max(cheapestSell.recordedAt.getTime(), bestBuy.recordedAt.getTime()),
        ).toISOString(),
      });
    }

    return opportunities.sort((a, b) => b.profitPercent - a.profitPercent);
  }

  async getOpportunities(): Promise<ArbitrageOpportunityDto[]> {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000); // last hour
    const records = await this.prisma.priceRecord.findMany({
      where: { isAnomalous: false, recordedAt: { gte: cutoff } },
      orderBy: { recordedAt: 'desc' },
      select: { brand: true, goldType: true, buyPrice: true, sellPrice: true, recordedAt: true },
    });

    // Keep only latest per (brand, goldType)
    const seen = new Set<string>();
    const latest: LatestBrandPrice[] = [];
    for (const r of records) {
      const key = `${r.brand}:${r.goldType}`;
      if (!seen.has(key)) {
        seen.add(key);
        latest.push(r);
      }
    }

    return this.calculateOpportunities(latest);
  }

  @OnEvent('price.updated')
  async onPriceUpdated(_event: { brand: string; goldType: string }): Promise<void> {
    try {
      const opportunities = await this.getOpportunities();
      for (const opp of opportunities) {
        await this.prisma.arbitrageSnapshot.create({
          data: {
            goldType: opp.goldType as GoldType,
            buyBrand: opp.buyFromBrand as GoldBrand,
            sellBrand: opp.sellToBrand as GoldBrand,
            grossProfit: BigInt(Math.round(opp.grossProfit)),
            profitPercent: opp.profitPercent,
          },
        });
      }
    } catch (err) {
      this.logger.error(`onPriceUpdated: ${(err as Error).message}`);
    }
  }

  async getHistory(goldType: string, hours = 24): Promise<ArbitrageHistoryDto[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const snaps = await this.prisma.arbitrageSnapshot.findMany({
      where: { goldType: goldType as GoldType, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
    });
    return snaps.map(s => ({
      goldType: s.goldType,
      grossProfit: Number(s.grossProfit),
      profitPercent: Number(s.profitPercent),
      recordedAt: s.recordedAt.toISOString(),
    }));
  }
}
