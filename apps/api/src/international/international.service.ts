import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import axios from 'axios';

const TAEL_PER_TROY_OZ = 37.5 / 31.1035;
const CACHE_TTL_MS = 5 * 60_000;

export interface InternationalPriceDto {
  spotPriceUsd: number;
  spotPriceEur: number;
  spotPriceVnd: number;
  exchangeRate: number;
  recordedAt: string;
}

interface CacheEntry {
  data: InternationalPriceDto;
  expiresAt: number;
}

@Injectable()
export class InternationalService {
  private readonly logger = new Logger(InternationalService.name);
  private cache: CacheEntry | null = null;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  @Cron('0 */5 * * * *')
  async refresh(): Promise<void> {
    const prevPrice = this.cache?.data.spotPriceUsd;
    await this.getInternationalPrice();
    const next = this.cache?.data;
    if (next && next.spotPriceUsd !== prevPrice) {
      this.eventEmitter.emit('international-price.updated', next);
    }
  }

  async getInternationalPrice(): Promise<InternationalPriceDto> {
    if (this.cache && Date.now() < this.cache.expiresAt) {
      return this.cache.data;
    }

    try {
      let usdVnd = 25_480;
      let eurPerUsd = 0.92;

      const goldRes = await axios.get<{ price: number; currency: string }>(
        'https://api.gold-api.com/price/XAU',
        { timeout: 8_000 },
      );
      const spotPriceUsd: number = goldRes.data.price;

      try {
        const fxRes = await axios.get<{ rates: Record<string, number> }>(
          'https://open.er-api.com/v6/latest/USD',
          { timeout: 8_000 },
        );
        usdVnd = fxRes.data.rates['VND'] ?? usdVnd;
        eurPerUsd = fxRes.data.rates['EUR'] ?? eurPerUsd;
      } catch {
        this.logger.warn('Exchange rate fetch failed — using fallback rates');
      }

      const spotPriceEur = spotPriceUsd * eurPerUsd;
      const dto = this.buildDto(spotPriceUsd, spotPriceEur, usdVnd);
      this.cache = { data: dto, expiresAt: Date.now() + CACHE_TTL_MS };
      this.logger.log(`International price fetched: $${spotPriceUsd} / €${dto.spotPriceEur}`);
      return dto;
    } catch (err) {
      if (this.cache) {
        this.logger.warn('International price fetch failed; serving stale cache');
        return this.cache.data;
      }
      this.logger.error('International price fetch failed and no cache — using fallback defaults');
      const dto = this.buildDto(2_345, 2_345 * 0.92, 25_480);
      this.cache = { data: dto, expiresAt: Date.now() + CACHE_TTL_MS };
      return dto;
    }
  }

  private buildDto(spotPriceUsd: number, spotPriceEur: number, exchangeRate: number): InternationalPriceDto {
    return {
      spotPriceUsd,
      spotPriceEur: Math.round(spotPriceEur * 100) / 100,
      spotPriceVnd: Math.round(spotPriceUsd * TAEL_PER_TROY_OZ * exchangeRate),
      exchangeRate,
      recordedAt: new Date().toISOString(),
    };
  }
}
