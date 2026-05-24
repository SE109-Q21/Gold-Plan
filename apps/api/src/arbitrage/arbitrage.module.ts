import { Module } from '@nestjs/common';
import { ArbitrageService } from './arbitrage.service';
import { ArbitrageController } from './arbitrage.controller';

@Module({
  providers: [ArbitrageService],
  controllers: [ArbitrageController],
})
export class ArbitrageModule {}
