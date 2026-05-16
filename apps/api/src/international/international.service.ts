import { Injectable, Logger } from '@nestjs/common';
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

  async getInternationalPrice(): Promise<InternationalPriceDto> {
    if (this.cache && Date.now() < this.cache.expiresAt) {
      return this.cache.data;
    }

    try {
      const goldApiKey = process.env.GOLD_API_KEY ?? '';
      const exchangeApiKey = process.env.EXCHANGE_RATE_API_KEY ?? '';

      const [goldRes, fxRes] = await Promise.all([
        axios.get<{ price: number; currency: string }>(
          `https://www.goldapi.io/api/XAU/USD`,
          { headers: { 'x-access-token': goldApiKey }, timeout: 8_000 },
        ),
        axios.get<{ rates: Record<string, number> }>(
          `https://v6.exchangerate-api.com/v6/${exchangeApiKey}/latest/USD`,
          { timeout: 8_000 },
        ),
      ]);

      const spotPriceUsd = goldRes.data.price;
      // exchangerate-api returns rates relative to USD base, so rates['EUR'] = EUR per 1 USD
      const usdVnd = fxRes.data.rates['VND'] ?? 25_000;
      const eurPerUsd = fxRes.data.rates['EUR'] ?? 0.92;
      const spotPriceEur = spotPriceUsd * eurPerUsd;
      const exchangeRate = usdVnd;
      const dto = this.buildDto(spotPriceUsd, spotPriceEur, exchangeRate);

      this.cache = { data: dto, expiresAt: Date.now() + CACHE_TTL_MS };
      this.logger.log(`International price fetched: $${spotPriceUsd} / €${dto.spotPriceEur}`);
      return dto;
    } catch (err) {
      if (this.cache) {
        this.logger.warn('International price fetch failed; serving stale cache');
        return this.cache.data;
      }
      throw err;
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
