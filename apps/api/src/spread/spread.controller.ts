import { Controller, Get, Query } from '@nestjs/common';
import { GoldType } from '@prisma/client';
import { SpreadService } from './spread.service';
import { SpreadRankingQueryDto } from './dto/spread-ranking-query.dto';
import { SpreadRankingDto } from '@gpls/shared';

@Controller('spread')
export class SpreadController {
  constructor(private readonly spreadService: SpreadService) {}

  @Get('ranking')
  getRanking(@Query() query: SpreadRankingQueryDto): Promise<SpreadRankingDto[]> {
    return this.spreadService.getSpreadRanking(query.goldType as GoldType);
  }
}
