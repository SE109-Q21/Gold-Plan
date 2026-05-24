import { Injectable } from '@nestjs/common';
import { GoldBrand, GoldType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AssetsComparisonDto, DataSeriesDto } from '@gpls/shared';

export type ComparisonRange = '1M' | '3M' | '6M' | '1Y';

const RANGE_DAYS: Record<ComparisonRange, number> = {
  '1M': 30, '3M': 90, '6M': 180, '1Y': 365,
};

@Injectable()
export class AssetsComparisonService {
  constructor(private readonly prisma: PrismaService) {}

  normalizeToBase100(
    dataPoints: { date: string; value: number }[],
  ): { date: string; value: number }[] {
    if (dataPoints.length === 0) return [];
    const base = dataPoints[0].value;
    return dataPoints.map(p => ({
      date: p.date,
      value: Math.round((p.value / base) * 10000) / 100,
    }));
  }

  computeBankSeries(
    annualRatePercent: number,
    baseDate: Date,
    endDate: Date,
  ): { date: string; value: number }[] {
    const dailyRate = annualRatePercent / 100 / 365;
    const result: { date: string; value: number }[] = [];
    const current = new Date(baseDate);
    let day = 0;
    while (current <= endDate) {
      result.push({
        date: current.toISOString().slice(0, 10),
        value: Math.round(100 * (1 + dailyRate) ** day * 100) / 100,
      });
      current.setDate(current.getDate() + 1);
      day++;
    }
    return result;
  }

  async getComparison(range: ComparisonRange = '1M'): Promise<AssetsComparisonDto> {
    const days = RANGE_DAYS[range];
    const endDate = new Date();
    const baseDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // ── Gold (SJC NHAN_9999) ──
    const goldRecords = await this.prisma.priceRecord.findMany({
      where: {
        brand: GoldBrand.SJC,
        goldType: GoldType.NHAN_9999,
        isAnomalous: false,
        recordedAt: { gte: baseDate },
      },
      orderBy: { recordedAt: 'asc' },
      select: { recordedAt: true, sellPrice: true },
    });
    const goldRaw = goldRecords.map(r => ({
      date: r.recordedAt.toISOString().slice(0, 10),
      value: Number(r.sellPrice),
    }));
    const goldDaily = this.lastPerDay(goldRaw);
    const goldPoints = this.normalizeToBase100(goldDaily);

    // ── USD/VND ──
    const usdRecords = await this.prisma.exchangeRate.findMany({
      where: {
        fromCurrency: 'USD',
        toCurrency: 'VND',
        recordedAt: { gte: baseDate },
      },
      orderBy: { recordedAt: 'asc' },
      select: { recordedAt: true, rate: true },
    });
    const usdRaw = usdRecords.map(r => ({
      date: r.recordedAt.toISOString().slice(0, 10),
      value: Number(r.rate),
    }));
    const usdPoints = this.normalizeToBase100(this.lastPerDay(usdRaw));

    // ── Bank Deposit ──
    const bankBenchmark = await this.prisma.assetBenchmark.findFirst({
      where: { assetType: 'BANK_DEPOSIT' },
      orderBy: { date: 'desc' },
    });
    const bankRate = bankBenchmark ? Number(bankBenchmark.value) : 5.5;
    const bankPoints = this.computeBankSeries(bankRate, baseDate, endDate);

    // ── VN-Index ──
    const vnRecords = await this.prisma.assetBenchmark.findMany({
      where: { assetType: 'VN_INDEX', date: { gte: baseDate } },
      orderBy: { date: 'asc' },
    });
    let vnIndex: DataSeriesDto | null = null;
    if (vnRecords.length >= 2) {
      const vnRaw = vnRecords.map(r => ({
        date: (r.date as Date).toISOString().slice(0, 10),
        value: Number(r.value),
      }));
      vnIndex = {
        label: 'VN-Index',
        returnPercent: Math.round(((vnRaw[vnRaw.length - 1].value / vnRaw[0].value) - 1) * 10000) / 100,
        dataPoints: this.normalizeToBase100(vnRaw),
      };
    }

    // ── Assemble ──
    const goldReturn = goldPoints.length > 1
      ? Math.round((goldPoints[goldPoints.length - 1].value - 100) * 100) / 100
      : 0;
    const usdReturn = usdPoints.length > 1
      ? Math.round((usdPoints[usdPoints.length - 1].value - 100) * 100) / 100
      : 0;
    const bankReturn = bankPoints.length > 1
      ? Math.round((bankPoints[bankPoints.length - 1].value - 100) * 100) / 100
      : 0;

    const insight = this.generateInsight(goldReturn, usdReturn, bankReturn, vnIndex?.returnPercent ?? null, range);

    return {
      range,
      baseDate: baseDate.toISOString().slice(0, 10),
      gold: { label: 'Vàng SJC', returnPercent: goldReturn, dataPoints: goldPoints },
      usd: { label: 'USD/VND', returnPercent: usdReturn, dataPoints: usdPoints },
      bankDeposit: { label: `Gửi NH (${bankRate}%/năm)`, returnPercent: bankReturn, dataPoints: bankPoints },
      vnIndex,
      insight,
    };
  }

  private lastPerDay(points: { date: string; value: number }[]): { date: string; value: number }[] {
    const map = new Map<string, number>();
    for (const p of points) map.set(p.date, p.value);
    return Array.from(map.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private generateInsight(gold: number, usd: number, bank: number, vni: number | null, range: string): string {
    const channels = [
      { name: 'Vàng SJC', r: gold },
      { name: 'USD/VND', r: usd },
      { name: 'Gửi ngân hàng', r: bank },
      ...(vni !== null ? [{ name: 'VN-Index', r: vni }] : []),
    ].sort((a, b) => b.r - a.r);

    const winner = channels[0];
    const rangeLabel = { '1M': '1 tháng', '3M': '3 tháng', '6M': '6 tháng', '1Y': '1 năm' }[range] ?? range;

    if (winner.r > 0) {
      return `Trong ${rangeLabel} qua, ${winner.name} dẫn đầu với ${winner.r > 0 ? '+' : ''}${winner.r.toFixed(2)}%.`;
    }
    return `Trong ${rangeLabel} qua, tất cả kênh đều giảm. ${winner.name} giảm ít nhất (${winner.r.toFixed(2)}%).`;
  }
}
