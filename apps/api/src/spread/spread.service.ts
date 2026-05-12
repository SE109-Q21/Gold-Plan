import { Injectable } from '@nestjs/common';
import { GoldType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { SpreadRankingDto } from '@gpls/shared';

const BRANDS = ['SJC', 'DOJI', 'PNJ', 'BAO_TIN'] as const;

@Injectable()
export class SpreadService {
  constructor(private readonly prisma: PrismaService) {}

  async getSpreadRanking(goldType: GoldType): Promise<SpreadRankingDto[]> {
    // Fetch recent non-anomalous records across all brands for this goldType
    const records = await this.prisma.priceRecord.findMany({
      where: { goldType, isAnomalous: false },
      orderBy: { recordedAt: 'desc' },
      take: 50,
    });

    const results: SpreadRankingDto[] = [];

    for (const brand of BRANDS) {
      const latestRecord = records.find((r) => r.brand === brand);

      if (!latestRecord) continue;

      const buyPrice = Number(latestRecord.buyPrice);
      const sellPrice = Number(latestRecord.sellPrice);

      // NFR-F11.1: skip brands with null/zero prices
      if (!buyPrice || !sellPrice) continue;

      const spreadVnd = sellPrice - buyPrice;
      const spreadPct = Math.round((spreadVnd / buyPrice) * 100 * 100) / 100;

      results.push({
        brand,
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
}
