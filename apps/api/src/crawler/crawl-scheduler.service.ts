import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

const TRADING_START_HOUR = 7;
const TRADING_END_HOUR = 17;

function isTradingHours(): boolean {
  if (process.env.SKIP_TRADING_HOURS === 'true') return true;
  const vietnamHour = parseInt(
    new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: 'numeric',
      hour12: false,
    }),
    10,
  );
  return vietnamHour >= TRADING_START_HOUR && vietnamHour < TRADING_END_HOUR;
}

@Injectable()
export class CrawlSchedulerService {
  private readonly logger = new Logger(CrawlSchedulerService.name);
  private readonly crawlers = new Map<string, () => Promise<void>>();

  registerCrawler(brand: string, crawlFn: () => Promise<void>): void {
    this.crawlers.set(brand, crawlFn);
  }

  @Cron('*/5 * * * *')
  async runCrawlCycle(): Promise<void> {
    if (!isTradingHours()) {
      this.logger.debug('Outside trading hours — skipping crawl cycle');
      return;
    }
    await this.runNow();
  }

  async runNow(): Promise<{ triggered: number }> {
    this.logger.log(`Manual crawl trigger (${this.crawlers.size} sources)`);
    for (const [brand, crawlFn] of this.crawlers.entries()) {
      try {
        await crawlFn();
      } catch (err) {
        this.logger.error(`Crawl failed for ${brand}: ${(err as Error).message}`);
      }
    }
    return { triggered: this.crawlers.size };
  }
}
