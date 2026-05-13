import { Controller, Get } from '@nestjs/common';
import { HeatIndexDto, HeatIndexService } from './heat-index.service';

@Controller('heat-index')
export class HeatIndexController {
  constructor(private readonly heatIndexService: HeatIndexService) {}

  @Get('current')
  getCurrent(): Promise<HeatIndexDto> {
    return this.heatIndexService.getCurrent();
  }
}
