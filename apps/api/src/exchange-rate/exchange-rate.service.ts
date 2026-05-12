import { Injectable, Logger } from '@nestjs/common';
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

  async getRates(): Promise<ExchangeRateDto> {
    if (this.cache && Date.now() < this.cache.expiresAt) {
      return this.cache.data;
    }

    const apiKey = process.env.EXCHANGE_RATE_API_KEY ?? '';

    if (!apiKey) {
      this.logger.warn('EXCHANGE_RATE_API_KEY not set — using fallback defaults');
      const fallback: ExchangeRateDto = {
        usdVnd: DEFAULT_USD_VND,
        eurVnd: DEFAULT_EUR_VND,
        updatedAt: new Date().toISOString(),
        source: 'fallback',
      };
      this.cache = { data: fallback, expiresAt: Date.now() + CACHE_TTL_MS };
      return fallback;
    }

    try {
      const res = await axios.get<{ rates: Record<string, number> }>(
        `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`,
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
        return { ...this.cache.data, source: 'stale' };
      }
      this.logger.error('Exchange rate fetch failed and no cache available — using fallback defaults');
      return {
        usdVnd: DEFAULT_USD_VND,
        eurVnd: DEFAULT_EUR_VND,
        updatedAt: new Date().toISOString(),
        source: 'fallback',
      };
    }
  }
}
