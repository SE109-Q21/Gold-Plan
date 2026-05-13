import { Module } from '@nestjs/common';
import { HeatIndexService } from './heat-index.service';
import { HeatIndexController } from './heat-index.controller';

@Module({
  providers: [HeatIndexService],
  controllers: [HeatIndexController],
  exports: [HeatIndexService],
})
export class HeatIndexModule {}
