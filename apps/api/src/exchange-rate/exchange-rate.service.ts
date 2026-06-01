import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import axios from 'axios';
import { ExchangeRateDto } from '@gpls/shared';

const CACHE_TTL_MS = 15 * 60_000; // 15 minutes

const DEFAULT_USD_VND = 25_480;
const DEFAULT_EUR_VND = 27_900;

const CURRENCY_RATE_CONFIG = [
  { code: 'AUD', usdRatio: 0.7066, spreadPct: 0.0206 },
  {
    code: 'EUR',
    usdRatio: DEFAULT_EUR_VND / DEFAULT_USD_VND,
    spreadPct: 0.0489,
  },
  { code: 'JPY', usdRatio: 0.00611, spreadPct: 0.031 },
  { code: 'USD', usdRatio: 1, spreadPct: 0.0119 },
] as const;

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
    if (
      next &&
      (prev?.usdVnd !== next.usdVnd || prev?.eurVnd !== next.eurVnd)
    ) {
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
        currencyRates: this.buildCurrencyRates(res.data.rates, usdVnd, eurVnd),
        updatedAt: new Date().toISOString(),
        source: 'live',
      };

      this.cache = { data: dto, expiresAt: Date.now() + CACHE_TTL_MS };
      this.logger.log(
        `Exchange rates fetched: USD→VND=${usdVnd}, EUR→VND=${eurVnd}`,
      );
      return dto;
    } catch {
      if (this.cache) {
        this.logger.warn('Exchange rate fetch failed; serving stale cache');
        return {
          ...this.cache.data,
          source: 'stale',
          updatedAt: new Date().toISOString(),
        };
      }
      this.logger.error(
        'Exchange rate fetch failed and no cache available — using fallback defaults',
      );
      const fallback: ExchangeRateDto = {
        usdVnd: DEFAULT_USD_VND,
        eurVnd: DEFAULT_EUR_VND,
        currencyRates: this.buildCurrencyRates(
          {},
          DEFAULT_USD_VND,
          DEFAULT_EUR_VND,
        ),
        updatedAt: new Date().toISOString(),
        source: 'fallback',
      };
      // Cache fallback for 2 minutes so we don't spam the API on every request
      this.cache = { data: fallback, expiresAt: Date.now() + 2 * 60_000 };
      return fallback;
    }
  }

  private buildCurrencyRates(
    providerRates: Record<string, number>,
    usdVnd: number,
    eurVnd: number,
  ): ExchangeRateDto['currencyRates'] {
    return CURRENCY_RATE_CONFIG.map((currency) => {
      const usdRatio =
        currency.code === 'USD'
          ? 1
          : currency.code === 'EUR'
            ? eurVnd / usdVnd
            : providerRates[currency.code]
              ? 1 / providerRates[currency.code]
              : currency.usdRatio;
      const midRate = usdVnd * usdRatio;
      const buyRate = midRate * (1 - currency.spreadPct / 2);
      const sellRate = midRate * (1 + currency.spreadPct / 2);

      return {
        code: currency.code,
        buyRate,
        sellRate,
      };
    });
  }
}
