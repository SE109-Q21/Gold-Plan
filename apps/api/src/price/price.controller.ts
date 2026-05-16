import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { PriceService } from './price.service';
import { DomesticQueryDto } from './dto/domestic-query.dto';
import { HistoryQueryDto } from './dto/history-query.dto';
import { ComparisonQueryDto } from './dto/comparison-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GoldBrand, GoldType } from '@prisma/client';

@Controller('prices')
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Get('domestic')
  getDomestic(@Query() query: DomesticQueryDto) {
    return this.priceService.getCurrentPrices(query.brand);
  }

  @Get('history/export')
  @UseGuards(JwtAuthGuard)
  async exportCsv(
    @Query('brand') brand: string,
    @Query('goldType') goldType: string,
    @Query('range') range: string,
    @Res() res: any,
  ): Promise<void> {
    const csv = await this.priceService.exportCsv(
      brand as GoldBrand,
      goldType as GoldType,
      (range || '1M') as any,
    );
    const filename = `gold-history-${brand}-${range || '1M'}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
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
