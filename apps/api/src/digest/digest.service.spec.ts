import { Test, TestingModule } from '@nestjs/testing';
import { DigestService } from './digest.service';
import { PrismaService } from '../database/prisma.service';
import { PriceService } from '../price/price.service';
import { InternationalService } from '../international/international.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';

const TODAY = new Date('2026-05-13T00:00:00.000Z');

const mockPrisma = {
  goldDigest: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
  priceRecord: {
    findFirst: jest.fn().mockResolvedValue(null),
  },
  user: {
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn(),
  },
};

const mockPriceService = {
  getCurrentPrices: jest.fn().mockResolvedValue([
    { brand: 'SJC', goldType: 'MIEN_SJC', buyPrice: 79_000_000, sellPrice: 79_500_000 },
  ]),
};

const mockIntlService = {
  getInternationalPrice: jest.fn().mockResolvedValue({ spotPriceUsd: 2345, spotPriceVnd: 59_700_000, exchangeRate: 25_480, recordedAt: '' }),
};

const mockMailService = { sendDigestEmail: jest.fn() };
const mockConfig = { get: jest.fn().mockReturnValue('') };

describe('DigestService', () => {
  let service: DigestService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DigestService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PriceService, useValue: mockPriceService },
        { provide: InternationalService, useValue: mockIntlService },
        { provide: MailService, useValue: mockMailService },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<DigestService>(DigestService);
  });

  it('generates and saves a digest when none exists today', async () => {
    mockPrisma.goldDigest.findUnique.mockResolvedValue(null);
    mockPrisma.goldDigest.create.mockResolvedValue({ id: 'test', date: TODAY, sjcBuyVnd: 79_000_000n, sjcSellVnd: 79_500_000n, xauUsd: 2345, pctChangeSjc: 0, highlight: 'test', aiSummary: null, generatedAt: TODAY });

    await service.generate();

    expect(mockPrisma.goldDigest.create).toHaveBeenCalledTimes(1);
    const created = mockPrisma.goldDigest.create.mock.calls[0][0].data;
    expect(created.highlight).toContain('SJC');
  });

  it('is idempotent — skips generation if today digest exists', async () => {
    mockPrisma.goldDigest.findUnique.mockResolvedValue({ id: 'existing' });

    await service.generate();

    expect(mockPrisma.goldDigest.create).not.toHaveBeenCalled();
  });

  it('computes positive pctChangeSjc correctly', async () => {
    mockPrisma.goldDigest.findUnique.mockResolvedValue(null);
    mockPrisma.priceRecord.findFirst.mockResolvedValue({ buyPrice: 78_000_000n });
    mockPrisma.goldDigest.create.mockResolvedValue({});

    await service.generate();

    const data = mockPrisma.goldDigest.create.mock.calls[0][0].data;
    // (79M - 78M) / 78M * 100 ≈ 1.28%
    expect(data.pctChangeSjc).toBeCloseTo(1.28, 1);
  });

  it('sends emails to opt-in subscribers', async () => {
    const digest = { id: 'd1', date: TODAY, sjcBuyVnd: 79_000_000n, sjcSellVnd: 79_500_000n, xauUsd: 2345, pctChangeSjc: 0.5, highlight: 'test', aiSummary: null, generatedAt: TODAY };
    mockPrisma.goldDigest.findFirst.mockResolvedValue(digest);
    mockPrisma.user.findMany.mockResolvedValue([{ email: 'a@test.com' }, { email: 'b@test.com' }]);

    await service.sendEmails();

    expect(mockMailService.sendDigestEmail).toHaveBeenCalledTimes(2);
  });

  it('getArchive paginates results', async () => {
    mockPrisma.goldDigest.findMany.mockResolvedValue([]);
    mockPrisma.goldDigest.count.mockResolvedValue(40);

    const result = await service.getArchive(2, 20);

    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(mockPrisma.goldDigest.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 20 }));
  });
});
