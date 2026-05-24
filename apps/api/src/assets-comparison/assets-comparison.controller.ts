import { Controller, Get, Query } from '@nestjs/common';
import { AssetsComparisonService, ComparisonRange } from './assets-comparison.service';

@Controller('prices/assets-comparison')
export class AssetsComparisonController {
  constructor(private readonly service: AssetsComparisonService) {}

  @Get()
  getComparison(@Query('range') range?: string) {
    const validRanges: ComparisonRange[] = ['1M', '3M', '6M', '1Y'];
    const r = validRanges.includes(range as ComparisonRange) ? (range as ComparisonRange) : '1M';
    return this.service.getComparison(r);
  }
}
