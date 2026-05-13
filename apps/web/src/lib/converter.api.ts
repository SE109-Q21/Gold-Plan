import type { ExchangeRateDto, ConverterResultDto } from '@gpls/shared';

export const WEIGHT_TO_GRAMS: Record<string, number> = {
  TAEL: 37.5,
  CHI: 3.75,
  PHAN: 0.375,
  TROY_OZ: 31.103477,
  GRAM: 1.0,
  KILOGRAM: 1000.0,
};

export const PURITY_MULTIPLIER: Record<string, number> = {
  '24K': 1.0,
  '22K': 0.9167,
  '18K': 0.75,
  '14K': 0.5833,
};

export function calculateConversion(
  unit: string,
  qty: number,
  purity: string,
  pricePerTaelVnd: number,
  rates: Pick<ExchangeRateDto, 'usdVnd' | 'eurVnd'>,
): ConverterResultDto {
  const weightInGrams = qty * (WEIGHT_TO_GRAMS[unit] ?? 1);
  const weightInTael = weightInGrams / 37.5;
  const purityMult = PURITY_MULTIPLIER[purity] ?? 1;
  const valueVnd = Math.round(weightInTael * pricePerTaelVnd * purityMult);
  const valueUsd = Math.round((valueVnd / rates.usdVnd) * 100) / 100;
  const valueEur = Math.round((valueVnd / rates.eurVnd) * 100) / 100;

  return {
    weightInGrams,
    weightInTael,
    valuations: { VND: valueVnd, USD: valueUsd, EUR: valueEur },
    priceUsed: pricePerTaelVnd,
    priceUpdatedAt: new Date().toISOString(),
  };
}
