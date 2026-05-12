export type GoldBrand = 'SJC' | 'DOJI' | 'PNJ' | 'BAO_TIN';

export type GoldType = 'MIEN_SJC' | 'NHAN_9999' | 'VANG_24K' | 'VANG_18K';

export type PriceStatus = 'live' | 'recent' | 'outdated';

export type HeatCategory = 'cold' | 'warm' | 'hot';

export interface DomesticPriceDto {
  brand: GoldBrand;
  goldType: GoldType;
  buyPrice: number;   // VND, stored as number in DTO (BigInt serialised)
  sellPrice: number;
  recordedAt: string; // ISO string
  status: PriceStatus;
  changePercent: number | null;
}

export interface InternationalPriceDto {
  spotPriceUsd: number;
  spotPriceVnd: number;
  exchangeRate: number;
  recordedAt: string;
}

export interface HeatIndexDto {
  value: number;           // 0–100
  category: HeatCategory;
  priceVelocity: number;   // normalised 0–100
  spreadSize: number;      // VND
  thresholdCrossings: number;
  calculatedAt: string;
}

export interface SpreadDto {
  brand: GoldBrand;
  goldType: GoldType;
  spreadVnd: number;
  spreadPercent: number;
  crawlSessionId: string;
}

export interface ChartPointDto {
  recordedAt: string;
  buyPrice: number;
  sellPrice: number;
}

export interface ComparisonBrandDto {
  brand: GoldBrand;
  buyPrice: number;
  sellPrice: number;
  isBestBuy: boolean;
  isBestSell: boolean;
  crawlSessionId: string;
}

export interface ComparisonRowDto {
  goldType: GoldType;
  brands: ComparisonBrandDto[];
}

export interface ExchangeRateDto {
  usdVnd: number;
  eurVnd: number;
  updatedAt: string; // ISO string
  source: string;    // 'live' | 'stale' | 'fallback'
}

export interface SpreadRankingDto {
  brand: GoldBrand;
  goldType: GoldType;
  buyPrice: number;
  sellPrice: number;
  spreadVnd: number;
  spreadPct: number;
  isMostEfficient: boolean;
}

export interface ConverterResultDto {
  weightInGrams: number;
  weightInTael: number;
  valuations: { VND: number; USD: number; EUR: number };
  priceUsed: number;      // pricePerTaelVnd used
  priceUpdatedAt: string; // ISO string from when price was fetched
}
