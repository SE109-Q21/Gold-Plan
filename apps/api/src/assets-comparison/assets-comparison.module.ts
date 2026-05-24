import { Module } from '@nestjs/common';
import { AssetsComparisonService } from './assets-comparison.service';
import { AssetsComparisonController } from './assets-comparison.controller';

@Module({
  providers: [AssetsComparisonService],
  controllers: [AssetsComparisonController],
})
export class AssetsComparisonModule {}
