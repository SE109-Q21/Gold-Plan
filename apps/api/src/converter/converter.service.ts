import { Injectable } from '@nestjs/common';
import { GoldBrand } from '@prisma/client';
import { ConverterResultDto } from '@gpls/shared';
import { PriceService } from '../price/price.service';
import { ExchangeRateService } from '../exchange-rate/exchange-rate.service';
import { CalculateQueryDto } from './dto/calculate-query.dto';

const WEIGHT_MAP: Record<string, number> = {
  TAEL: 37.5,
  CHI: 3.75,
  PHAN: 0.375,
  TROY_OZ: 31.103477,
  GRAM: 1.0,
  KILOGRAM: 1000.0,
};

const PURITY_MAP: Record<string, number> = {
  '24K': 1.0,
  '22K': 0.9167,
  '18K': 0.75,
  '14K': 0.5833,
};

const TAEL_GRAMS = 37.5;
const FALLBACK_PRICE_PER_TAEL = 79_000_000;

@Injectable()
export class ConverterService {
  constructor(
    private readonly priceService: PriceService,
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  async calculate(dto: CalculateQueryDto): Promise<ConverterResultDto> {
    const weightInGrams = dto.qty * WEIGHT_MAP[dto.unit];
    const weightInTael = weightInGrams / TAEL_GRAMS;

    // Fetch current prices for the given brand
    const prices = await this.priceService.getCurrentPrices(dto.brand as GoldBrand);
    const matchingEntry = prices.find((p) => p.goldType === dto.goldType);

    const pricePerTaelVnd = matchingEntry?.buyPrice ?? FALLBACK_PRICE_PER_TAEL;
    const priceUpdatedAt = matchingEntry?.recordedAt ?? new Date().toISOString();

    const purityMultiplier = PURITY_MAP[dto.purity];
    const valueVnd = Math.round(weightInTael * pricePerTaelVnd * purityMultiplier);

    const rates = await this.exchangeRateService.getRates();
    const valueUsd = Math.round((valueVnd / rates.usdVnd) * 100) / 100;
    const valueEur = Math.round((valueVnd / rates.eurVnd) * 100) / 100;

    return {
      weightInGrams,
      weightInTael,
      valuations: { VND: valueVnd, USD: valueUsd, EUR: valueEur },
      priceUsed: pricePerTaelVnd,
      priceUpdatedAt,
    };
  }
}
