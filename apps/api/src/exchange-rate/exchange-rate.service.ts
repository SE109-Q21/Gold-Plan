import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import axios from 'axios';
import { ExchangeRateDto } from '@gpls/shared';

const CACHE_TTL_MS = 15 * 60_000; // 15 minutes

const DEFAULT_USD_VND = 25_480;
const DEFAULT_EUR_VND = 27_900;

interface CacheEntry {
  data: ExchangeRateDto;
  expiresAt: number;
}

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private cache: CacheEntry | null = null;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  @Cron('0 */15 * * * *')
  async refresh(): Promise<void> {
    const prev = this.cache?.data;
    await this.getRates();
    const next = this.cache?.data;
    if (next && (prev?.usdVnd !== next.usdVnd || prev?.eurVnd !== next.eurVnd)) {
      this.eventEmitter.emit('exchange-rate.updated', next);
    }
  }

  async getRates(): Promise<ExchangeRateDto> {
    if (this.cache && Date.now() < this.cache.expiresAt) {
      return this.cache.data;
    }

    try {
      const res = await axios.get<{ rates: Record<string, number> }>(
        'https://open.er-api.com/v6/latest/USD',
        { timeout: 8_000 },
      );

      const usdVnd = res.data.rates['VND'] ?? DEFAULT_USD_VND;
      const eurVnd = res.data.rates['EUR']
        ? Math.round(usdVnd / res.data.rates['EUR'])
        : DEFAULT_EUR_VND;

      const dto: ExchangeRateDto = {
        usdVnd,
        eurVnd,
        updatedAt: new Date().toISOString(),
        source: 'live',
      };

      this.cache = { data: dto, expiresAt: Date.now() + CACHE_TTL_MS };
      this.logger.log(`Exchange rates fetched: USD→VND=${usdVnd}, EUR→VND=${eurVnd}`);
      return dto;
    } catch (err) {
      if (this.cache) {
        this.logger.warn('Exchange rate fetch failed; serving stale cache');
        return { ...this.cache.data, source: 'stale', updatedAt: new Date().toISOString() };
      }
      this.logger.error('Exchange rate fetch failed and no cache available — using fallback defaults');
      const fallback: ExchangeRateDto = {
        usdVnd: DEFAULT_USD_VND,
        eurVnd: DEFAULT_EUR_VND,
        updatedAt: new Date().toISOString(),
        source: 'fallback',
      };
      // Cache fallback for 2 minutes so we don't spam the API on every request
      this.cache = { data: fallback, expiresAt: Date.now() + 2 * 60_000 };
      return fallback;
    }
  }
}
