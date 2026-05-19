import { Injectable, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { GoldBrand, GoldType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AnomalyDetectorService } from './anomaly-detector.service';
import { CrawlSchedulerService } from './crawl-scheduler.service';
import { BaseCrawlerService, RawPriceData } from './base-crawler.service';

const BTMC_API_URL = 'https://btmc.vn/api/BTMCAPI/getpricebtmc?key=3kd8ub1llcg9t45hnoh8hmn7t5kc2v';
const BTMC_DATA_SOURCE_NAME = 'Bảo Tín Minh Châu';

const GOLD_TYPE_MAP: Array<{ keywords: string[]; type: GoldType }> = [
  { keywords: ['miếng', 'mieng', 'sjc'], type: 'MIEN_SJC' },
  { keywords: ['nhẫn', 'nhan', '9999', '99.9'], type: 'NHAN_9999' },
  { keywords: ['24k', '24 k'], type: 'VANG_24K' },
  { keywords: ['18k', '18 k'], type: 'VANG_18K' },
];

// API field keys are prefixed with '@' and indexed by @row value
interface BtmcDataItem {
  '@row': string;
  [key: string]: string | undefined;
}

interface BtmcApiResponse {
  DataList: {
    Data: BtmcDataItem[];
  };
}

function detectGoldType(label: string): GoldType | null {
  const lower = label.toLowerCase();
  for (const { keywords, type } of GOLD_TYPE_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) return type;
  }
  return null;
}

@Injectable()
export class BtmcCrawlerService extends BaseCrawlerService implements OnModuleInit {
  protected readonly brand: GoldBrand = 'BAO_TIN';

  constructor(
    prisma: PrismaService,
    anomalyDetector: AnomalyDetectorService,
    private readonly scheduler?: CrawlSchedulerService,
  ) {
    super(prisma, anomalyDetector);
  }

  onModuleInit() {
    if (this.scheduler) {
      this.scheduler.registerCrawler('BTMC', () => this.crawl(BTMC_DATA_SOURCE_NAME));
    }
  }

  async fetchPrices(): Promise<RawPriceData[]> {
    const { data } = await axios.get<BtmcApiResponse>(BTMC_API_URL, { timeout: 15_000 });
    return this.parseApiResponse(data);
  }

  parseApiResponse(response: BtmcApiResponse): RawPriceData[] {
    const results: RawPriceData[] = [];
    const seen = new Set<GoldType>();
    for (const item of response.DataList.Data) {
      const row = item['@row'];
      const name = item[`@n_${row}`];
      const buyStr = item[`@pb_${row}`];
      const sellStr = item[`@ps_${row}`];
      if (!name || !buyStr || !sellStr) continue;
      const goldType = detectGoldType(name);
      if (!goldType || seen.has(goldType)) continue;
      seen.add(goldType);
      try {
        const buy = Number(buyStr.replace(/[^\d]/g, ''));
        const sell = Number(sellStr.replace(/[^\d]/g, ''));
        if (!buy || !sell) continue;
        // BTMC API returns prices per chỉ (1/10 lượng); multiply to get per-lượng VND
        results.push({
          goldType,
          buyPrice: BigInt(buy) * 10n,
          sellPrice: BigInt(sell) * 10n,
        });
      } catch {
        this.logger.warn(`BTMC: failed to parse "${name}"`);
      }
    }
    return results;
  }
}
