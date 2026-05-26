import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../database/prisma.service';
import { PriceUpdatedEvent } from '../realtime/price-updated.event';

@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);
  private baselines = new Map<string, { buyPrice: bigint; sellPrice: bigint }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron('*/15 * * * * *')
  async tick(): Promise<void> {
    if (process.env.DEMO_MODE !== 'true') return;

    if (this.baselines.size === 0) await this.loadBaselines();
    if (this.baselines.size === 0) return;

    for (const [key, prices] of this.baselines.entries()) {
      const [brand, goldType] = key.split(':');
      const factor = 1 + (Math.random() - 0.5) * 0.004; // ±0.2% mỗi tick
      const buyPrice  = this.round100k(Number(prices.buyPrice)  * factor);
      const sellPrice = this.round100k(Number(prices.sellPrice) * factor);

      // Drift baseline dần để giá không về cùng điểm
      this.baselines.set(key, { buyPrice, sellPrice });

      const event     = new PriceUpdatedEvent();
      event.brand     = brand;
      event.goldType  = goldType;
      event.buyPrice  = buyPrice;
      event.sellPrice = sellPrice;
      event.recordedAt = new Date();

      this.eventEmitter.emit('price.updated', event);
    }

    this.logger.debug(`[DEMO] Emitted ${this.baselines.size} price updates`);
  }

  private async loadBaselines(): Promise<void> {
    // Lấy giá mới nhất cho mỗi cặp brand/goldType từ DB
    const rows = await this.prisma.$queryRaw<
      Array<{ brand: string; goldType: string; buyPrice: bigint; sellPrice: bigint }>
    >`
      SELECT DISTINCT ON (brand, "goldType")
        brand, "goldType", "buyPrice", "sellPrice"
      FROM "PriceRecord"
      ORDER BY brand, "goldType", "recordedAt" DESC
    `;

    for (const r of rows) {
      this.baselines.set(`${r.brand}:${r.goldType}`, {
        buyPrice:  r.buyPrice,
        sellPrice: r.sellPrice,
      });
    }

    this.logger.log(`[DEMO] Baselines loaded — ${this.baselines.size} pairs`);
  }

  private round100k(value: number): bigint {
    return BigInt(Math.round(value / 100_000) * 100_000);
  }
}
