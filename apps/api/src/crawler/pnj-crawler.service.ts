import { Injectable, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { GoldBrand, GoldType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AnomalyDetectorService } from './anomaly-detector.service';
import { CrawlSchedulerService } from './crawl-scheduler.service';
import { BaseCrawlerService, RawPriceData } from './base-crawler.service';

const VANG_TODAY_URL = 'https://www.vang.today/api/prices';
const PNJ_DATA_SOURCE_NAME = 'PNJ Official';

// Type codes from vang.today API (keys of the `prices` object)
const PNJ_TYPE_MAP: Record<string, GoldType> = {
  PQHNVM:    'NHAN_9999',
  PQHN24NTT: 'VANG_24K',
};

interface VangTodayPriceItem {
  name: string;
  buy: number;
  sell: number;
  currency: string;
}

interface VangTodayResponse {
  success: boolean;
  prices: Record<string, VangTodayPriceItem>;
}

@Injectable()
export class PnjCrawlerService extends BaseCrawlerService implements OnModuleInit {
  protected readonly brand: GoldBrand = 'PNJ';

  constructor(
    prisma: PrismaService,
    anomalyDetector: AnomalyDetectorService,
    private readonly scheduler?: CrawlSchedulerService,
  ) {
    super(prisma, anomalyDetector);
  }

  onModuleInit() {
    if (this.scheduler) {
      this.scheduler.registerCrawler('PNJ', () => this.crawl(PNJ_DATA_SOURCE_NAME));
    }
  }

  async fetchPrices(): Promise<RawPriceData[]> {
    const { data } = await axios.get<VangTodayResponse>(VANG_TODAY_URL, { timeout: 10_000 });
    return this.parseItems(data.prices);
  }

  parseItems(prices: Record<string, VangTodayPriceItem>): RawPriceData[] {
    const results: RawPriceData[] = [];
    const seen = new Set<GoldType>();
    for (const [typeCode, item] of Object.entries(prices)) {
      const goldType = PNJ_TYPE_MAP[typeCode];
      if (!goldType || seen.has(goldType)) continue;
      seen.add(goldType);
      results.push({
        goldType,
        buyPrice: BigInt(item.buy),
        sellPrice: BigInt(item.sell),
      });
    }
    return results;
  }
}
