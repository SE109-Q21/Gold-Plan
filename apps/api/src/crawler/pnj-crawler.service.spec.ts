import { PnjCrawlerService } from './pnj-crawler.service';
import { PrismaService } from '../database/prisma.service';
import { AnomalyDetectorService } from './anomaly-detector.service';

const mockPrisma = {} as unknown as PrismaService;
const mockDetector = {} as unknown as AnomalyDetectorService;

const SAMPLE_PRICES = {
  PQHNVM:    { name: 'PNJ Hanoi', buy: 7_950_000, sell: 8_100_000, currency: 'VND' },
  PQHN24NTT: { name: 'PNJ 24K',   buy: 8_200_000, sell: 8_350_000, currency: 'VND' },
  XAUUSD:    { name: 'World Gold', buy: 4552.9,   sell: 0,          currency: 'USD' },
};

describe('PnjCrawlerService.parseItems', () => {
  let service: PnjCrawlerService;

  beforeEach(() => {
    service = new PnjCrawlerService(mockPrisma, mockDetector);
  });

  it('returns 2 price records from sample prices', () => {
    const result = service.parseItems(SAMPLE_PRICES);
    expect(result).toHaveLength(2);
  });

  it('maps PQHNVM to NHAN_9999 with correct prices', () => {
    const result = service.parseItems(SAMPLE_PRICES);
    const nhan = result.find((r) => r.goldType === 'NHAN_9999');
    expect(nhan).toBeDefined();
    expect(nhan!.buyPrice).toBe(BigInt(7_950_000));
    expect(nhan!.sellPrice).toBe(BigInt(8_100_000));
  });

  it('maps PQHN24NTT to VANG_24K with correct prices', () => {
    const result = service.parseItems(SAMPLE_PRICES);
    const v24 = result.find((r) => r.goldType === 'VANG_24K');
    expect(v24).toBeDefined();
    expect(v24!.buyPrice).toBe(BigInt(8_200_000));
    expect(v24!.sellPrice).toBe(BigInt(8_350_000));
  });

  it('ignores unknown type codes', () => {
    const result = service.parseItems({ XAUUSD: { name: 'x', buy: 1, sell: 2, currency: 'USD' } });
    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(service.parseItems({})).toHaveLength(0);
  });
});
