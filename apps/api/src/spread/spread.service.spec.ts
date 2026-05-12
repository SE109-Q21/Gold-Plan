import { Test, TestingModule } from '@nestjs/testing';
import { SpreadService } from './spread.service';
import { PrismaService } from '../database/prisma.service';

function makeRecord(
  brand: string,
  buyPrice: bigint,
  sellPrice: bigint,
  crawlSessionId = 'session-1',
) {
  return {
    id: `${brand}-1`,
    crawlSessionId,
    brand,
    goldType: 'MIEN_SJC',
    buyPrice,
    sellPrice,
    recordedAt: new Date(),
    isAnomalous: false,
    anomalyReason: null,
    approvedAt: null,
    rejectedAt: null,
  };
}

/** Build a findFirst mock that returns the matching record for each brand call */
function makeFindFirst(
  recordMap: Record<string, ReturnType<typeof makeRecord> | null>,
): jest.Mock {
  return jest.fn().mockImplementation(({ where }: { where: { brand: string } }) => {
    const record = recordMap[where.brand] ?? null;
    return Promise.resolve(record);
  });
}

describe('SpreadService', () => {
  let service: SpreadService;
  let prismaService: { priceRecord: { findFirst: jest.Mock } };

  beforeEach(async () => {
    prismaService = {
      priceRecord: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpreadService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<SpreadService>(SpreadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('sorts multi-brand results ascending by spreadVnd; smallest spread marked isMostEfficient', async () => {
    // SJC spread = 2_500_000; DOJI spread = 2_200_000 → DOJI wins
    const sjcBuy = 80_000_000n;
    const sjcSell = 82_500_000n;
    const dojiBuy = 79_000_000n;
    const dojiSell = 81_200_000n;

    prismaService.priceRecord.findFirst = makeFindFirst({
      SJC: makeRecord('SJC', sjcBuy, sjcSell),
      DOJI: makeRecord('DOJI', dojiBuy, dojiSell),
      PNJ: null,
      BAO_TIN: null,
    });

    const result = await service.getSpreadRanking('MIEN_SJC' as any);

    expect(result).toHaveLength(2);
    expect(result[0].brand).toBe('DOJI');
    expect(result[0].spreadVnd).toBe(2_200_000);
    expect(result[0].isMostEfficient).toBe(true);
    expect(result[1].brand).toBe('SJC');
    expect(result[1].spreadVnd).toBe(2_500_000);
    expect(result[1].isMostEfficient).toBe(false);
  });

  it('skips brands with zero buyPrice', async () => {
    prismaService.priceRecord.findFirst = makeFindFirst({
      SJC: makeRecord('SJC', 0n, 82_500_000n),       // zero buyPrice → skip
      DOJI: makeRecord('DOJI', 79_000_000n, 81_200_000n),
      PNJ: null,
      BAO_TIN: null,
    });

    const result = await service.getSpreadRanking('MIEN_SJC' as any);

    expect(result).toHaveLength(1);
    expect(result[0].brand).toBe('DOJI');
  });

  it('marks the only result as isMostEfficient when single brand present', async () => {
    prismaService.priceRecord.findFirst = makeFindFirst({
      SJC: makeRecord('SJC', 80_000_000n, 82_500_000n),
      DOJI: null,
      PNJ: null,
      BAO_TIN: null,
    });

    const result = await service.getSpreadRanking('MIEN_SJC' as any);

    expect(result).toHaveLength(1);
    expect(result[0].isMostEfficient).toBe(true);
  });

  it('computes spreadPct correctly rounded to 2 decimal places', async () => {
    // buyPrice = 80_000_000, sellPrice = 82_500_000
    // spreadVnd = 2_500_000
    // spreadPct = 2_500_000 / 80_000_000 * 100 = 3.125 → rounded to 3.13
    prismaService.priceRecord.findFirst = makeFindFirst({
      SJC: makeRecord('SJC', 80_000_000n, 82_500_000n),
      DOJI: null,
      PNJ: null,
      BAO_TIN: null,
    });

    const result = await service.getSpreadRanking('MIEN_SJC' as any);

    expect(result[0].buyPrice).toBe(80_000_000);
    expect(result[0].sellPrice).toBe(82_500_000);
    expect(result[0].spreadVnd).toBe(2_500_000);
    expect(result[0].spreadPct).toBe(3.13);
  });
});
