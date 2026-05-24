import { BaseCrawlerService, RawPriceData } from '../../src/crawler/base-crawler.service';
import { PrismaService } from '../../src/database/prisma.service';
import { AnomalyDetectorService } from '../../src/crawler/anomaly-detector.service';

// Define test GoldBrand/GoldType string values directly (avoid importing Prisma at module level)
const SJC = 'SJC';
const MIEN_SJC = 'MIEN_SJC';

class TestCrawler extends BaseCrawlerService {
  readonly brand = SJC as any;
  fetchPrices = jest.fn<Promise<RawPriceData[]>, []>();
}

const MOCK_DATA_SOURCE = { id: 'ds-1', name: 'SJC Official', brand: 'SJC' };

const mockPrisma = {
  dataSource: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  crawlSession: {
    create: jest.fn(),
    update: jest.fn(),
  },
  priceRecord: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
};

describe('BaseCrawlerService', () => {
  let crawler: TestCrawler;
  let anomalyDetector: AnomalyDetectorService;

  beforeEach(() => {
    anomalyDetector = new AnomalyDetectorService();
    crawler = new TestCrawler(
      mockPrisma as unknown as PrismaService,
      anomalyDetector,
    );
    jest.clearAllMocks();
    // Default: dataSource already exists
    mockPrisma.dataSource.findFirst.mockResolvedValue(MOCK_DATA_SOURCE);
  });

  it('creates a crawl session, persists records, and marks session complete', async () => {
    const session = { id: 'session-1' };
    mockPrisma.crawlSession.create.mockResolvedValue(session);
    mockPrisma.crawlSession.update.mockResolvedValue({});
    mockPrisma.priceRecord.findFirst.mockResolvedValue(null);
    mockPrisma.priceRecord.create.mockResolvedValue({});

    crawler.fetchPrices.mockResolvedValue([
      { goldType: MIEN_SJC as any, buyPrice: 8_500_000n, sellPrice: 8_600_000n },
    ]);

    await crawler.crawl('SJC Official');

    expect(mockPrisma.crawlSession.create).toHaveBeenCalledWith({
      data: { dataSourceId: MOCK_DATA_SOURCE.id, status: 'running' },
    });
    expect(mockPrisma.priceRecord.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.crawlSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'completed' }) }),
    );
  });

  it('persists multiple price records in one crawl', async () => {
    mockPrisma.crawlSession.create.mockResolvedValue({ id: 'session-1' });
    mockPrisma.crawlSession.update.mockResolvedValue({});
    mockPrisma.priceRecord.findFirst.mockResolvedValue(null);
    mockPrisma.priceRecord.create.mockResolvedValue({});

    crawler.fetchPrices.mockResolvedValue([
      { goldType: MIEN_SJC as any, buyPrice: 8_500_000n, sellPrice: 8_600_000n },
      { goldType: 'NHAN_TRON_9999' as any, buyPrice: 7_200_000n, sellPrice: 7_300_000n },
    ]);

    await crawler.crawl('SJC Official');

    expect(mockPrisma.priceRecord.create).toHaveBeenCalledTimes(2);
  });

  it('marks session failed when fetchPrices throws', async () => {
    const session = { id: 'session-2' };
    mockPrisma.crawlSession.create.mockResolvedValue(session);
    mockPrisma.crawlSession.update.mockResolvedValue({});
    crawler.fetchPrices.mockRejectedValue(new Error('network error'));

    await crawler.crawl('SJC Official');

    expect(mockPrisma.crawlSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) }),
    );
  });

  it('flags anomalous records but still persists them', async () => {
    mockPrisma.crawlSession.create.mockResolvedValue({ id: 's3' });
    mockPrisma.crawlSession.update.mockResolvedValue({});
    mockPrisma.priceRecord.findFirst.mockResolvedValue({
      buyPrice: 8_500_000n,
    });
    mockPrisma.priceRecord.create.mockResolvedValue({});

    crawler.fetchPrices.mockResolvedValue([
      { goldType: MIEN_SJC as any, buyPrice: 10_500_000n, sellPrice: 10_600_000n }, // +23%
    ]);

    await crawler.crawl('SJC Official');

    expect(mockPrisma.priceRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isAnomalous: true }),
      }),
    );
  });

  it('creates data source when missing', async () => {
    mockPrisma.dataSource.findFirst.mockResolvedValue(null);
    mockPrisma.dataSource.create.mockResolvedValue(MOCK_DATA_SOURCE);
    mockPrisma.crawlSession.create.mockResolvedValue({ id: 's4' });
    mockPrisma.crawlSession.update.mockResolvedValue({});
    mockPrisma.priceRecord.findFirst.mockResolvedValue(null);
    mockPrisma.priceRecord.create.mockResolvedValue({});

    crawler.fetchPrices.mockResolvedValue([
      { goldType: MIEN_SJC as any, buyPrice: 8_500_000n, sellPrice: 8_600_000n },
    ]);

    await crawler.crawl('SJC Official');

    expect(mockPrisma.dataSource.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'SJC Official', brand: SJC }),
      }),
    );
  });

  it('completes successfully when fetchPrices returns empty', async () => {
    mockPrisma.crawlSession.create.mockResolvedValue({ id: 's5' });
    mockPrisma.crawlSession.update.mockResolvedValue({});

    crawler.fetchPrices.mockResolvedValue([]);

    await crawler.crawl('SJC Official');

    expect(mockPrisma.priceRecord.create).not.toHaveBeenCalled();
    expect(mockPrisma.crawlSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'completed' }) }),
    );
  });

  it('marks session failed when record persistence throws', async () => {
    mockPrisma.crawlSession.create.mockResolvedValue({ id: 's6' });
    mockPrisma.crawlSession.update.mockResolvedValue({});
    mockPrisma.priceRecord.findFirst.mockResolvedValue(null);
    mockPrisma.priceRecord.create.mockRejectedValue(new Error('db error'));

    crawler.fetchPrices.mockResolvedValue([
      { goldType: MIEN_SJC as any, buyPrice: 8_500_000n, sellPrice: 8_600_000n },
    ]);

    await crawler.crawl('SJC Official');

    expect(mockPrisma.crawlSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) }),
    );
  });
});
