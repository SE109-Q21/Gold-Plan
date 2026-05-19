import { SjcCrawlerService } from './sjc-crawler.service';
import { PrismaService } from '../database/prisma.service';
import { AnomalyDetectorService } from './anomaly-detector.service';

const mockPrisma = {} as unknown as PrismaService;
const mockDetector = {} as unknown as AnomalyDetectorService;

const SAMPLE_PRICES = {
  SJL1L10: { name: 'SJC 9999',           buy: 85_500_000, sell: 85_520_000, currency: 'VND' },
  SJ9999:  { name: 'SJC Ring',            buy: 83_400_000, sell: 84_100_000, currency: 'VND' },
  XAUUSD:  { name: 'World Gold (XAU/USD)', buy: 4552.9,    sell: 0,          currency: 'USD' },
};

describe('SjcCrawlerService.parseItems', () => {
  let service: SjcCrawlerService;

  beforeEach(() => {
    service = new SjcCrawlerService(mockPrisma, mockDetector);
  });

  it('returns 2 price records from sample prices', () => {
    const result = service.parseItems(SAMPLE_PRICES);
    expect(result).toHaveLength(2);
  });

  it('maps SJL1L10 to MIEN_SJC with correct prices', () => {
    const result = service.parseItems(SAMPLE_PRICES);
    const mien = result.find((r) => r.goldType === 'MIEN_SJC');
    expect(mien).toBeDefined();
    expect(mien!.buyPrice).toBe(85_500_000n);
    expect(mien!.sellPrice).toBe(85_520_000n);
  });

  it('maps SJ9999 to NHAN_9999 with correct prices', () => {
    const result = service.parseItems(SAMPLE_PRICES);
    const nhan = result.find((r) => r.goldType === 'NHAN_9999');
    expect(nhan).toBeDefined();
    expect(nhan!.buyPrice).toBe(83_400_000n);
    expect(nhan!.sellPrice).toBe(84_100_000n);
  });

  it('ignores unknown type codes', () => {
    const result = service.parseItems({ XAUUSD: { name: 'x', buy: 1, sell: 2, currency: 'USD' } });
    expect(result).toHaveLength(0);
  });

  it('deduplicates same goldType, keeping first occurrence', () => {
    const prices = {
      SJL1L10: { name: 'first',  buy: 100, sell: 200, currency: 'VND' },
      SJL1L10_DUP: { name: 'second', buy: 300, sell: 400, currency: 'VND' },
    };
    // Override map won't have SJL1L10_DUP, so only 1 result
    const result = service.parseItems(prices);
    expect(result).toHaveLength(1);
    expect(result[0].buyPrice).toBe(100n);
  });

  it('returns empty array for empty input', () => {
    expect(service.parseItems({})).toHaveLength(0);
  });
});
