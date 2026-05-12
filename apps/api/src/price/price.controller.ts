import { Controller, Get, Query } from '@nestjs/common';
import { PriceService } from './price.service';
import { DomesticQueryDto } from './dto/domestic-query.dto';
import { HistoryQueryDto } from './dto/history-query.dto';
import { ComparisonQueryDto } from './dto/comparison-query.dto';

@Controller('prices')
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Get('domestic')
  getDomestic(@Query() query: DomesticQueryDto) {
    return this.priceService.getCurrentPrices(query.brand);
  }

  @Get('history')
  getHistory(@Query() query: HistoryQueryDto) {
    return this.priceService.getHistory(query.brand, query.goldType, query.range);
  }

  @Get('comparison')
  getComparison(@Query() query: ComparisonQueryDto) {
    return this.priceService.getComparison(query.goldType);
  }
}
