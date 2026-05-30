import { Inject, Logger } from '@nestjs/common';
import { GoldBrand, GoldType } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../database/prisma.service';
import { AnomalyDetectorService } from './anomaly-detector.service';

export interface RawPriceData {
  goldType: GoldType;
  buyPrice: bigint;
  sellPrice: bigint;
}

export abstract class BaseCrawlerService {
  protected readonly logger: Logger;
  protected abstract readonly brand: GoldBrand;

  @Inject(EventEmitter2)
  private readonly eventEmitter: EventEmitter2;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly anomalyDetector: AnomalyDetectorService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  abstract fetchPrices(): Promise<RawPriceData[]>;

  async crawl(dataSourceName: string): Promise<void> {
    // Resolve (or create) the DataSource record to obtain a stable FK id
    let dataSource = await this.prisma.dataSource.findFirst({
      where: { name: dataSourceName },
    });

    if (!dataSource) {
      dataSource = await this.prisma.dataSource.create({
        data: {
          name: dataSourceName,
          brand: this.brand,
          url: '',
          crawlType: 'html',
          frequencyMin: 5,
        },
      });
    }

    const session = await this.prisma.crawlSession.create({
      data: { dataSourceId: dataSource.id, status: 'running' },
    });

    try {
      const rawPrices = await this.fetchPrices();

      for (const price of rawPrices) {
        const prevRecord = await this.prisma.priceRecord.findFirst({
          where: { brand: this.brand, goldType: price.goldType, isAnomalous: false },
          orderBy: { recordedAt: 'desc' },
        });

        // If the last good record is stale (>2h), the market may have moved legitimately.
        // Reset the baseline to avoid permanently locking out all future data.
        const prevAge = prevRecord
          ? Date.now() - new Date(prevRecord.recordedAt).getTime()
          : Infinity;
        const prevPrice = prevAge < 2 * 60 * 60 * 1000 ? (prevRecord?.buyPrice ?? null) : null;

        const isAnomalous = this.anomalyDetector.isAnomalous(prevPrice, price.buyPrice);

        await this.prisma.priceRecord.create({
          data: {
            crawlSessionId: session.id,
            brand: this.brand,
            goldType: price.goldType,
            buyPrice: price.buyPrice,
            sellPrice: price.sellPrice,
            isAnomalous,
            anomalyReason: isAnomalous ? 'deviation > 15%' : null,
          },
        });

        if (!isAnomalous) {
          this.eventEmitter.emit('price.updated', {
            brand: this.brand,
            goldType: price.goldType,
            buyPrice: price.buyPrice,
            sellPrice: price.sellPrice,
            recordedAt: new Date(),
          });
        }
      }

      await this.prisma.crawlSession.update({
        where: { id: session.id },
        data: { status: 'completed', completedAt: new Date() },
      });

      this.logger.log(`Crawl OK: ${this.brand} — ${rawPrices.length} records`);
    } catch (error) {
      await this.prisma.crawlSession.update({
        where: { id: session.id },
        data: { status: 'failed', completedAt: new Date() },
      });
      this.logger.error(`Crawl FAILED: ${this.brand} — ${(error as Error).message}`);
    }
  }
}
