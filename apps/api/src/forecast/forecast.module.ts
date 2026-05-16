import { Module } from '@nestjs/common';
import { PriceModule } from '../price/price.module';
import { ForecastController } from './forecast.controller';
import { ForecastService } from './forecast.service';

@Module({
  imports: [PriceModule],
  controllers: [ForecastController],
  providers: [ForecastService],
})
export class ForecastModule {}
