import { Injectable } from '@nestjs/common';
import { GoldBrand, GoldType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

// 4 brands × 4 gold types × 2 records (current + prev for changePercent) = 32 minimum; 200 is safe headroom
const CURRENT_PRICES_FETCH_LIMIT = 200;
const LIVE_MS = 5 * 60_000;
const RECENT_MS = 30 * 60_000;

const RANGE_MS: Record<string, number> = {
  '1D': 24 * 60 * 60_000,
  '1W': 7 * 24 * 60 * 60_000,
  '1M': 30 * 24 * 60 * 60_000,
  '3M': 90 * 24 * 60 * 60_000,
  '1Y': 365 * 24 * 60 * 60_000,
};

type HistoryRange = '1D' | '1W' | '1M' | '3M' | '1Y';

const RANGE_TAKE: Record<HistoryRange, number> = {
  '1D': 500,
  '1W': 500,
  '1M': 500,
  '3M': 5000,
  '1Y': 10000,
};

const RANGE_MAX_POINTS: Record<HistoryRange, number> = {
  '1D': 500,
  '1W': 500,
  '1M': 500,
  '3M': 500,
  '1Y': 365,
};

function getStatus(recordedAt: Date): 'live' | 'recent' | 'outdated' {
  const ageMs = Date.now() - recordedAt.getTime();
  if (ageMs < LIVE_MS) return 'live';
  if (ageMs < RECENT_MS) return 'recent';
  return 'outdated';
}

@Injectable()
export class PriceService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentPrices(brand?: GoldBrand) {
    const where: Record<string, unknown> = { isAnomalous: false };
    if (brand) where.brand = brand;

    const records = await this.prisma.priceRecord.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      take: CURRENT_PRICES_FETCH_LIMIT,
    });

    const groups = new Map<string, typeof records>();
    for (const r of records) {
      const key = `${r.brand}:${r.goldType}`;
      const group = groups.get(key) ?? [];
      if (group.length < 2) {
        group.push(r);
        groups.set(key, group);
      }
    }

    return Array.from(groups.values()).map(([current, prev]) => {
      const changePercent = prev
        ? ((Number(current.buyPrice) - Number(prev.buyPrice)) / Number(prev.buyPrice)) * 100
        : null;

      return {
        brand: current.brand as GoldBrand,
        goldType: current.goldType as GoldType,
        buyPrice: Number(current.buyPrice),
        sellPrice: Number(current.sellPrice),
        recordedAt: current.recordedAt.toISOString(),
        status: getStatus(current.recordedAt),
        changePercent: changePercent !== null ? Math.round(changePercent * 100) / 100 : null,
      };
    });
  }

  private thinRecords<T extends { recordedAt: Date }>(records: T[], maxPoints: number): T[] {
    if (records.length <= maxPoints) return records;
    const step = Math.ceil(records.length / maxPoints);
    return records.filter((_, i) => i % step === 0);
  }

  async getHistory(brand: GoldBrand, goldType: GoldType, range: HistoryRange) {
    const since = new Date(Date.now() - RANGE_MS[range]);
    const take = RANGE_TAKE[range];
    const maxPoints = RANGE_MAX_POINTS[range];

    const records = await this.prisma.priceRecord.findMany({
      where: { brand, goldType, isAnomalous: false, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
      take,
    });

    const thinned = this.thinRecords(records, maxPoints);

    return thinned.map((r) => ({
      recordedAt: r.recordedAt.toISOString(),
      buyPrice: Number(r.buyPrice),
      sellPrice: Number(r.sellPrice),
    }));
  }

  async exportCsv(brand: GoldBrand, goldType: GoldType, range: HistoryRange): Promise<string> {
    const since = new Date(Date.now() - RANGE_MS[range]);
    const records = await this.prisma.priceRecord.findMany({
      where: { brand, goldType, isAnomalous: false, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
      take: 10000,
    });

    const rows = records.map((r) => ({
      timestamp: r.recordedAt.toISOString(),
      buyPrice: Number(r.buyPrice),
      sellPrice: Number(r.sellPrice),
      brand: r.brand,
      goldType: r.goldType,
    }));

    const Papa = (await import('papaparse')).default;
    return Papa.unparse(rows);
  }

  async getComparison(goldType: GoldType) {
    const since = new Date(Date.now() - 24 * 60 * 60_000);
    // 100 records gives each of the 4 brands 25 slots buffer before any are crowded out
    const records = await this.prisma.priceRecord.findMany({
      where: { goldType, isAnomalous: false, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'desc' },
      take: 100,
    });

    const latestPerBrand = new Map<string, (typeof records)[number]>();
    for (const r of records) {
      if (!latestPerBrand.has(r.brand)) latestPerBrand.set(r.brand, r);
    }

    const rows = Array.from(latestPerBrand.values());
    if (rows.length === 0) return [{ goldType, brands: [] }];

    const maxBuy = rows.reduce((m, r) => (r.buyPrice > m ? r.buyPrice : m), rows[0].buyPrice);
    const minSell = rows.reduce((m, r) => (r.sellPrice < m ? r.sellPrice : m), rows[0].sellPrice);

    return [
      {
        goldType,
        brands: rows.map((r) => ({
          brand: r.brand as GoldBrand,
          buyPrice: Number(r.buyPrice),
          sellPrice: Number(r.sellPrice),
          isBestBuy: r.buyPrice === maxBuy,
          isBestSell: r.sellPrice === minSell,
          crawlSessionId: r.crawlSessionId,
        })),
      },
    ];
  }
}
