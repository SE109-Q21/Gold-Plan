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

    const goldApiKey = process.env.GOLD_API_KEY || '';
    const exchangeApiKey = process.env.EXCHANGE_RATE_API_KEY || '';

    if (!goldApiKey) {
      this.logger.warn('GOLD_API_KEY not set — using fallback international price');
      const dto = this.buildDto(2_345, 2_345 * 0.92, 25_480);
      this.cache = { data: dto, expiresAt: Date.now() + CACHE_TTL_MS };
      return dto;
    }

    try {
      let spotPriceUsd: number;
      let usdVnd = 25_480;
      let eurPerUsd = 0.92;

      const goldRes = await axios.get<{ price: number; currency: string }>(
        `https://www.goldapi.io/api/XAU/USD`,
        { headers: { 'x-access-token': goldApiKey }, timeout: 8_000 },
      );
      spotPriceUsd = goldRes.data.price;

      if (exchangeApiKey) {
        try {
          const fxRes = await axios.get<{ rates: Record<string, number> }>(
            `https://v6.exchangerate-api.com/v6/${exchangeApiKey}/latest/USD`,
            { timeout: 8_000 },
          );
          usdVnd = fxRes.data.rates['VND'] ?? usdVnd;
          eurPerUsd = fxRes.data.rates['EUR'] ?? eurPerUsd;
        } catch {
          this.logger.warn('Exchange rate fetch failed — using fallback rates');
        }
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
