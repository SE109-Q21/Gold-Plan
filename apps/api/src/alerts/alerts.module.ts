import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AlertsService } from './alerts.service';
import { AlertEvaluatorService } from './alert-evaluator.service';
import { AlertsController } from './alerts.controller';

@Module({
  imports: [AuthModule],
  providers: [AlertsService, AlertEvaluatorService],
  controllers: [AlertsController],
})
export class AlertsModule {}
