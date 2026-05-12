import { Controller, Get } from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service';
import { ExchangeRateDto } from '@gpls/shared';

@Controller('exchange-rate')
export class ExchangeRateController {
  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  @Get('rates')
  getRates(): Promise<ExchangeRateDto> {
    return this.exchangeRateService.getRates();
  }
}
