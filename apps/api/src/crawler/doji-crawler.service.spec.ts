import { DojiCrawlerService } from './doji-crawler.service';
import { PrismaService } from '../database/prisma.service';
import { AnomalyDetectorService } from './anomaly-detector.service';

const mockPrisma = {} as unknown as PrismaService;
const mockDetector = {} as unknown as AnomalyDetectorService;

const SAMPLE_PRICES = {
  DOHNL:    { name: 'DOJI Hanoi', buy: 85_200_000, sell: 85_380_000, currency: 'VND' },
  DOHCML:   { name: 'DOJI HCM',   buy: 85_100_000, sell: 85_300_000, currency: 'VND' },
  DOJINHTV: { name: 'DOJI Jewelry', buy: 83_200_000, sell: 83_850_000, currency: 'VND' },
  XAUUSD:   { name: 'World Gold',  buy: 4552.9,    sell: 0,           currency: 'USD' },
};

describe('DojiCrawlerService.parseItems', () => {
  let service: DojiCrawlerService;

  beforeEach(() => {
    service = new DojiCrawlerService(mockPrisma, mockDetector);
  });

  it('returns 2 records (DOHNL/DOHCML deduplicated to one MIEN_SJC)', () => {
    const result = service.parseItems(SAMPLE_PRICES);
    expect(result).toHaveLength(2);
  });

  it('maps DOHNL to MIEN_SJC (first of the two HN/HCM entries)', () => {
    const result = service.parseItems(SAMPLE_PRICES);
    const mien = result.find((r) => r.goldType === 'MIEN_SJC');
    expect(mien).toBeDefined();
    expect(mien!.buyPrice).toBe(85_200_000n);
    expect(mien!.sellPrice).toBe(85_380_000n);
  });

  it('maps DOJINHTV to NHAN_9999 with correct prices', () => {
    const result = service.parseItems(SAMPLE_PRICES);
    const nhan = result.find((r) => r.goldType === 'NHAN_9999');
    expect(nhan).toBeDefined();
    expect(nhan!.buyPrice).toBe(83_200_000n);
  });

  it('ignores unknown type codes', () => {
    const result = service.parseItems({ XAUUSD: { name: 'x', buy: 1, sell: 2, currency: 'USD' } });
    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(service.parseItems({})).toHaveLength(0);
  });
});
