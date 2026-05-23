import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { AlertStatus, GoldBrand, GoldType, SmartAlert } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { WebPushService } from '../push/web-push.service';
import { CreateSmartAlertDto } from './dto/create-smart-alert.dto';

const MAX_COMBINED_ALERTS = 10;

type SmartAlertWithNL = SmartAlert & { naturalLanguage: string };

@Injectable()
export class SmartAlertsService {
  private readonly logger = new Logger(SmartAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly webPushService: WebPushService,
  ) {}

  async createSmartAlert(
    userId: string,
    dto: CreateSmartAlertDto,
  ): Promise<SmartAlertWithNL> {
    const [priceAlertCount, smartAlertCount] = await Promise.all([
      this.prisma.priceAlert.count({ where: { userId, status: AlertStatus.active } }),
      this.prisma.smartAlert.count({ where: { userId, status: AlertStatus.active } }),
    ]);

    if (priceAlertCount + smartAlertCount >= MAX_COMBINED_ALERTS) {
      throw new BadRequestException(
        `You have reached the maximum of ${MAX_COMBINED_ALERTS} active alerts.`,
      );
    }

    const alert = await this.prisma.smartAlert.create({
      data: {
        userId,
        brand: dto.brand as any,
        goldType: dto.goldType as any,
        condition1: dto.condition1 as any,
        condition2: dto.condition2 ? (dto.condition2 as any) : undefined,
      },
    });

    return this.attachNaturalLanguage(alert);
  }

  async getUserAlerts(userId: string): Promise<SmartAlertWithNL[]> {
    const alerts = await this.prisma.smartAlert.findMany({
      where: {
        userId,
        status: { not: AlertStatus.triggered },
      },
      orderBy: { createdAt: 'desc' },
    });

    return alerts.map((a) => this.attachNaturalLanguage(a));
  }

  async toggleAlert(userId: string, id: string): Promise<SmartAlertWithNL> {
    const alert = await this.prisma.smartAlert.findFirst({
      where: { id, userId },
    });

    if (!alert) {
      throw new NotFoundException(
        `SmartAlert with id "${id}" not found or does not belong to user.`,
      );
    }

    const newStatus =
      alert.status === AlertStatus.active
        ? AlertStatus.inactive
        : AlertStatus.active;

    const updated = await this.prisma.smartAlert.update({
      where: { id },
      data: { status: newStatus },
    });

    return this.attachNaturalLanguage(updated);
  }

  async deleteAlert(userId: string, id: string): Promise<void> {
    const alert = await this.prisma.smartAlert.findFirst({
      where: { id, userId },
    });

    if (!alert) {
      throw new NotFoundException(
        `SmartAlert with id "${id}" not found or does not belong to user.`,
      );
    }

    await this.prisma.smartAlert.delete({ where: { id } });
  }

  @Cron('*/5 * * * *')
  async evaluate(): Promise<void> {
    const activeAlerts = await this.prisma.smartAlert.findMany({
      where: { status: AlertStatus.active },
    });

    for (const alert of activeAlerts) {
      try {
        const records = await this.prisma.priceRecord.findMany({
          where: {
            brand: alert.brand,
            goldType: alert.goldType,
            isAnomalous: false,
          },
          orderBy: { recordedAt: 'desc' },
          take: 10,
          select: { buyPrice: true, sellPrice: true },
        });

        const cond1 = alert.condition1 as { type: string; params: any };
        const cond2 = alert.condition2 as
          | { type: string; params: any }
          | null
          | undefined;

        const fired =
          this.evaluateCondition(cond1, records) &&
          (!cond2 || this.evaluateCondition(cond2, records));

        if (fired) {
          await this.prisma.smartAlert.update({
            where: { id: alert.id },
            data: { status: AlertStatus.triggered, lastFiredAt: new Date() },
          });

          const user = await this.prisma.user.findUnique({
            where: { id: alert.userId },
            select: { email: true },
          });

          if (user) {
            const chartSvg = await this.buildPriceChartSvg(alert.brand, alert.goldType);
            await this.mailService.sendAlertEmail(user.email, {
              brand: alert.brand,
              goldType: alert.goldType,
              condition: 'smart',
              thresholdPrice: BigInt(0),
              currentPrice: BigInt(records[0]?.buyPrice ?? 0),
              chartSvg,
            });
            await this.webPushService.sendToUser(alert.userId, {
              title: 'GoldPlan Alert Fired',
              body: this.attachNaturalLanguage(alert).naturalLanguage,
              url: '/alerts',
            }).catch(() => {});
          }
        }
      } catch (err) {
        this.logger.error(
          `evaluate: error processing alert ${alert.id}: ${(err as Error).message}`,
        );
      }
    }
  }

