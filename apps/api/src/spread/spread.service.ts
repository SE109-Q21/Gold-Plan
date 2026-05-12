import { Injectable } from '@nestjs/common';
import { GoldBrand, GoldType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { SpreadRankingDto } from '@gpls/shared';

const BRANDS: GoldBrand[] = [
  GoldBrand.SJC,
  GoldBrand.DOJI,
  GoldBrand.PNJ,
  GoldBrand.BAO_TIN,
];

@Injectable()
export class SpreadService {
  constructor(private readonly prisma: PrismaService) {}

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
}
