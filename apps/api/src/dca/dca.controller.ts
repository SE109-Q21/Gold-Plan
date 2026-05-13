import { Controller, Get, Query } from '@nestjs/common';
import { GoldBrand, GoldType } from '@prisma/client';
import { DcaService, DcaResultDto } from './dca.service';
import { DcaQueryDto } from './dto/dca-query.dto';

@Controller('dca')
export class DcaController {
  constructor(private readonly dcaService: DcaService) {}

  @Get('simulate')
  simulate(@Query() query: DcaQueryDto): Promise<DcaResultDto> {
    return this.dcaService.simulate({
      brand: query.brand as GoldBrand,
      goldType: query.goldType as GoldType,
      startDate: query.startDate,
      frequency: query.frequency,
      qtyPerPurchase: query.qtyPerPurchase,
    });
  }
}
