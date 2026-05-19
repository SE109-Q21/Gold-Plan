import { BtmcCrawlerService } from './btmc-crawler.service';

describe('BtmcCrawlerService.parseApiResponse', () => {
  let service: BtmcCrawlerService;

  beforeEach(() => {
    service = new BtmcCrawlerService(null as any, null as any, null as any);
  });

  // Real API uses '@row', '@n_N', '@pb_N', '@ps_N' keys
  const FIXTURE_RESPONSE = {
    DataList: {
      Data: [
        { '@row': '175', '@n_175': 'VÀNG MIẾNG SJC (Vàng SJC)', '@pb_175': '16050000', '@ps_175': '16350000', '@d_175': '19/05/2026 12:21' },
        { '@row': '176', '@n_176': 'NHẪN VÀNG 9999',             '@pb_176': '15800000',  '@ps_176': '16100000', '@d_176': '19/05/2026 12:21' },
        { '@row': '177', '@n_177': 'VÀNG 24K',                   '@pb_177': '0',          '@ps_177': '0',         '@d_177': '19/05/2026 12:21' },
        { '@row': '178', '@n_178': 'BẠC THỎI ANCARAT',           '@pb_178': '1000000',   '@ps_178': '1100000',   '@d_178': '19/05/2026 12:21' },
      ],
    },
  };

  it('parses MIEN_SJC price row and multiplies by 10 for per-lượng price', () => {
    const results = service.parseApiResponse(FIXTURE_RESPONSE);
    const row = results.find((r) => r.goldType === 'MIEN_SJC');
    expect(row).toBeDefined();
    expect(row!.buyPrice).toBe(BigInt(160_500_000));
    expect(row!.sellPrice).toBe(BigInt(163_500_000));
  });

  it('parses NHAN_9999 price row and multiplies by 10', () => {
    const results = service.parseApiResponse(FIXTURE_RESPONSE);
    const row = results.find((r) => r.goldType === 'NHAN_9999');
    expect(row).toBeDefined();
    expect(row!.buyPrice).toBe(BigInt(158_000_000));
    expect(row!.sellPrice).toBe(BigInt(161_000_000));
  });

  it('skips rows with zero prices', () => {
    const results = service.parseApiResponse(FIXTURE_RESPONSE);
    expect(results.find((r) => r.goldType === 'VANG_24K')).toBeUndefined();
  });

  it('skips rows with unrecognised names', () => {
    const results = service.parseApiResponse(FIXTURE_RESPONSE);
    expect(results).toHaveLength(2);
  });

  it('returns empty array for empty DataList', () => {
    const results = service.parseApiResponse({ DataList: { Data: [] } });
    expect(results).toEqual([]);
  });
});
