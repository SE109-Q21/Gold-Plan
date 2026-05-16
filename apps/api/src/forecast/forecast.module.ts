import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PriceModule } from '../price/price.module';
import { ForecastController } from './forecast.controller';
import { ForecastService } from './forecast.service';

@Module({
  imports: [PriceModule, AuthModule],
  controllers: [ForecastController],
  providers: [ForecastService],
})
export class ForecastModule {}
