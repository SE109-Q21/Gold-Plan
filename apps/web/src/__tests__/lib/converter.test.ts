import { describe, it, expect } from 'vitest';
import {
  calculateConversion,
  WEIGHT_TO_GRAMS,
  PURITY_MULTIPLIER,
} from '@/lib/converter.api';

const RATES = { usdVnd: 25_000, eurVnd: 27_000 };

describe('WEIGHT_TO_GRAMS constants', () => {
  it('1 TAEL = 37.5 grams', () => {
    expect(WEIGHT_TO_GRAMS.TAEL).toBe(37.5);
  });

  it('1 CHI = 3.75 grams (1/10 of a tael)', () => {
    expect(WEIGHT_TO_GRAMS.CHI).toBe(3.75);
  });

  it('1 PHAN = 0.375 grams (1/100 of a tael)', () => {
    expect(WEIGHT_TO_GRAMS.PHAN).toBe(0.375);
  });

  it('1 GRAM = 1.0 gram', () => {
    expect(WEIGHT_TO_GRAMS.GRAM).toBe(1.0);
  });

  it('1 KILOGRAM = 1000 grams', () => {
    expect(WEIGHT_TO_GRAMS.KILOGRAM).toBe(1000);
  });
});

describe('PURITY_MULTIPLIER constants', () => {
  it('24K = 1.0 (pure gold)', () => {
    expect(PURITY_MULTIPLIER['24K']).toBe(1.0);
  });

  it('18K = 0.75', () => {
    expect(PURITY_MULTIPLIER['18K']).toBe(0.75);
  });

  it('14K = 0.5833', () => {
    expect(PURITY_MULTIPLIER['14K']).toBe(0.5833);
  });
});

describe('calculateConversion', () => {
  it('1 TAEL 24K at 100M VND/tael → 100M VND, correct USD and EUR', () => {
    const result = calculateConversion('TAEL', 1, '24K', 100_000_000, RATES);
    expect(result.weightInGrams).toBe(37.5);
    expect(result.weightInTael).toBe(1);
    expect(result.valuations.VND).toBe(100_000_000);
    expect(result.valuations.USD).toBe(4000);
    expect(result.valuations.EUR).toBeCloseTo(3703.7, 0);
  });

  it('applies 18K purity multiplier (75% of 24K value)', () => {
    const result = calculateConversion('TAEL', 1, '18K', 100_000_000, RATES);
    expect(result.valuations.VND).toBe(75_000_000);
  });

  it('10 CHI = 1 TAEL → same weight and value as 1 TAEL', () => {
    const chi = calculateConversion('CHI', 10, '24K', 100_000_000, RATES);
    const tael = calculateConversion('TAEL', 1, '24K', 100_000_000, RATES);
    expect(chi.weightInGrams).toBe(tael.weightInGrams);
    expect(chi.weightInTael).toBe(tael.weightInTael);
    expect(chi.valuations.VND).toBe(tael.valuations.VND);
  });

  it('100 PHAN = 1 TAEL', () => {
    const phan = calculateConversion('PHAN', 100, '24K', 100_000_000, RATES);
    expect(phan.weightInGrams).toBe(37.5);
    expect(phan.valuations.VND).toBe(100_000_000);
  });

  it('1 KILOGRAM = 1000 grams → correct tael weight', () => {
    const result = calculateConversion('KILOGRAM', 1, '24K', 100_000_000, RATES);
    expect(result.weightInGrams).toBe(1000);
    expect(result.weightInTael).toBeCloseTo(26.667, 2);
  });

  it('unknown unit falls back to 1 gram per unit', () => {
    const result = calculateConversion('UNKNOWN_UNIT', 1, '24K', 100_000_000, RATES);
    expect(result.weightInGrams).toBe(1);
    expect(result.weightInTael).toBeCloseTo(1 / 37.5, 5);
  });

  it('unknown purity falls back to multiplier 1.0', () => {
    const known = calculateConversion('TAEL', 1, '24K', 100_000_000, RATES);
    const unknown = calculateConversion('TAEL', 1, 'UNKNOWN_PURITY', 100_000_000, RATES);
    expect(unknown.valuations.VND).toBe(known.valuations.VND);
  });

  it('zero quantity returns zero value and weight', () => {
    const result = calculateConversion('TAEL', 0, '24K', 100_000_000, RATES);
    expect(result.weightInGrams).toBe(0);
    expect(result.valuations.VND).toBe(0);
    expect(result.valuations.USD).toBe(0);
    expect(result.valuations.EUR).toBe(0);
  });

  it('reflects priceUsed in the result', () => {
    const result = calculateConversion('TAEL', 1, '24K', 99_500_000, RATES);
    expect(result.priceUsed).toBe(99_500_000);
  });
});
