import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PriceModule } from '../price/price.module';
import { PushModule } from '../push/push.module';
import { SmartAlertsController } from './smart-alerts.controller';
import { SmartAlertsService } from './smart-alerts.service';

@Module({
  imports: [PriceModule, AuthModule, PushModule],
  controllers: [SmartAlertsController],
  providers: [SmartAlertsService],
})
export class SmartAlertsModule {}
