import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { ExchangeRateService } from './exchange-rate.service';

const MOCK_RATES = {
  VND: 25_480,
  EUR: 0.913, // 1 USD = 0.913 EUR, so 1 EUR = ~1/0.913 USD ≈ 1.095 USD
};

function makeFxResponse(rates: Record<string, number> = MOCK_RATES) {
  return { data: { rates } };
}

describe('ExchangeRateService', () => {
  let service: ExchangeRateService;
  let axiosGetSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExchangeRateService],
    }).compile();

    service = module.get<ExchangeRateService>(ExchangeRateService);

    // Reset internal cache between tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).cache = null;

    axiosGetSpy = jest.spyOn(axios, 'get');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.EXCHANGE_RATE_API_KEY;
  });

  describe('when API key is present', () => {
    beforeEach(() => {
      process.env.EXCHANGE_RATE_API_KEY = 'test-key-123';
    });

    it('fetches rates on cache miss and returns live source', async () => {
      axiosGetSpy.mockResolvedValueOnce(makeFxResponse());

      const result = await service.getRates();

      expect(axiosGetSpy).toHaveBeenCalledTimes(1);
      expect(result.usdVnd).toBe(25_480);
      expect(result.source).toBe('live');
      expect(result.updatedAt).toBeTruthy();
    });

    it('returns cached data on second call without re-fetching (cache hit)', async () => {
      axiosGetSpy.mockResolvedValue(makeFxResponse());

      const first = await service.getRates();
      const second = await service.getRates();

      expect(axiosGetSpy).toHaveBeenCalledTimes(1);
      expect(second.usdVnd).toBe(first.usdVnd);
      expect(second.source).toBe('live');
    });

    it('re-fetches after TTL expiry (cache miss)', async () => {
      axiosGetSpy.mockResolvedValue(makeFxResponse());

      await service.getRates();

      // Expire the cache
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).cache.expiresAt = Date.now() - 1;

      await service.getRates();

      expect(axiosGetSpy).toHaveBeenCalledTimes(2);
    });

    it('serves stale cache with source=stale when fetch fails', async () => {
      // First call — populate cache
      axiosGetSpy.mockResolvedValueOnce(makeFxResponse());
      await service.getRates();

      // Expire the cache
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).cache.expiresAt = Date.now() - 1;

      // Second call — fetch fails
      axiosGetSpy.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getRates();

      expect(result.usdVnd).toBe(25_480);
      expect(result.source).toBe('stale');
    });

    it('returns fallback defaults when fetch fails and no cache exists', async () => {
      axiosGetSpy.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getRates();

      expect(result.usdVnd).toBe(25_480);
      expect(result.eurVnd).toBe(27_900);
      expect(result.source).toBe('fallback');
    });
  });

  describe('when API key is missing', () => {
    beforeEach(() => {
      delete process.env.EXCHANGE_RATE_API_KEY;
    });

    it('returns fallback defaults without calling axios', async () => {
      const result = await service.getRates();

      expect(axiosGetSpy).not.toHaveBeenCalled();
      expect(result.usdVnd).toBe(25_480);
      expect(result.eurVnd).toBe(27_900);
      expect(result.source).toBe('fallback');
    });

    it('returns cached fallback on second call without re-logging', async () => {
      const first = await service.getRates();
      const second = await service.getRates();

      // axios never called in either call
      expect(axiosGetSpy).not.toHaveBeenCalled();
      expect(second.usdVnd).toBe(first.usdVnd);
    });
  });
});
