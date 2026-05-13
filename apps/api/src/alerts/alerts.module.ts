import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertEvaluatorService } from './alert-evaluator.service';
import { AlertsController } from './alerts.controller';

@Module({
  providers: [AlertsService, AlertEvaluatorService],
  controllers: [AlertsController],
})
export class AlertsModule {}
