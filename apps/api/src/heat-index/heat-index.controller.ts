import { Controller, Get, Query } from '@nestjs/common';
import type { HeatIndexDto } from '@gpls/shared';
import { HeatIndexService } from './heat-index.service';

@Controller('heat-index')
export class HeatIndexController {
  constructor(private readonly heatIndexService: HeatIndexService) {}

  @Get('current')
  getCurrent(): Promise<HeatIndexDto> {
    return this.heatIndexService.getCurrent();
  }

  @Get('history')
  getHistory(@Query('days') days?: string): Promise<HeatIndexDto[]> {
    return this.heatIndexService.getHistory(days ? parseInt(days, 10) : 7);
  }
}
