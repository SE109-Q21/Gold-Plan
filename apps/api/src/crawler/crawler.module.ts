import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AnomalyDetectorService } from './anomaly-detector.service';
import { CrawlSchedulerService } from './crawl-scheduler.service';
import { SjcCrawlerService } from './sjc-crawler.service';
import { DojiCrawlerService } from './doji-crawler.service';
import { PnjCrawlerService } from './pnj-crawler.service';
import { BtmcCrawlerService } from './btmc-crawler.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    AnomalyDetectorService,
    CrawlSchedulerService,
    SjcCrawlerService,
    DojiCrawlerService,
    PnjCrawlerService,
    BtmcCrawlerService,
  ],
  exports: [AnomalyDetectorService, CrawlSchedulerService],
})
export class CrawlerModule {}
