import { SjcCrawlerService } from './sjc-crawler.service';
import { PrismaService } from '../database/prisma.service';
import { AnomalyDetectorService } from './anomaly-detector.service';

const mockPrisma = {} as unknown as PrismaService;
const mockDetector = {} as unknown as AnomalyDetectorService;

const SAMPLE_HTML = `
<table>
  <tr>
    <td>SJC 1L,10L,1KG</td>
    <td>85.500</td>
    <td>85.520</td>
  </tr>
  <tr>
    <td>Nhẫn SJC 1-2-5 chỉ 99.9</td>
    <td>83.400</td>
    <td>84.100</td>
  </tr>
  <tr>
    <td>Vàng nữ trang 24K</td>
    <td>82.000</td>
    <td>83.000</td>
  </tr>
  <tr>
    <td>Vàng nữ trang 18K</td>
    <td>61.500</td>
    <td>62.000</td>
  </tr>
</table>
`;

describe('SjcCrawlerService.parseHtml', () => {
  let service: SjcCrawlerService;

  beforeEach(() => {
    service = new SjcCrawlerService(mockPrisma, mockDetector);
  });

  it('returns 4 price records from sample HTML', () => {
    const result = service.parseHtml(SAMPLE_HTML);
    expect(result).toHaveLength(4);
  });

  it('maps SJC 1L,10L,1KG row to MIEN_SJC', () => {
    const result = service.parseHtml(SAMPLE_HTML);
    const mien = result.find((r) => r.goldType === 'MIEN_SJC');
    expect(mien).toBeDefined();
    expect(mien!.buyPrice).toBe(85_500_000n);
    expect(mien!.sellPrice).toBe(85_520_000n);
  });

  it('maps Nhẫn row to NHAN_9999', () => {
    const result = service.parseHtml(SAMPLE_HTML);
    const nhan = result.find((r) => r.goldType === 'NHAN_9999');
    expect(nhan).toBeDefined();
    expect(nhan!.buyPrice).toBe(83_400_000n);
    expect(nhan!.sellPrice).toBe(84_100_000n);
  });

  it('maps Vàng nữ trang 24K to VANG_24K', () => {
    const result = service.parseHtml(SAMPLE_HTML);
    const v24 = result.find((r) => r.goldType === 'VANG_24K');
    expect(v24).toBeDefined();
    expect(v24!.buyPrice).toBe(82_000_000n);
  });

  it('maps Vàng nữ trang 18K to VANG_18K', () => {
    const result = service.parseHtml(SAMPLE_HTML);
    const v18 = result.find((r) => r.goldType === 'VANG_18K');
    expect(v18).toBeDefined();
    expect(v18!.buyPrice).toBe(61_500_000n);
  });

  it('returns empty array for empty HTML', () => {
    const result = service.parseHtml('<html></html>');
    expect(result).toHaveLength(0);
  });
});
