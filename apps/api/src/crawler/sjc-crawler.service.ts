import { Injectable, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoldBrand, GoldType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AnomalyDetectorService } from './anomaly-detector.service';
import { CrawlSchedulerService } from './crawl-scheduler.service';
import { BaseCrawlerService, RawPriceData } from './base-crawler.service';

const SJC_URL = 'https://sjc.com.vn/giavang/textContent.php';
const SJC_DATA_SOURCE_NAME = 'SJC Official';

const GOLD_TYPE_MAP: Array<{ keywords: string[]; type: GoldType }> = [
  { keywords: ['1l,10l,1kg', '1 l,10 l', 'miếng'], type: 'MIEN_SJC' },
  { keywords: ['nhẫn', 'nhan', '99.9', '9999'], type: 'NHAN_9999' },
  { keywords: ['24k', '24 k', 'nữ trang 24', 'nu trang 24'], type: 'VANG_24K' },
  { keywords: ['18k', '18 k', 'nữ trang 18', 'nu trang 18'], type: 'VANG_18K' },
];

function parsePrice(raw: string): bigint {
  // SJC prices are in thousands VND: "85.500" → 85_500_000
  const cleaned = raw.replace(/[.\s,]/g, '').trim();
  return BigInt(cleaned) * 1000n;
}

function detectGoldType(label: string): GoldType | null {
  const lower = label.toLowerCase();
  for (const { keywords, type } of GOLD_TYPE_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) return type;
  }
  return null;
}

@Injectable()
export class SjcCrawlerService extends BaseCrawlerService implements OnModuleInit {
  protected readonly brand: GoldBrand = 'SJC';

  constructor(
    prisma: PrismaService,
    anomalyDetector: AnomalyDetectorService,
    private readonly scheduler?: CrawlSchedulerService,
  ) {
    super(prisma, anomalyDetector);
  }

  onModuleInit() {
    if (this.scheduler) {
      this.scheduler.registerCrawler('SJC', () =>
        this.crawl(SJC_DATA_SOURCE_NAME),
      );
    }
  }

  async fetchPrices(): Promise<RawPriceData[]> {
    const { data: html } = await axios.get<string>(SJC_URL, { timeout: 10_000 });
    return this.parseHtml(html);
  }

  parseHtml(html: string): RawPriceData[] {
    const $ = cheerio.load(html);
    const results: RawPriceData[] = [];

    $('table tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 3) return;

      const label = $(cells[0]).text().trim();
      const buyRaw = $(cells[1]).text().trim();
      const sellRaw = $(cells[2]).text().trim();

      const goldType = detectGoldType(label);
      if (!goldType) return;

      try {
        results.push({
          goldType,
          buyPrice: parsePrice(buyRaw),
          sellPrice: parsePrice(sellRaw),
        });
      } catch {
        this.logger.warn(`SJC: failed to parse price row "${label}"`);
      }
    });

    return results;
  }
}
