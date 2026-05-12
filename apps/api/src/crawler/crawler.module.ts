import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AnomalyDetectorService } from './anomaly-detector.service';
import { CrawlSchedulerService } from './crawl-scheduler.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [AnomalyDetectorService, CrawlSchedulerService],
  exports: [AnomalyDetectorService, CrawlSchedulerService],
})
export class CrawlerModule {}
