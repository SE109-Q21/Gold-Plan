import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { PriceModule } from '../price/price.module';
import { InternationalModule } from '../international/international.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PriceModule, InternationalModule, AuthModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
