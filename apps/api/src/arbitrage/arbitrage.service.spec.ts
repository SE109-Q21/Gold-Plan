import { ArbitrageService, LatestBrandPrice } from './arbitrage.service';

describe('ArbitrageService.calculateOpportunities', () => {
  let service: ArbitrageService;

  beforeEach(() => {
    service = new ArbitrageService(null as any);
  });

  it('finds opportunity when brand A buyPrice > brand B sellPrice for same goldType', () => {
    const prices: LatestBrandPrice[] = [
      { brand: 'DOJI' as any, goldType: 'NHAN_9999' as any, buyPrice: BigInt(78_000_000), sellPrice: BigInt(80_000_000), recordedAt: new Date() },
      { brand: 'SJC'  as any, goldType: 'NHAN_9999' as any, buyPrice: BigInt(82_000_000), sellPrice: BigInt(84_000_000), recordedAt: new Date() },
    ];
    const result = service.calculateOpportunities(prices);
    expect(result).toHaveLength(1);
    expect(result[0].buyFromBrand).toBe('DOJI');   // cheapest to buy from
    expect(result[0].sellToBrand).toBe('SJC');      // highest buyback price
    expect(result[0].grossProfit).toBe(2_000_000);  // SJC buyPrice(82M) - DOJI sellPrice(80M)
    expect(result[0].profitPercent).toBeCloseTo(2.5, 1);
  });

  it('returns empty when no cross-brand profit possible', () => {
    const prices: LatestBrandPrice[] = [
      { brand: 'DOJI' as any, goldType: 'NHAN_9999' as any, buyPrice: BigInt(78_000_000), sellPrice: BigInt(80_000_000), recordedAt: new Date() },
      { brand: 'SJC'  as any, goldType: 'NHAN_9999' as any, buyPrice: BigInt(79_000_000), sellPrice: BigInt(81_000_000), recordedAt: new Date() },
    ];
    // SJC buyPrice(79M) < DOJI sellPrice(80M) → no profit
    expect(service.calculateOpportunities(prices)).toHaveLength(0);
  });

  it('skips goldTypes with only one brand', () => {
    const prices: LatestBrandPrice[] = [
      { brand: 'SJC' as any, goldType: 'MIEN_SJC' as any, buyPrice: BigInt(80_000_000), sellPrice: BigInt(82_000_000), recordedAt: new Date() },
    ];
    expect(service.calculateOpportunities(prices)).toHaveLength(0);
  });

  it('handles multiple goldTypes independently', () => {
    const prices: LatestBrandPrice[] = [
      { brand: 'DOJI' as any, goldType: 'NHAN_9999' as any, buyPrice: BigInt(78_000_000), sellPrice: BigInt(80_000_000), recordedAt: new Date() },
      { brand: 'SJC'  as any, goldType: 'NHAN_9999' as any, buyPrice: BigInt(82_000_000), sellPrice: BigInt(84_000_000), recordedAt: new Date() },
      { brand: 'PNJ'  as any, goldType: 'VANG_24K'  as any, buyPrice: BigInt(77_000_000), sellPrice: BigInt(79_000_000), recordedAt: new Date() },
      { brand: 'DOJI' as any, goldType: 'VANG_24K'  as any, buyPrice: BigInt(80_000_000), sellPrice: BigInt(82_000_000), recordedAt: new Date() },
    ];
    const result = service.calculateOpportunities(prices);
    expect(result).toHaveLength(2);
    const goldTypes = result.map(r => r.goldType);
    expect(goldTypes).toContain('NHAN_9999');
    expect(goldTypes).toContain('VANG_24K');
  });

  it('sorts by profitPercent descending', () => {
    const prices: LatestBrandPrice[] = [
      { brand: 'DOJI' as any, goldType: 'NHAN_9999' as any, buyPrice: BigInt(78_000_000), sellPrice: BigInt(80_000_000), recordedAt: new Date() },
      { brand: 'SJC'  as any, goldType: 'NHAN_9999' as any, buyPrice: BigInt(82_000_000), sellPrice: BigInt(84_000_000), recordedAt: new Date() },
      { brand: 'PNJ'  as any, goldType: 'VANG_24K'  as any, buyPrice: BigInt(77_000_000), sellPrice: BigInt(79_000_000), recordedAt: new Date() },
      { brand: 'BAO_TIN' as any, goldType: 'VANG_24K' as any, buyPrice: BigInt(90_000_000), sellPrice: BigInt(92_000_000), recordedAt: new Date() },
    ];
    const result = service.calculateOpportunities(prices);
    expect(result[0].profitPercent).toBeGreaterThanOrEqual(result[1].profitPercent);
  });
});
