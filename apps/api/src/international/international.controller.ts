import { Controller, Get } from '@nestjs/common';
import { InternationalService } from './international.service';

@Controller('prices')
export class InternationalController {
  constructor(private readonly internationalService: InternationalService) {}

  @Get('international')
  getInternational() {
    return this.internationalService.getInternationalPrice();
  }
}
