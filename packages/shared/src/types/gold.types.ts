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

// ─── Plan 4: DCA ─────────────────────────────────────────────────────────────

export interface DcaDataPointDto {
  date: string;
  price: number;
  cumulativeGold: number;
  cumulativeSpent: number;
  cumulativeValue: number;
  lumpSumValue: number;
}

export interface DcaResultDto {
  averageCostVnd: number;
  totalGoldTael: number;
  totalSpentVnd: number;
  currentValueVnd: number;
  dcaPnlVnd: number;
  dcaPnlPct: number;
  lumpSumCostVnd: number;
  lumpSumCurrentValueVnd: number;
  lumpSumPnlPct: number;
  dataPoints: DcaDataPointDto[];
}

// ─── Plan 6: Alerts & Admin ──────────────────────────────────────────────────

export interface PriceAlertDto {
  id: string;
  userId: string;
  brand: GoldBrand;
  goldType: GoldType;
  thresholdPrice: string;  // BigInt serialized as string for JSON
  condition: 'lte' | 'gte';
  status: 'active' | 'triggered' | 'inactive';
  repeatMode: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
  history?: AlertTriggerHistoryDto[];
}

export interface AlertTriggerHistoryDto {
  id: string;
  alertId: string;
  triggeredAt: string;
  priceAtTrigger: string;  // BigInt as string
  emailSentAt: string | null;
}

export interface CreateAlertDto {
  brand: GoldBrand;
  goldType: GoldType;
  condition: 'lte' | 'gte';
  thresholdPrice: number;  // number on frontend, converted to BigInt on backend
  repeatMode?: boolean;
}

export interface AdminStatsDto {
  totalUsers: number;
  activeUsers: number;
  alertsSentToday: number;
  crawlSuccessRate: number;
  dataSources: DataSourceStatusDto[];
}

export interface DataSourceStatusDto {
  id: string;
  name: string;
  brand: GoldBrand;
  url: string;
  isActive: boolean;
  lastCrawledAt: string | null;
  lastStatus: string | null;
}

export interface DataSourceAdminDto extends DataSourceStatusDto {
  crawlType: string;
  frequencyMin: number;
  createdAt: string;
}

export interface AnomalyRecordDto {
  id: string;
  brand: GoldBrand;
  goldType: GoldType;
  buyPrice: string;
  sellPrice: string;
  recordedAt: string;
  isAnomalous: boolean;
  anomalyReason: string | null;
  anomalyReview: {
    action: string;
    reviewedAt: string;
    reviewedBy: string;
  } | null;
}

export interface AdminUserDto {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  role: string;
  createdAt: string;
  alertCount: number;
}

// ─── Plan 7: Portfolio ────────────────────────────────────────────────────────

export interface PortfolioTransactionDto {
  id: string;
  userId: string;
  type: 'BUY' | 'SELL';
  brand: string;
  goldType: string;
  quantity: number;
  pricePerTael: number;
  transactedAt: string;
  note: string | null;
}

export interface PortfolioHoldingDto {
  brand: string;
  goldType: string;
  netQty: number;
  avgCostPerTael: number;
  currentBuyPrice: number;
  currentValueVnd: number;
  costBasisVnd: number;
  pnlVnd: number;
  pnlPct: number;
}

export interface PortfolioSummaryDto {
  holdings: PortfolioHoldingDto[];
  totalValueVnd: number;
  totalCostVnd: number;
  totalPnlVnd: number;
  totalPnlPct: number;
}

export interface PortfolioChartPointDto {
  date: string;
  valueVnd: number;
}

export interface AllocationBreakdownDto {
  byBrand: { brand: string; pct: number }[];
  byGoldType: { goldType: string; pct: number }[];
}

export interface PaginatedDto<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Plan 7: Personalisation ──────────────────────────────────────────────────

export interface PersonalisationItemDto {
  brand: string;
  goldType: string;
  viewCount: number;
  isPinned: boolean;
  pinOrder: number | null;
}

// ─── Plan 7: Browsing History ─────────────────────────────────────────────────

export interface BrowsingContextDto {
  lastViewedAt: string;
  deltaPct: number | null;
}

export interface BrowsingHistoryItemDto {
  id: string;
  brand: string;
  goldType: string;
  buyPrice: number;
  viewedAt: string;
}
