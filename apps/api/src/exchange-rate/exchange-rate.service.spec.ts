import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import axios from 'axios';
import { ExchangeRateService } from './exchange-rate.service';

const MOCK_RATES = {
  VND: 25_480,
  EUR: 0.913, // 1 USD = 0.913 EUR, so 1 EUR = ~1/0.913 USD ≈ 1.095 USD
};

function makeFxResponse(rates: Record<string, number> = MOCK_RATES) {
  return { data: { rates } };
}

function resetCache(service: ExchangeRateService) {
  Reflect.set(service, 'cache', null);
}

function expireCache(service: ExchangeRateService) {
  const cache = Reflect.get(service, 'cache') as { expiresAt: number } | null;
  if (!cache) {
    throw new Error('Expected exchange-rate cache to exist');
  }
  cache.expiresAt = Date.now() - 1;
}

describe('ExchangeRateService', () => {
  let service: ExchangeRateService;
  let axiosGetSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRateService,
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<ExchangeRateService>(ExchangeRateService);

    resetCache(service);

    axiosGetSpy = jest.spyOn(axios, 'get');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when the provider responds', () => {
    it('fetches rates on cache miss and returns live source', async () => {
      axiosGetSpy.mockResolvedValueOnce(makeFxResponse());

      const result = await service.getRates();

      expect(axiosGetSpy).toHaveBeenCalledTimes(1);
      expect(result.usdVnd).toBe(25_480);
      expect(result.eurVnd).toBe(27908);
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

      expireCache(service);

      await service.getRates();

      expect(axiosGetSpy).toHaveBeenCalledTimes(2);
    });

    it('serves stale cache with source=stale when fetch fails', async () => {
      // First call — populate cache
      axiosGetSpy.mockResolvedValueOnce(makeFxResponse());
      await service.getRates();

      expireCache(service);

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

  describe('without extra exchange-rate configuration', () => {
    it('fetches live rates because the configured provider does not require a key', async () => {
      axiosGetSpy.mockResolvedValueOnce(makeFxResponse());

      const result = await service.getRates();

      expect(axiosGetSpy).toHaveBeenCalledTimes(1);
      expect(result.usdVnd).toBe(25_480);
      expect(result.eurVnd).toBe(27908);
      expect(result.source).toBe('live');
    });

    it('returns cached live data on second call without re-fetching', async () => {
      axiosGetSpy.mockResolvedValue(makeFxResponse());

      const first = await service.getRates();
      const second = await service.getRates();

      expect(axiosGetSpy).toHaveBeenCalledTimes(1);
      expect(second.usdVnd).toBe(first.usdVnd);
      expect(second.source).toBe('live');
    });
  });
});
