import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { PriceModule } from '../price/price.module';
import { InternationalModule } from '../international/international.module';

@Module({
  imports: [PriceModule, InternationalModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