  @OnEvent('price.updated')
  async onPriceUpdated(event: { brand: string; goldType: string }): Promise<void> {
    const activeAlerts = await this.prisma.smartAlert.findMany({
      where: {
        status: AlertStatus.active,
        brand: event.brand as any,
        goldType: event.goldType as any,
      },
    });

    for (const alert of activeAlerts) {
      try {
        const records = await this.prisma.priceRecord.findMany({
          where: { brand: alert.brand, goldType: alert.goldType, isAnomalous: false },
          orderBy: { recordedAt: 'desc' },
          take: 10,
          select: { buyPrice: true, sellPrice: true },
        });

        const cond1 = alert.condition1 as { type: string; params: any };
        const cond2 = alert.condition2 as { type: string; params: any } | null | undefined;
        const fired =
          this.evaluateCondition(cond1, records) &&
          (!cond2 || this.evaluateCondition(cond2, records));

        if (fired) {
          await this.prisma.smartAlert.update({
            where: { id: alert.id },
            data: { status: AlertStatus.triggered, lastFiredAt: new Date() },
          });

          const user = await this.prisma.user.findUnique({
            where: { id: alert.userId },
            select: { email: true },
          });

          if (user) {
            const chartSvg = await this.buildPriceChartSvg(alert.brand, alert.goldType);
            await this.mailService.sendAlertEmail(user.email, {
              brand: alert.brand,
              goldType: alert.goldType,
              condition: 'smart',
              thresholdPrice: BigInt(0),
              currentPrice: BigInt(records[0]?.buyPrice ?? 0),
              chartSvg,
            });
            await this.webPushService.sendToUser(alert.userId, {
              title: 'GoldPlan Alert Fired',
              body: this.attachNaturalLanguage(alert).naturalLanguage,
              url: '/alerts',
            }).catch(() => {});
          }
        }
      } catch (err) {
        this.logger.error(`onPriceUpdated: error processing alert ${alert.id}: ${(err as Error).message}`);
      }
    }
  }

  protected evaluateCondition(
    cond: { type: string; params: any },
    records: { buyPrice: bigint; sellPrice: bigint }[],
  ): boolean {
    const buyPrices = records.map((r) => Number(r.buyPrice));
    switch (cond.type) {
      case 'TREND':
        return this.evaluateTrend(buyPrices, cond.params.n, cond.params.direction);
      case 'SPREAD':
        if (records.length === 0) return false;
        return this.evaluateSpread(
          Number(records[0].buyPrice),
          Number(records[0].sellPrice),
          cond.params.thresholdVnd,
        );
      case 'THRESHOLD':
        if (records.length === 0) return false;
        return this.evaluateThreshold(
          Number(records[0].buyPrice),
          cond.params.condition,
          cond.params.priceVnd,
        );
      default:
        return false;
    }
  }

  protected evaluateTrend(
    prices: number[],
    n: number,
    direction: 'up' | 'down',
  ): boolean {
    if (prices.length < n) return false;
    const recent = prices.slice(-n);
    if (direction === 'up')
      return recent.every((p, i) => i === 0 || p > recent[i - 1]);
    return recent.every((p, i) => i === 0 || p < recent[i - 1]);
  }

  protected evaluateSpread(
    buyPrice: number,
    sellPrice: number,
    thresholdVnd: number,
  ): boolean {
    return sellPrice - buyPrice <= thresholdVnd;
  }

  protected evaluateThreshold(
    buyPrice: number,
    condition: 'lte' | 'gte',
    priceVnd: number,
  ): boolean {
    return condition === 'lte' ? buyPrice <= priceVnd : buyPrice >= priceVnd;
  }

  private async buildPriceChartSvg(brand: GoldBrand, goldType: GoldType): Promise<string> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const records = await this.prisma.priceRecord.findMany({
      where: { brand, goldType, isAnomalous: false, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
      select: { buyPrice: true, recordedAt: true },
    });

    if (records.length < 2) return '';

    const prices = records.map((r) => Number(r.buyPrice));
    const min = Math.min(...prices) * 0.999;
    const max = Math.max(...prices) * 1.001;
    const W = 460, H = 100, padX = 10, padTop = 10;

    const points = prices
      .map((p, i) => {
        const x = padX + (i / (prices.length - 1)) * W;
        const y = padTop + H - ((p - min) / (max - min)) * H;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const firstTime = new Date(records[0].recordedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const lastTime = new Date(records[records.length - 1].recordedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 130" width="480" height="130" style="display:block;background:#14141A;border-radius:8px">
  <polyline points="${points}" stroke="#D4AF37" stroke-width="2" fill="none"/>
  <text x="${padX}" y="128" fill="#888" font-size="10" font-family="monospace">${firstTime}</text>
  <text x="${padX + W}" y="128" fill="#888" font-size="10" font-family="monospace" text-anchor="end">${lastTime}</text>
</svg>`;
  }

  private attachNaturalLanguage(alert: SmartAlert): SmartAlertWithNL {
    const cond1 = alert.condition1 as { type: string; params: any };
    const cond2 = alert.condition2 as
      | { type: string; params: any }
      | null
      | undefined;
    const nl = this.generateDescription(
      alert.brand,
      alert.goldType,
      cond1,
      cond2 ?? undefined,
    );
    return { ...alert, naturalLanguage: nl };
  }

  private generateDescription(
    brand: string,
    _goldType: string,
    cond1: { type: string; params: any },
    cond2?: { type: string; params: any },
  ): string {
    const describeOne = (cond: { type: string; params: any }): string => {
      switch (cond.type) {
        case 'TREND':
          return cond.params.direction === 'up'
            ? `${brand} tăng giá ${cond.params.n} lần liên tiếp`
            : `${brand} giảm giá ${cond.params.n} lần liên tiếp`;
        case 'SPREAD':
          return `${brand} chênh lệch mua/bán ≤ ${Number(cond.params.thresholdVnd).toLocaleString('vi-VN')}₫`;
        case 'THRESHOLD':
          return cond.params.condition === 'lte'
            ? `${brand} mua ≤ ${Number(cond.params.priceVnd).toLocaleString('vi-VN')}₫`
            : `${brand} mua ≥ ${Number(cond.params.priceVnd).toLocaleString('vi-VN')}₫`;
        default:
          return `${brand} điều kiện tuỳ chỉnh`;
      }
    };

    const parts = [describeOne(cond1)];
    if (cond2) parts.push(describeOne(cond2));
    return parts.join(' VÀ ');
  }
}
