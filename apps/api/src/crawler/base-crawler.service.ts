import { Logger } from '@nestjs/common';
import { GoldBrand, GoldType } from '@prisma/client';
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

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly anomalyDetector: AnomalyDetectorService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  abstract fetchPrices(): Promise<RawPriceData[]>;

  async crawl(dataSourceId: string): Promise<void> {
    const session = await this.prisma.crawlSession.create({
      data: { dataSourceId, status: 'running' },
    });

    try {
      const rawPrices = await this.fetchPrices();

      for (const price of rawPrices) {
        const prevRecord = await this.prisma.priceRecord.findFirst({
          where: { brand: this.brand, goldType: price.goldType, isAnomalous: false },
          orderBy: { recordedAt: 'desc' },
        });

        const isAnomalous = this.anomalyDetector.isAnomalous(
          prevRecord?.buyPrice ?? null,
          price.buyPrice,
        );

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
