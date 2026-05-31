import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { ConfigService } from '@nestjs/config';
import { PriceService } from '../price/price.service';
import { InternationalService } from '../international/international.service';
import { HttpException } from '@nestjs/common';

const mockPriceService = {
  getCurrentPrices: jest.fn().mockResolvedValue([
    { brand: 'SJC', goldType: 'MIEN_SJC', buyPrice: 79_000_000, sellPrice: 79_500_000 },
    { brand: 'DOJI', goldType: 'MIEN_SJC', buyPrice: 78_800_000, sellPrice: 79_400_000 },
    { brand: 'PNJ', goldType: 'VANG_24K', buyPrice: 76_100_000, sellPrice: 77_200_000 },
    { brand: 'BAO_TIN', goldType: 'NHAN_9999', buyPrice: 78_500_000, sellPrice: 79_100_000 },
  ]),
};

const mockIntlService = {
  getInternationalPrice: jest.fn().mockResolvedValue({
    spotPriceUsd: 2345.5,
    spotPriceVnd: 59_700_000,
    exchangeRate: 25_480,
    recordedAt: new Date().toISOString(),
  }),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue(''),
};

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PriceService, useValue: mockPriceService },
        { provide: InternationalService, useValue: mockIntlService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('builds system prompt containing price data', async () => {
    const prompt = await service.buildSystemPrompt();
    expect(prompt).toContain('79.00M VND');
    expect(prompt).toContain('XAU/USD=2345.50');
    expect(prompt).toContain('not financial advice');
  });

  it('includes all available domestic brand and gold type prices in the prompt', async () => {
    const prompt = await service.buildSystemPrompt();
    expect(prompt).toContain('SJC MIEN_SJC buy=79.00M VND, sell=79.50M VND');
    expect(prompt).toContain('DOJI MIEN_SJC buy=78.80M VND, sell=79.40M VND');
    expect(prompt).toContain('PNJ VANG_24K buy=76.10M VND, sell=77.20M VND');
    expect(prompt).toContain('BAO_TIN NHAN_9999 buy=78.50M VND, sell=79.10M VND');
    expect(prompt).toContain('If the requested brand or gold type is missing from Current market data');
  });

  it('allows first guest request', () => {
    expect(() => service.checkGuestLimit('1.2.3.4')).not.toThrow();
  });

  it('throws 429 after 10 guest requests from same IP', () => {
    const ip = '9.8.7.6';
    for (let i = 0; i < 10; i++) service.checkGuestLimit(ip);
    expect(() => service.checkGuestLimit(ip)).toThrow(HttpException);
  });

  it('yields fallback message when OPENAI_API_KEY is empty', async () => {
    const chunks: string[] = [];
    for await (const chunk of service.streamChat([{ role: 'user', content: 'Hello' }])) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toContain('not financial advice');
  });

  it('system prompt declines off-topic instruction', async () => {
    const prompt = await service.buildSystemPrompt();
    expect(prompt).toContain('For unrelated questions, respond with exactly');
    expect(prompt).toContain('Do not add a financial disclaimer to unrelated-question refusals');
  });
});
