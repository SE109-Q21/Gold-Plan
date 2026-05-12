import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AnomalyDetectorService } from './anomaly-detector.service';
import { CrawlSchedulerService } from './crawl-scheduler.service';
import { SjcCrawlerService } from './sjc-crawler.service';
import { DojiCrawlerService } from './doji-crawler.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    AnomalyDetectorService,
    CrawlSchedulerService,
    SjcCrawlerService,
    DojiCrawlerService,
  ],
  exports: [AnomalyDetectorService, CrawlSchedulerService],
})
export class CrawlerModule {}
