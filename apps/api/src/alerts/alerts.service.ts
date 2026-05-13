import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PriceAlert, AlertTriggerHistory, AlertStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';

const MAX_ACTIVE_ALERTS = 10;
const MIN_THRESHOLD_PRICE = 100_000n;

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new price alert for the given user.
   * - Validates thresholdPrice >= 100_000n
   * - Limits each user to 10 active alerts
   */
  async createAlert(userId: string, dto: CreateAlertDto): Promise<PriceAlert> {
    if (dto.thresholdPrice < MIN_THRESHOLD_PRICE) {
      throw new BadRequestException(
        `thresholdPrice must be at least ${MIN_THRESHOLD_PRICE}`,
      );
    }

    const activeCount = await this.prisma.priceAlert.count({
      where: { userId, status: AlertStatus.active },
    });

    if (activeCount >= MAX_ACTIVE_ALERTS) {
      throw new BadRequestException(
        `User already has ${MAX_ACTIVE_ALERTS} active alerts. Please deactivate or delete one first.`,
      );
    }

    return this.prisma.priceAlert.create({
      data: {
        userId,
        brand: dto.brand as any,
        goldType: dto.goldType as any,
        condition: dto.condition as any,
        thresholdPrice: dto.thresholdPrice,
        repeatMode: dto.repeatMode ?? false,
      },
    });
  }

  /**
   * Get all alerts for the user with the last 5 trigger history entries each.
   */
  async findAllForUser(userId: string): Promise<PriceAlert[]> {
    return this.prisma.priceAlert.findMany({
      where: { userId },
      include: {
        triggerHistory: {
          orderBy: { triggeredAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Partially update an alert — ownership check first.
   * Throws NotFoundException if alertId not found or not owned by userId.
   */
  async updateAlert(
    userId: string,
    alertId: string,
    dto: UpdateAlertDto,
  ): Promise<PriceAlert> {
    const existing = await this.prisma.priceAlert.findFirst({
      where: { id: alertId, userId },
    });

    if (!existing) {
      throw new NotFoundException(
        `Alert with id "${alertId}" not found or does not belong to user.`,
      );
    }

    const data: Record<string, unknown> = {};
    if (dto.brand !== undefined) data['brand'] = dto.brand;
    if (dto.goldType !== undefined) data['goldType'] = dto.goldType;
    if (dto.condition !== undefined) data['condition'] = dto.condition;
    if (dto.thresholdPrice !== undefined) data['thresholdPrice'] = dto.thresholdPrice;
    if (dto.repeatMode !== undefined) data['repeatMode'] = dto.repeatMode;

    return this.prisma.priceAlert.update({
      where: { id: alertId },
      data,
    });
  }

  /**
   * Toggle ACTIVE <-> INACTIVE.
   * active → inactive, inactive → active, triggered → active
   */
  async toggleAlert(userId: string, alertId: string): Promise<PriceAlert> {
    const existing = await this.prisma.priceAlert.findFirst({
      where: { id: alertId, userId },
    });

    if (!existing) {
      throw new NotFoundException(
        `Alert with id "${alertId}" not found or does not belong to user.`,
      );
    }

    let newStatus: AlertStatus;
    if (existing.status === AlertStatus.active) {
      newStatus = AlertStatus.inactive;
    } else {
      // both inactive and triggered → active
      newStatus = AlertStatus.active;
    }

    return this.prisma.priceAlert.update({
      where: { id: alertId },
      data: { status: newStatus },
    });
  }

  /**
   * Hard delete an alert with ownership check.
   */
  async deleteAlert(userId: string, alertId: string): Promise<void> {
    const existing = await this.prisma.priceAlert.findFirst({
      where: { id: alertId, userId },
    });

    if (!existing) {
      throw new NotFoundException(
        `Alert with id "${alertId}" not found or does not belong to user.`,
      );
    }

    await this.prisma.priceAlert.delete({ where: { id: alertId } });
  }

  /**
   * Get all trigger history for the user's alerts, newest first, paginated.
   */
  async getHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<AlertTriggerHistory[]> {
    const skip = (page - 1) * limit;

    return this.prisma.alertTriggerHistory.findMany({
      where: {
        alert: { userId },
      },
      orderBy: { triggeredAt: 'desc' },
      skip,
      take: limit,
    });
  }
}
