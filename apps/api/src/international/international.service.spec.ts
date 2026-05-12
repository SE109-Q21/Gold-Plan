import { InternationalService } from './international.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('InternationalService', () => {
  let service: InternationalService;

  beforeEach(() => {
    service = new InternationalService();
    jest.clearAllMocks();
  });

  it('returns correct InternationalPriceDto', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { price: 2350.5, currency: 'USD' } }) // gold API
      .mockResolvedValueOnce({ data: { rates: { VND: 25450 } } });          // exchange rate API

    const result = await service.getInternationalPrice();

    expect(result.spotPriceUsd).toBe(2350.5);
    expect(result.exchangeRate).toBe(25450);
    // VND/tael = 2350.5 × (37.5/31.1035) × 25450
    const expected = Math.round(2350.5 * (37.5 / 31.1035) * 25450);
    expect(result.spotPriceVnd).toBe(expected);
    expect(typeof result.recordedAt).toBe('string');
  });

  it('returns cached result on second call within 5 minutes', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { price: 2350.5, currency: 'USD' } })
      .mockResolvedValueOnce({ data: { rates: { VND: 25450 } } });

    await service.getInternationalPrice();
    await service.getInternationalPrice(); // should use cache

    expect(mockedAxios.get).toHaveBeenCalledTimes(2); // called only for the first fetch
  });

  it('fetches fresh data after cache expires', async () => {
    jest.useFakeTimers();

    mockedAxios.get
      .mockResolvedValueOnce({ data: { price: 2350.5, currency: 'USD' } })
      .mockResolvedValueOnce({ data: { rates: { VND: 25450 } } })
      .mockResolvedValueOnce({ data: { price: 2360.0, currency: 'USD' } })
      .mockResolvedValueOnce({ data: { rates: { VND: 25500 } } });

    await service.getInternationalPrice();

    jest.advanceTimersByTime(6 * 60_000); // advance 6 minutes past TTL
    await service.getInternationalPrice();

    expect(mockedAxios.get).toHaveBeenCalledTimes(4); // 2 calls × 2 fetches
    jest.useRealTimers();
  });
});
