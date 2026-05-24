import { CrawlSchedulerService } from '../../src/crawler/crawl-scheduler.service';

// Mock Date to control "current time" in tests
function mockTime(hour: number, minute = 0) {
  // Create date in UTC such that Vietnam time (UTC+7) equals the specified hour:minute
  const d = new Date(Date.UTC(2026, 4, 12, hour - 7, minute, 0));
  jest.useFakeTimers().setSystemTime(d);
}

describe('CrawlSchedulerService', () => {
  let scheduler: CrawlSchedulerService;

  beforeEach(() => {
    scheduler = new CrawlSchedulerService();
  });

  afterEach(() => {
    jest.useRealTimers();
    delete process.env.SKIP_TRADING_HOURS;
  });

  describe('trading hours gate (07:00–17:00 ICT)', () => {
    it('does NOT run crawlers at 06:59 Vietnam time', async () => {
      mockTime(6, 59);
      const fn = jest.fn().mockResolvedValue(undefined);
      scheduler.registerCrawler('SJC', fn);
      await scheduler.runCrawlCycle();
      expect(fn).not.toHaveBeenCalled();
    });

    it('DOES run crawlers at 07:00 Vietnam time', async () => {
      mockTime(7, 0);
      const fn = jest.fn().mockResolvedValue(undefined);
      scheduler.registerCrawler('SJC', fn);
      await scheduler.runCrawlCycle();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('DOES run crawlers at 16:59 Vietnam time', async () => {
      mockTime(16, 59);
      const fn = jest.fn().mockResolvedValue(undefined);
      scheduler.registerCrawler('DOJI', fn);
      await scheduler.runCrawlCycle();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('does NOT run crawlers at 17:00 Vietnam time', async () => {
      mockTime(17, 0);
      const fn = jest.fn().mockResolvedValue(undefined);
      scheduler.registerCrawler('DOJI', fn);
      await scheduler.runCrawlCycle();
      expect(fn).not.toHaveBeenCalled();
    });
  });

  it('runs all registered crawlers in a single cycle', async () => {
    mockTime(10, 0);
    const sjc = jest.fn().mockResolvedValue(undefined);
    const doji = jest.fn().mockResolvedValue(undefined);
    scheduler.registerCrawler('SJC', sjc);
    scheduler.registerCrawler('DOJI', doji);
    await scheduler.runCrawlCycle();
    expect(sjc).toHaveBeenCalledTimes(1);
    expect(doji).toHaveBeenCalledTimes(1);
  });

  it('runs crawlers outside trading hours when SKIP_TRADING_HOURS=true', async () => {
    process.env.SKIP_TRADING_HOURS = 'true';
    mockTime(3, 0);
    const fn = jest.fn().mockResolvedValue(undefined);
    scheduler.registerCrawler('SJC', fn);

    await scheduler.runCrawlCycle();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('continues running other crawlers if one throws', async () => {
    mockTime(10, 0);
    const failing = jest.fn().mockRejectedValue(new Error('network'));
    const passing = jest.fn().mockResolvedValue(undefined);
    scheduler.registerCrawler('SJC', failing);
    scheduler.registerCrawler('DOJI', passing);
    await scheduler.runCrawlCycle();
    expect(passing).toHaveBeenCalledTimes(1);
  });

  it('runNow returns triggered count with no crawlers', async () => {
    const result = await scheduler.runNow();
    expect(result.triggered).toBe(0);
  });

  it('runNow counts crawlers even when one throws', async () => {
    const failing = jest.fn().mockRejectedValue(new Error('boom'));
    const passing = jest.fn().mockResolvedValue(undefined);
    scheduler.registerCrawler('SJC', failing);
    scheduler.registerCrawler('DOJI', passing);

    const result = await scheduler.runNow();

    expect(result.triggered).toBe(2);
    expect(passing).toHaveBeenCalledTimes(1);
  });
});
