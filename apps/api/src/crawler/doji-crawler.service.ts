import { Injectable, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { GoldBrand, GoldType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AnomalyDetectorService } from './anomaly-detector.service';
import { CrawlSchedulerService } from './crawl-scheduler.service';
import { BaseCrawlerService, RawPriceData } from './base-crawler.service';

const DOJI_URL = 'https://www.dojigroup.com.vn/api/gold-price';
const DOJI_DATA_SOURCE_NAME = 'DOJI Official';

const GOLD_TYPE_MAP: Array<{ keywords: string[]; type: GoldType }> = [
  { keywords: ['miếng', 'mien', '9999 (v', 'sjc'], type: 'MIEN_SJC' },
  { keywords: ['nhẫn', 'nhan', 'ring'], type: 'NHAN_9999' },
  { keywords: ['24k', '24 k', 'nữ trang 24', 'nu trang 24'], type: 'VANG_24K' },
  { keywords: ['18k', '18 k', 'nữ trang 18', 'nu trang 18'], type: 'VANG_18K' },
];

interface DojiApiRow {
  name: string;
  buy: string;
  sell: string;
}

interface DojiApiResponse {
  data: DojiApiRow[];
}

function detectGoldType(label: string): GoldType | null {
  const lower = label.toLowerCase();
  for (const { keywords, type } of GOLD_TYPE_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) return type;
  }
  return null;
}

@Injectable()
export class DojiCrawlerService extends BaseCrawlerService implements OnModuleInit {
  protected readonly brand: GoldBrand = 'DOJI';

  constructor(
    prisma: PrismaService,
    anomalyDetector: AnomalyDetectorService,
    private readonly scheduler?: CrawlSchedulerService,
  ) {
    super(prisma, anomalyDetector);
  }

  onModuleInit() {
    if (this.scheduler) {
      this.scheduler.registerCrawler('DOJI', () =>
        this.crawl(DOJI_DATA_SOURCE_NAME),
      );
    }
  }

  async fetchPrices(): Promise<RawPriceData[]> {
    const { data } = await axios.get<DojiApiResponse>(DOJI_URL, { timeout: 10_000 });
    return this.parseResponse(data);
  }

  parseResponse(response: DojiApiResponse): RawPriceData[] {
    const results: RawPriceData[] = [];

    for (const row of response.data) {
      const goldType = detectGoldType(row.name);
      if (!goldType) continue;

      try {
        results.push({
          goldType,
          buyPrice: BigInt(row.buy),
          sellPrice: BigInt(row.sell),
        });
      } catch {
        this.logger.warn(`DOJI: failed to parse row "${row.name}"`);
      }
    }

    return results;
  }
}
