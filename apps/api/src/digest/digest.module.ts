import { Module } from '@nestjs/common';
import { DigestService } from './digest.service';
import { DigestController } from './digest.controller';
import { PriceModule } from '../price/price.module';
import { InternationalModule } from '../international/international.module';

@Module({
  imports: [PriceModule, InternationalModule],
  controllers: [DigestController],
  providers: [DigestService],
})
export class DigestModule {}
