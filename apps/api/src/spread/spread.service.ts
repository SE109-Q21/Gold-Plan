import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { GoldBrand, GoldType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { SpreadRankingDto, SpreadHistoryPointDto } from '@gpls/shared';

const BRANDS: GoldBrand[] = [
  GoldBrand.SJC,
  GoldBrand.DOJI,
  GoldBrand.PNJ,
  GoldBrand.BAO_TIN,
];

@Injectable()
export class SpreadService {
  private readonly logger = new Logger(SpreadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getSpreadHistory(
    brand: GoldBrand,
    goldType: GoldType,
    days = 7,
  ): Promise<SpreadHistoryPointDto[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const records = await this.prisma.priceRecord.findMany({
      where: { brand, goldType, isAnomalous: false, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
      select: { buyPrice: true, sellPrice: true, recordedAt: true },
    });

    return records.map((r) => {
      const buy = Number(r.buyPrice);
      const sell = Number(r.sellPrice);
      return {
        recordedAt: r.recordedAt.toISOString(),
        spreadVnd: sell - buy,
        spreadPct: Math.round(((sell - buy) / buy) * 10000) / 100,
      };
    });
  }

  async getSpreadRanking(goldType: GoldType): Promise<SpreadRankingDto[]> {
    // Fetch the latest non-anomalous record per brand for this goldType
    const brandRecords = await Promise.all(
      BRANDS.map((brand) =>
        this.prisma.priceRecord.findFirst({
          where: { brand, goldType, isAnomalous: false },
          orderBy: { recordedAt: 'desc' },
        }),
      ),
    );

    const results: SpreadRankingDto[] = [];

    for (const latestRecord of brandRecords) {
      if (!latestRecord) continue;

      const buyPrice = Number(latestRecord.buyPrice);
      const sellPrice = Number(latestRecord.sellPrice);

      // NFR-F11.1: skip brands with null/zero prices
      if (!buyPrice || !sellPrice) continue;

      const spreadVnd = sellPrice - buyPrice;
      const spreadPct = Math.round((spreadVnd / buyPrice) * 100 * 100) / 100;

      results.push({
        brand: latestRecord.brand,
        goldType,
        buyPrice,
        sellPrice,
        spreadVnd,
        spreadPct,
        isMostEfficient: false,
      });
    }

    // Sort ascending by spreadVnd (smallest spread first)
    results.sort((a, b) => a.spreadVnd - b.spreadVnd);

    // Mark first entry as most efficient
    if (results.length > 0) {
      results[0].isMostEfficient = true;
    }

    return results;
  }

  @OnEvent('price.updated')
  async onPriceUpdated(event: { goldType: string }): Promise<void> {
    try {
      const ranking = await this.getSpreadRanking(event.goldType as GoldType);
      this.eventEmitter.emit('spread.updated', { goldType: event.goldType, ranking });
    } catch (err) {
      this.logger.error(`onPriceUpdated: ${(err as Error).message}`);
    }
  }
}
