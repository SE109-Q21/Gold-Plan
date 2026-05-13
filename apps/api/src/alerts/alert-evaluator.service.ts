import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AlertCondition, AlertStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AlertEvaluatorService {
  private readonly logger = new Logger(AlertEvaluatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  @Cron('*/5 * * * *')
  async evaluate(): Promise<void> {
    // 1. Load all ACTIVE alerts
    const alerts = await this.prisma.priceAlert.findMany({
      where: { status: AlertStatus.active },
      include: { user: { select: { email: true } } },
    });

    for (const alert of alerts) {
      // 2. Get latest non-anomalous PriceRecord for brand+goldType
      const latest = await this.prisma.priceRecord.findFirst({
        where: { brand: alert.brand, goldType: alert.goldType, isAnomalous: false },
        orderBy: { recordedAt: 'desc' },
      });
      if (!latest) continue;

      // 3. Check condition
      const conditionMet =
        alert.condition === AlertCondition.gte
          ? latest.buyPrice >= alert.thresholdPrice
          : latest.buyPrice <= alert.thresholdPrice;
      if (!conditionMet) continue;

      // 4. Cooldown check (repeatMode=true, fired < 30min ago → skip)
      if (alert.repeatMode && alert.lastTriggeredAt) {
        const msSinceFired = Date.now() - alert.lastTriggeredAt.getTime();
        if (msSinceFired < 30 * 60_000) continue;
      }

      // 5. Send email
      let emailSentAt: Date | null = null;
      try {
        await this.mailService.sendAlertEmail(alert.user.email, {
          brand: alert.brand,
          goldType: alert.goldType,
          condition: alert.condition,
          thresholdPrice: alert.thresholdPrice,
          currentPrice: latest.buyPrice,
        });
        emailSentAt = new Date();
      } catch (err) {
        this.logger.error(
          `AlertEvaluatorService: failed to send alert email for alert ${alert.id}: ${(err as Error).message}`,
        );
      }

      // 6. Create trigger history
      await this.prisma.alertTriggerHistory.create({
        data: {
          alertId: alert.id,
          priceAtTrigger: latest.buyPrice,
          emailSentAt,
        },
      });

      // 7. Update alert status
      if (!alert.repeatMode) {
        await this.prisma.priceAlert.update({
          where: { id: alert.id },
          data: { status: AlertStatus.triggered },
        });
      } else {
        await this.prisma.priceAlert.update({
          where: { id: alert.id },
          data: { lastTriggeredAt: new Date() },
        });
      }
    }
  }
}
