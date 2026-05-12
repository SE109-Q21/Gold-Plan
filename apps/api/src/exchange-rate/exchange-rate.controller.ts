import { Controller, Get } from '@nestjs/common';
import { ExchangeRateService, ExchangeRateDto } from './exchange-rate.service';

@Controller('exchange-rate')
export class ExchangeRateController {
  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  @Get('rates')
  getRates(): Promise<ExchangeRateDto> {
    return this.exchangeRateService.getRates();
  }
}
