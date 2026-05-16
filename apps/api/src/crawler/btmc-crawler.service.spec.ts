import { BtmcCrawlerService } from './btmc-crawler.service';

describe('BtmcCrawlerService.parseHtml', () => {
  let service: BtmcCrawlerService;

  beforeEach(() => {
    service = new BtmcCrawlerService(null as any, null as any, null as any);
  });

  const FIXTURE_HTML = `
    <table>
      <tr><th>Loại vàng</th><th>Mua vào</th><th>Bán ra</th></tr>
      <tr><td>SJC miếng</td><td>85.500.000</td><td>87.000.000</td></tr>
      <tr><td>Nhẫn vàng 9999</td><td>7.950.000</td><td>8.100.000</td></tr>
    </table>
  `;

  it('parses MIEN_SJC price row', () => {
    const results = service.parseHtml(FIXTURE_HTML);
    const row = results.find((r) => r.goldType === 'MIEN_SJC');
    expect(row).toBeDefined();
    expect(row!.buyPrice).toBe(BigInt(85_500_000));
    expect(row!.sellPrice).toBe(BigInt(87_000_000));
  });

  it('parses NHAN_9999 price row', () => {
    const results = service.parseHtml(FIXTURE_HTML);
    const row = results.find((r) => r.goldType === 'NHAN_9999');
    expect(row).toBeDefined();
    expect(row!.buyPrice).toBe(BigInt(7_950_000));
    expect(row!.sellPrice).toBe(BigInt(8_100_000));
  });

  it('returns empty array for empty HTML', () => {
    const results = service.parseHtml('<html></html>');
    expect(results).toEqual([]);
  });
});
