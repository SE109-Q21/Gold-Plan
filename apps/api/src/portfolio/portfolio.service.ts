import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PortfolioTransaction } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PriceService } from '../price/price.service';
import { AddTransactionDto } from './dto/add-transaction.dto';
import { EditTransactionDto } from './dto/edit-transaction.dto';

export interface PortfolioHoldingDto {
  brand: string;
  goldType: string;
  netQty: number;
  avgCostPerTael: number;
  currentBuyPrice: number;
  currentValueVnd: number;
  costBasisVnd: number;
  pnlVnd: number;
  pnlPct: number;
}

export interface PortfolioSummaryDto {
  holdings: PortfolioHoldingDto[];
  totalValueVnd: number;
  totalCostVnd: number;
  totalPnlVnd: number;
  totalPnlPct: number;
}

export interface PortfolioChartPointDto {
  date: string;
  valueVnd: number;
}

export interface AllocationBreakdownDto {
  byBrand: { brand: string; pct: number }[];
  byGoldType: { goldType: string; pct: number }[];
}

@Injectable()
export class PortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly priceService: PriceService,
  ) {}

  private normalizeTransactionType(type: string): 'BUY' | 'SELL' {
    return type.toUpperCase() === 'BUY' ? 'BUY' : 'SELL';
  }

  private async getNetQty(
    userId: string,
    brand: string,
    goldType: string,
    excludeTxId?: string,
  ): Promise<number> {
    const txs = await this.prisma.portfolioTransaction.findMany({
      where: { userId, brand: brand as any, goldType: goldType as any },
      select: { id: true, type: true, quantity: true },
    });
    return txs
      .filter((tx) => tx.id !== excludeTxId)
      .reduce((sum, tx) => {
        const qty = Number(tx.quantity);
        return this.normalizeTransactionType(tx.type) === 'BUY' ? sum + qty : sum - qty;
      }, 0);
  }

  async addTransaction(
    userId: string,
    dto: AddTransactionDto,
  ): Promise<PortfolioTransaction> {
    if (dto.quantity <= 0) {
      throw new BadRequestException('Số lượng phải lớn hơn 0');
    }
    if (dto.pricePerTael < 1_000_000) {
      throw new BadRequestException('Giá mỗi lượng phải từ 1,000,000₫ trở lên');
    }

    const transactedAt = new Date(dto.transactedAt);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (transactedAt > today) {
      throw new BadRequestException('Ngày giao dịch không được ở tương lai');
    }

    if (dto.type === 'SELL') {
      const netQty = await this.getNetQty(userId, dto.brand, dto.goldType);
      if (dto.quantity > netQty) {
        throw new BadRequestException(
          `Không đủ số dư để bán. Hiện có ${netQty} lượng ${dto.brand} ${dto.goldType}, không thể bán ${dto.quantity} lượng.`,
        );
      }
    }

    return this.prisma.portfolioTransaction.create({
      data: {
        userId,
        type: dto.type,
        brand: dto.brand as any,
        goldType: dto.goldType as any,
        quantity: dto.quantity,
        pricePerTael: BigInt(Math.round(dto.pricePerTael)),
        transactedAt,
        note: dto.note,
      },
    });
  }

  async editTransaction(
    userId: string,
    txId: string,
    dto: EditTransactionDto,
  ): Promise<PortfolioTransaction> {
    const existing = await this.prisma.portfolioTransaction.findFirst({
      where: { id: txId, userId },
    });

    if (!existing) {
      throw new NotFoundException(
        `Transaction "${txId}" not found or does not belong to user.`,
      );
    }

    const effectiveType    = this.normalizeTransactionType(dto.type ?? existing.type);
    const effectiveBrand   = dto.brand     ?? existing.brand;
    const effectiveGoldType = dto.goldType ?? existing.goldType;
    const effectiveQty     = dto.quantity  ?? Number(existing.quantity);
    const effectivePrice   = dto.pricePerTael ?? Number(existing.pricePerTael);

    if (effectiveQty <= 0) {
      throw new BadRequestException('Số lượng phải lớn hơn 0');
    }
    if (effectivePrice < 1_000_000) {
      throw new BadRequestException('Giá mỗi lượng phải từ 1,000,000₫ trở lên');
    }
    if (dto.transactedAt !== undefined) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (new Date(dto.transactedAt) > today) {
        throw new BadRequestException('Ngày giao dịch không được ở tương lai');
      }
    }

    if (effectiveType === 'SELL') {
      const netQty = await this.getNetQty(userId, effectiveBrand, effectiveGoldType, txId);
      if (effectiveQty > netQty) {
        throw new BadRequestException(
          `Không đủ số dư để bán. Hiện có ${netQty} lượng ${effectiveBrand} ${effectiveGoldType}, không thể bán ${effectiveQty} lượng.`,
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.type !== undefined) data['type'] = dto.type;
    if (dto.brand !== undefined) data['brand'] = dto.brand;
    if (dto.goldType !== undefined) data['goldType'] = dto.goldType;
    if (dto.quantity !== undefined) data['quantity'] = dto.quantity;
    if (dto.pricePerTael !== undefined)
      data['pricePerTael'] = BigInt(Math.round(dto.pricePerTael));
    if (dto.transactedAt !== undefined)
      data['transactedAt'] = new Date(dto.transactedAt);
    if (dto.note !== undefined) data['note'] = dto.note;

    return this.prisma.portfolioTransaction.update({
      where: { id: txId },
      data,
    });
  }

  async deleteTransaction(userId: string, txId: string): Promise<void> {
    const existing = await this.prisma.portfolioTransaction.findFirst({
      where: { id: txId, userId },
    });

    if (!existing) {
      throw new NotFoundException(
        `Transaction "${txId}" not found or does not belong to user.`,
      );
    }

    await this.prisma.portfolioTransaction.delete({ where: { id: txId } });
  }

  async listTransactions(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.portfolioTransaction.findMany({
        where: { userId },
        orderBy: { transactedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.portfolioTransaction.count({ where: { userId } }),
    ]);

    return {
      items: items.map((tx) => ({
        ...tx,
        type: this.normalizeTransactionType(tx.type),
        quantity: Number(tx.quantity),
        pricePerTael: Number(tx.pricePerTael),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPortfolio(userId: string): Promise<PortfolioSummaryDto> {
    const transactions = await this.prisma.portfolioTransaction.findMany({
      where: { userId },
      orderBy: { transactedAt: 'asc' },
    });

    // Group by (brand, goldType)
    const groups = new Map<
      string,
      { netQty: number; totalBoughtQty: number; totalCostBasis: number }
    >();

    for (const tx of transactions) {
      const key = `${tx.brand}:${tx.goldType}`;
      const qty = Number(tx.quantity);
      const price = Number(tx.pricePerTael);

      if (!groups.has(key)) {
        groups.set(key, { netQty: 0, totalBoughtQty: 0, totalCostBasis: 0 });
      }

      const group = groups.get(key)!;
      if (this.normalizeTransactionType(tx.type) === 'BUY') {
        group.netQty += qty;
        group.totalBoughtQty += qty;
        group.totalCostBasis += qty * price;
      } else {
        // SELL
        group.netQty -= qty;
      }
    }

    // Fetch live prices
    const livePrices = await this.priceService.getCurrentPrices();
    const priceMap = new Map<string, number>();
    for (const p of livePrices) {
      priceMap.set(`${p.brand}:${p.goldType}`, p.buyPrice);
    }

    const holdings: PortfolioHoldingDto[] = [];

    for (const [key, group] of groups.entries()) {
      if (group.netQty <= 0.001) continue;

      const [brand, goldType] = key.split(':');
      const avgCostPerTael =
        group.totalBoughtQty > 0
          ? group.totalCostBasis / group.totalBoughtQty
          : 0;

      const livePrice = priceMap.get(key) ?? 0;
      // Fall back to avg cost when live price is unavailable so holdings always show a meaningful value
      const currentBuyPrice = livePrice > 0 ? livePrice : avgCostPerTael;
      const currentValueVnd = group.netQty * currentBuyPrice;
      const costBasisVnd = group.netQty * avgCostPerTael;
      const pnlVnd = livePrice > 0 ? currentValueVnd - costBasisVnd : 0;
      const pnlPct = livePrice > 0 && costBasisVnd > 0 ? (pnlVnd / costBasisVnd) * 100 : 0;

      holdings.push({
        brand,
        goldType,
        netQty: group.netQty,
        avgCostPerTael,
        currentBuyPrice,
        currentValueVnd,
        costBasisVnd,
        pnlVnd,
        pnlPct,
      });
    }

    const totalValueVnd = holdings.reduce((s, h) => s + h.currentValueVnd, 0);
    const totalCostVnd = holdings.reduce((s, h) => s + h.costBasisVnd, 0);
    const totalPnlVnd = totalValueVnd - totalCostVnd;
    const totalPnlPct =
      totalCostVnd > 0 ? (totalPnlVnd / totalCostVnd) * 100 : 0;

    return { holdings, totalValueVnd, totalCostVnd, totalPnlVnd, totalPnlPct };
  }

  async getValueChart(userId: string): Promise<PortfolioChartPointDto[]> {
    const transactions = await this.prisma.portfolioTransaction.findMany({
      where: { userId },
      orderBy: { transactedAt: 'asc' },
    });

    if (transactions.length === 0) return [];

    // Determine date range: first transaction to today
    const firstDate = transactions[0].transactedAt;
    const today = new Date();
    const firstDay = firstDate.toISOString().slice(0, 10);
    const todayDay = today.toISOString().slice(0, 10);

    // Gather unique (brand, goldType) pairs from transactions
    const pairs = new Set<string>();
    for (const tx of transactions) {
      pairs.add(`${tx.brand}:${tx.goldType}`);
    }

    // Build sorted list of daily dates
    const days: string[] = [];
    const cursor = new Date(firstDay);
    const end = new Date(todayDay);
    while (cursor <= end) {
      days.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }

    // Fetch all price records for all pairs in a single query
    const priceDayMap = new Map<string, Map<string, number>>();
    const pairFilters = Array.from(pairs).map((pair) => {
      const [brand, goldType] = pair.split(':');
      return { brand: brand as any, goldType: goldType as any };
    });

    // Fetch 30 days before firstDay so "nearest prior day" fallback has data
    const lookbackDate = new Date(firstDay);
    lookbackDate.setDate(lookbackDate.getDate() - 30);

    const allRecords = await this.prisma.priceRecord.findMany({
      where: {
        OR: pairFilters,
        isAnomalous: false,
        recordedAt: { gte: lookbackDate, lte: new Date(todayDay + 'T23:59:59Z') },
      },
      orderBy: { recordedAt: 'asc' },
      select: { brand: true, goldType: true, buyPrice: true, recordedAt: true },
    });

    for (const r of allRecords) {
      const pair = `${r.brand}:${r.goldType}`;
      if (!priceDayMap.has(pair)) priceDayMap.set(pair, new Map());
      const day = r.recordedAt.toISOString().slice(0, 10);
      priceDayMap.get(pair)!.set(day, Number(r.buyPrice));
    }

    // For each day, compute portfolio value
    const result: PortfolioChartPointDto[] = [];
    // Holdings state: accumulated per day
    const holdingQty = new Map<string, number>();

    // Sort transactions by transactedAt
    const sortedTx = [...transactions].sort(
      (a, b) => a.transactedAt.getTime() - b.transactedAt.getTime(),
    );
    let txIdx = 0;

    for (const day of days) {
      // Apply all transactions up to and including this day
      while (
        txIdx < sortedTx.length &&
        sortedTx[txIdx].transactedAt.toISOString().slice(0, 10) <= day
      ) {
        const tx = sortedTx[txIdx];
        const key = `${tx.brand}:${tx.goldType}`;
        const qty = Number(tx.quantity);
        const current = holdingQty.get(key) ?? 0;
        if (this.normalizeTransactionType(tx.type) === 'BUY') {
          holdingQty.set(key, current + qty);
        } else {
          holdingQty.set(key, Math.max(0, current - qty));
        }
        txIdx++;
      }

      // Sum value for this day
      let valueVnd = 0;
      for (const [pair, qty] of holdingQty.entries()) {
        if (qty <= 0) continue;
        const dayMap = priceDayMap.get(pair);
        if (!dayMap) continue;

        // Find price for this day or nearest prior day
        let price = 0;
        if (dayMap.has(day)) {
          price = dayMap.get(day)!;
        } else {
          // Find the most recent prior day with a price
          const availableDays = Array.from(dayMap.keys()).sort();
          for (let i = availableDays.length - 1; i >= 0; i--) {
            if (availableDays[i] <= day) {
              price = dayMap.get(availableDays[i])!;
              break;
            }
          }
        }
        valueVnd += qty * price;
      }

      result.push({ date: day, valueVnd });
    }

    return result;
  }

  async getAllocationBreakdown(userId: string): Promise<AllocationBreakdownDto> {
    const transactions = await this.prisma.portfolioTransaction.findMany({
      where: { userId },
    });

    // Compute net qty per (brand, goldType)
    const groups = new Map<string, { brand: string; goldType: string; netQty: number }>();
    for (const tx of transactions) {
      const key = `${tx.brand}:${tx.goldType}`;
      const qty = Number(tx.quantity);
      if (!groups.has(key)) {
        groups.set(key, { brand: tx.brand, goldType: tx.goldType, netQty: 0 });
      }
      const g = groups.get(key)!;
      if (this.normalizeTransactionType(tx.type) === 'BUY') {
        g.netQty += qty;
      } else {
        g.netQty -= qty;
      }
    }

    const activeHoldings = Array.from(groups.values()).filter((g) => g.netQty > 0.001);
    const totalQty = activeHoldings.reduce((s, g) => s + g.netQty, 0);

    if (totalQty === 0) {
      return { byBrand: [], byGoldType: [] };
    }

    // byBrand
    const brandMap = new Map<string, number>();
    for (const g of activeHoldings) {
      brandMap.set(g.brand, (brandMap.get(g.brand) ?? 0) + g.netQty);
    }
    const byBrand = Array.from(brandMap.entries()).map(([brand, qty]) => ({
      brand,
      pct: (qty / totalQty) * 100,
    }));

    // byGoldType
    const goldTypeMap = new Map<string, number>();
    for (const g of activeHoldings) {
      goldTypeMap.set(g.goldType, (goldTypeMap.get(g.goldType) ?? 0) + g.netQty);
    }
    const byGoldType = Array.from(goldTypeMap.entries()).map(([goldType, qty]) => ({
      goldType,
      pct: (qty / totalQty) * 100,
    }));

    return { byBrand, byGoldType };
  }
}
