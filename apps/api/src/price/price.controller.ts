import { BadRequestException, Controller, Get, Query, Res, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { PriceService } from './price.service';
import { DomesticQueryDto } from './dto/domestic-query.dto';
import { HistoryQueryDto } from './dto/history-query.dto';
import { ComparisonQueryDto } from './dto/comparison-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GoldBrand, GoldType } from '@prisma/client';

const VALID_BRANDS = Object.values(GoldBrand) as string[];
const VALID_GOLD_TYPES = Object.values(GoldType) as string[];
const VALID_RANGES = ['1D', '1W', '1M', '3M', '1Y'];

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
    if (!VALID_BRANDS.includes(brand)) {
      throw new BadRequestException(`Invalid brand. Must be one of: ${VALID_BRANDS.join(', ')}`);
    }
    if (!VALID_GOLD_TYPES.includes(goldType)) {
      throw new BadRequestException(`Invalid goldType. Must be one of: ${VALID_GOLD_TYPES.join(', ')}`);
    }
    const resolvedRange = range || '1M';
    if (!VALID_RANGES.includes(resolvedRange)) {
      throw new BadRequestException(`Invalid range. Must be one of: ${VALID_RANGES.join(', ')}`);
    }
    const csv = await this.priceService.exportCsv(
      brand as GoldBrand,
      goldType as GoldType,
      resolvedRange as any,
    );
    const filename = `gold-history-${brand}-${resolvedRange}.csv`;
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
