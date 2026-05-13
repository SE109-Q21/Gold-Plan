import { Injectable, BadRequestException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';

export interface PersonalisationItemDto {
  brand: string;
  goldType: string;
  viewCount: number;
  isPinned: boolean;
  pinOrder: number | null;
}

@Injectable()
export class PersonalisationService {
  constructor(private readonly prisma: PrismaService) {}

  recordView(userId: string, brand: string, goldType: string): void {
    setImmediate(async () => {
      await this.prisma.userPreference.upsert({
        where: { userId_brand_goldType: { userId, brand: brand as any, goldType: goldType as any } },
        create: { userId, brand: brand as any, goldType: goldType as any, viewCount: 1 },
        update: { viewCount: { increment: 1 } },
      });
      await this.prisma.behavioralEvent.create({
        data: { userId, brand: brand as any, goldType: goldType as any, eventType: 'view' },
      });
    });
  }

  async getTableOrder(userId: string): Promise<PersonalisationItemDto[]> {
    const rows = await this.prisma.userPreference.findMany({
      where: { userId },
    });

    return rows
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        if (a.isPinned && b.isPinned) {
          return (a.pinOrder ?? 0) - (b.pinOrder ?? 0);
        }
        return b.viewCount - a.viewCount;
      })
      .map((row) => ({
        brand: row.brand,
        goldType: row.goldType,
        viewCount: row.viewCount,
        isPinned: row.isPinned,
        pinOrder: row.pinOrder,
      }));
  }

  async addPin(userId: string, brand: string, goldType: string): Promise<void> {
    const pinnedCount = await this.prisma.userPreference.count({
      where: { userId, isPinned: true },
    });

    if (pinnedCount >= 5) {
      throw new BadRequestException('Maximum 5 pins allowed');
    }

    const maxPinOrderRow = await this.prisma.userPreference.findFirst({
      where: { userId, isPinned: true },
      orderBy: { pinOrder: 'desc' },
    });

    const nextPinOrder = maxPinOrderRow?.pinOrder != null ? maxPinOrderRow.pinOrder + 1 : 0;

    await this.prisma.userPreference.upsert({
      where: { userId_brand_goldType: { userId, brand: brand as any, goldType: goldType as any } },
      create: { userId, brand: brand as any, goldType: goldType as any, isPinned: true, pinOrder: nextPinOrder },
      update: { isPinned: true, pinOrder: nextPinOrder },
    });
  }

  async removePin(userId: string, brand: string, goldType: string): Promise<void> {
    const row = await this.prisma.userPreference.findUnique({
      where: { userId_brand_goldType: { userId, brand: brand as any, goldType: goldType as any } },
    });

    if (!row) return;

    await this.prisma.userPreference.update({
      where: { userId_brand_goldType: { userId, brand: brand as any, goldType: goldType as any } },
      data: { isPinned: false, pinOrder: null },
    });
  }

  async reorderPins(userId: string, order: Array<{ brand: string; goldType: string }>): Promise<void> {
    await Promise.all(
      order.map((item, index) =>
        this.prisma.userPreference.updateMany({
          where: { userId, brand: item.brand as any, goldType: item.goldType as any },
          data: { pinOrder: index },
        }),
      ),
    );
  }

  async resetPreferences(userId: string): Promise<void> {
    await this.prisma.userPreference.deleteMany({ where: { userId } });
  }

  @Cron('0 3 * * *')
  async cleanupOldBehavioralEvents(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    await this.prisma.behavioralEvent.deleteMany({
      where: { occurredAt: { lt: cutoff } },
    });
  }
}
