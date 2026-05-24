import { Controller, Get, Query } from '@nestjs/common';
import { ArbitrageService } from './arbitrage.service';

@Controller('prices/arbitrage')
export class ArbitrageController {
  constructor(private readonly arbitrageService: ArbitrageService) {}

  @Get()
  getOpportunities() {
    return this.arbitrageService.getOpportunities();
  }

  @Get('history')
  getHistory(
    @Query('goldType') goldType: string,
    @Query('hours') hours?: string,
  ) {
    return this.arbitrageService.getHistory(goldType, hours ? Number(hours) : 24);
  }
}
