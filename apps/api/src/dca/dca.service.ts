import { Injectable, BadRequestException } from '@nestjs/common';
import { GoldBrand, GoldType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface DcaParams {
  brand: GoldBrand;
  goldType: GoldType;
  startDate: string;
  frequency: 'weekly' | 'monthly';
  qtyPerPurchase: number;
}

export interface DcaDataPointDto {
  date: string;
  price: number;
  cumulativeGold: number;
  cumulativeSpent: number;
  cumulativeValue: number;
  lumpSumValue: number;
}

export interface DcaResultDto {
  averageCostVnd: number;
  totalGoldTael: number;
  totalSpentVnd: number;
  currentValueVnd: number;
  dcaPnlVnd: number;
  dcaPnlPct: number;
  lumpSumCostVnd: number;
  lumpSumCurrentValueVnd: number;
  lumpSumPnlPct: number;
  dataPoints: DcaDataPointDto[];
}

@Injectable()
export class DcaService {
  constructor(private readonly prisma: PrismaService) {}

  async simulate(params: DcaParams): Promise<DcaResultDto> {
    const { brand, goldType, startDate, frequency, qtyPerPurchase } = params;

    const start = new Date(startDate);
    const now = new Date();

    // 1. Query all non-anomalous records in range, ordered by recordedAt ASC
    const records = await this.prisma.priceRecord.findMany({
      where: {
        brand,
        goldType,
        isAnomalous: false,
        recordedAt: { gte: start, lte: now },
      },
      orderBy: { recordedAt: 'asc' },
    });

    // 2. Thin to one record per day (take first record per calendar day)
    const dailyMap = new Map<string, { date: string; price: number }>();
    for (const record of records) {
      const dayKey = record.recordedAt.toISOString().slice(0, 10);
      if (!dailyMap.has(dayKey)) {
        dailyMap.set(dayKey, {
          date: dayKey,
          price: Number(record.buyPrice),
        });
      }
    }

    const dailyRecords = Array.from(dailyMap.values());

    // 3. Select purchase points based on frequency
    const intervalDays = frequency === 'weekly' ? 7 : 30;
    const purchasePoints: Array<{ date: string; price: number }> = [];

    let targetDate = new Date(start);
    while (targetDate <= now) {
      const targetMs = targetDate.getTime();

      // Pick the closest daily record to this target date
      let closest: { date: string; price: number } | null = null;
      let closestDiff = Infinity;

      for (const record of dailyRecords) {
        const recordMs = new Date(record.date).getTime();
        const diff = Math.abs(recordMs - targetMs);
        if (diff < closestDiff) {
          closestDiff = diff;
          closest = record;
        }
      }

      if (closest !== null) {
        // Avoid duplicate dates
        const alreadyAdded = purchasePoints.some((p) => p.date === closest!.date);
        if (!alreadyAdded) {
          purchasePoints.push(closest);
        }
      }

      targetDate = new Date(targetDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    }

    // 4. Validate: require >= 2 purchase points
    if (purchasePoints.length < 2) {
      throw new BadRequestException(
        'Not enough data: at least 2 purchase points required for DCA simulation.',
      );
    }

    // 5 & 6. Calculate per-purchase and aggregate
    const latestPrice = dailyRecords[dailyRecords.length - 1].price;
    const firstPurchasePrice = purchasePoints[0].price;

    let totalSpentVnd = 0;
    let cumulativeGold = 0;
    let cumulativeSpent = 0;

    const dataPoints: DcaDataPointDto[] = [];

    for (const point of purchasePoints) {
      const spent = qtyPerPurchase * point.price;
      totalSpentVnd += spent;
      cumulativeGold += qtyPerPurchase;
      cumulativeSpent += spent;
      const cumulativeValue = cumulativeGold * latestPrice;

      dataPoints.push({
        date: point.date,
        price: point.price,
        cumulativeGold,
        cumulativeSpent,
        cumulativeValue,
        lumpSumValue: 0, // will fill in after lumpSumGoldTael is known
      });
    }

    const totalGoldTael = purchasePoints.length * qtyPerPurchase;
    const averageCostVnd = totalSpentVnd / totalGoldTael;
    const currentValueVnd = totalGoldTael * latestPrice;
    const dcaPnlVnd = currentValueVnd - totalSpentVnd;
    const dcaPnlPct = (dcaPnlVnd / totalSpentVnd) * 100;

    // 7. Lump sum comparison
    const lumpSumGoldTael = totalSpentVnd / firstPurchasePrice;
    const lumpSumCostVnd = totalSpentVnd;
    const lumpSumCurrentValueVnd = lumpSumGoldTael * latestPrice;
    const lumpSumPnlPct =
      ((lumpSumCurrentValueVnd - lumpSumCostVnd) / lumpSumCostVnd) * 100;

    // 8. Fill in lumpSumValue per data point using price at that date
    for (const dp of dataPoints) {
      dp.lumpSumValue = lumpSumGoldTael * dp.price;
    }

    return {
      averageCostVnd,
      totalGoldTael,
      totalSpentVnd,
      currentValueVnd,
      dcaPnlVnd,
      dcaPnlPct,
      lumpSumCostVnd,
      lumpSumCurrentValueVnd,
      lumpSumPnlPct,
      dataPoints,
    };
  }
}
