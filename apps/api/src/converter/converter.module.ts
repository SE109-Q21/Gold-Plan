import { Module } from '@nestjs/common';
import { ConverterService } from './converter.service';
import { ConverterController } from './converter.controller';
import { PriceModule } from '../price/price.module';
import { ExchangeRateModule } from '../exchange-rate/exchange-rate.module';

@Module({
  imports: [PriceModule, ExchangeRateModule],
  providers: [ConverterService],
  controllers: [ConverterController],
})
export class ConverterModule {}
