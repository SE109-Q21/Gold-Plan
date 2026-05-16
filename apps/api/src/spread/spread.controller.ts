import { Controller, Get, Query } from '@nestjs/common';
import { GoldBrand, GoldType } from '@prisma/client';
import { SpreadService } from './spread.service';
import { SpreadRankingQueryDto } from './dto/spread-ranking-query.dto';
import { SpreadRankingDto, SpreadHistoryPointDto } from '@gpls/shared';

@Controller('spread')
export class SpreadController {
  constructor(private readonly spreadService: SpreadService) {}

  @Get('ranking')
  getRanking(@Query() query: SpreadRankingQueryDto): Promise<SpreadRankingDto[]> {
    return this.spreadService.getSpreadRanking(query.goldType as GoldType);
  }

  @Get('history')
  getHistory(
    @Query('brand') brand: string,
    @Query('goldType') goldType: string,
    @Query('days') days?: string,
  ): Promise<SpreadHistoryPointDto[]> {
    return this.spreadService.getSpreadHistory(
      brand as GoldBrand,
      goldType as GoldType,
      days ? parseInt(days, 10) : 7,
    );
  }
}
