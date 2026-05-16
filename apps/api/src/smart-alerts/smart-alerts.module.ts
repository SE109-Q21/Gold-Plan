import { Module } from '@nestjs/common';
import { PriceModule } from '../price/price.module';
import { SmartAlertsController } from './smart-alerts.controller';
import { SmartAlertsService } from './smart-alerts.service';

@Module({
  imports: [PriceModule],
  controllers: [SmartAlertsController],
  providers: [SmartAlertsService],
})
export class SmartAlertsModule {}
