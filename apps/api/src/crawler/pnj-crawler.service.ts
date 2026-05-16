import { Injectable, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoldBrand, GoldType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AnomalyDetectorService } from './anomaly-detector.service';
import { CrawlSchedulerService } from './crawl-scheduler.service';
import { BaseCrawlerService, RawPriceData } from './base-crawler.service';

const PNJ_URL = 'https://www.pnj.com.vn/blog/gia-vang/';
const PNJ_DATA_SOURCE_NAME = 'PNJ Official';

const GOLD_TYPE_MAP: Array<{ keywords: string[]; type: GoldType }> = [
  { keywords: ['nhẫn', 'nhan', '9999', '99.9'], type: 'NHAN_9999' },
  { keywords: ['24k', '24 k'], type: 'VANG_24K' },
  { keywords: ['18k', '18 k'], type: 'VANG_18K' },
];

function parsePrice(raw: string): bigint {
  // PNJ prices are in full VND: "7.950.000" → 7_950_000
  const cleaned = raw.replace(/\./g, '').replace(/[^\d]/g, '').trim();
  if (!cleaned) throw new Error(`Cannot parse price: "${raw}"`);
  return BigInt(cleaned);
}

function detectGoldType(label: string): GoldType | null {
  const lower = label.toLowerCase();
  for (const { keywords, type } of GOLD_TYPE_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) return type;
  }
  return null;
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
      this.scheduler.registerCrawler('PNJ', () =>
        this.crawl(PNJ_DATA_SOURCE_NAME),
      );
    }
  }

  async fetchPrices(): Promise<RawPriceData[]> {
    const { data: html } = await axios.get<string>(PNJ_URL, { timeout: 10_000 });
    return this.parseHtml(html);
  }

  public parseHtml(html: string): RawPriceData[] {
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
        this.logger.warn(`PNJ: failed to parse price row "${label}"`);
      }
    });

    return results;
  }
}
