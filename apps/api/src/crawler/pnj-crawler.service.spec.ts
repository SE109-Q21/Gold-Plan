import { PnjCrawlerService } from './pnj-crawler.service';

describe('PnjCrawlerService.parseHtml', () => {
  let service: PnjCrawlerService;

  beforeEach(() => {
    service = new PnjCrawlerService(null as any, null as any, null as any);
  });

  const FIXTURE_HTML = `
    <table>
      <tr><th>Loại vàng</th><th>Mua vào</th><th>Bán ra</th></tr>
      <tr><td>Vàng nhẫn 9999</td><td>7.950.000</td><td>8.100.000</td></tr>
      <tr><td>Vàng 24K</td><td>8.200.000</td><td>8.350.000</td></tr>
    </table>
  `;

  it('parses NHAN_9999 price row', () => {
    const results = service.parseHtml(FIXTURE_HTML);
    const row = results.find((r) => r.goldType === 'NHAN_9999');
    expect(row).toBeDefined();
    expect(row!.buyPrice).toBe(BigInt(7_950_000));
    expect(row!.sellPrice).toBe(BigInt(8_100_000));
  });

  it('parses VANG_24K price row', () => {
    const results = service.parseHtml(FIXTURE_HTML);
    const row = results.find((r) => r.goldType === 'VANG_24K');
    expect(row).toBeDefined();
    expect(row!.buyPrice).toBe(BigInt(8_200_000));
    expect(row!.sellPrice).toBe(BigInt(8_350_000));
  });

  it('returns empty array for empty HTML', () => {
    const results = service.parseHtml('<html></html>');
    expect(results).toEqual([]);
  });
});
