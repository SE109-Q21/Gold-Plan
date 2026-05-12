import { DojiCrawlerService } from './doji-crawler.service';
import { PrismaService } from '../database/prisma.service';
import { AnomalyDetectorService } from './anomaly-detector.service';

const mockPrisma = {} as unknown as PrismaService;
const mockDetector = {} as unknown as AnomalyDetectorService;

const SAMPLE_RESPONSE = {
  data: [
    { name: 'Vàng DOJI 9999 (Vàng miếng)', buy: '85200000', sell: '85380000' },
    { name: 'Nhẫn DOJI 9999', buy: '83200000', sell: '83850000' },
    { name: 'Vàng nữ trang 24K', buy: '81800000', sell: '82600000' },
    { name: 'Vàng nữ trang 18K', buy: '61300000', sell: '61900000' },
  ],
};

describe('DojiCrawlerService.parseResponse', () => {
  let service: DojiCrawlerService;

  beforeEach(() => {
    service = new DojiCrawlerService(mockPrisma, mockDetector);
  });

  it('returns 4 price records from sample response', () => {
    const result = service.parseResponse(SAMPLE_RESPONSE);
    expect(result).toHaveLength(4);
  });

  it('maps Vàng miếng row to MIEN_SJC goldType', () => {
    const result = service.parseResponse(SAMPLE_RESPONSE);
    const mien = result.find((r) => r.goldType === 'MIEN_SJC');
    expect(mien).toBeDefined();
    expect(mien!.buyPrice).toBe(85_200_000n);
    expect(mien!.sellPrice).toBe(85_380_000n);
  });

  it('maps Nhẫn 9999 row to NHAN_9999', () => {
    const result = service.parseResponse(SAMPLE_RESPONSE);
    const nhan = result.find((r) => r.goldType === 'NHAN_9999');
    expect(nhan).toBeDefined();
    expect(nhan!.buyPrice).toBe(83_200_000n);
  });

  it('maps 24K to VANG_24K', () => {
    const result = service.parseResponse(SAMPLE_RESPONSE);
    const v24 = result.find((r) => r.goldType === 'VANG_24K');
    expect(v24).toBeDefined();
    expect(v24!.buyPrice).toBe(81_800_000n);
  });

  it('maps 18K to VANG_18K', () => {
    const result = service.parseResponse(SAMPLE_RESPONSE);
    const v18 = result.find((r) => r.goldType === 'VANG_18K');
    expect(v18).toBeDefined();
    expect(v18!.buyPrice).toBe(61_300_000n);
  });

  it('returns empty array for empty data', () => {
    const result = service.parseResponse({ data: [] });
    expect(result).toHaveLength(0);
  });
});
