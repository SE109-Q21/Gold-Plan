import { Controller, Get, Query } from '@nestjs/common';
import { ConverterService } from './converter.service';
import { CalculateQueryDto } from './dto/calculate-query.dto';
import { ConverterResultDto } from '@gpls/shared';

@Controller('converter')
export class ConverterController {
  constructor(private readonly converterService: ConverterService) {}

  @Get('calculate')
  calculate(@Query() query: CalculateQueryDto): Promise<ConverterResultDto> {
    return this.converterService.calculate(query);
  }
}
