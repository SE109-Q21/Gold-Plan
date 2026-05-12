import { Test, TestingModule } from '@nestjs/testing';
import { ConverterService } from './converter.service';
import { PriceService } from '../price/price.service';
import { ExchangeRateService } from '../exchange-rate/exchange-rate.service';
import { CalculateQueryDto } from './dto/calculate-query.dto';

const MOCK_PRICE = 79_000_000;
const MOCK_USD_VND = 25_480;
const MOCK_EUR_VND = 27_900;
const MOCK_RECORDED_AT = '2026-01-01T00:00:00.000Z';

const mockPriceService = {
  getCurrentPrices: jest.fn().mockResolvedValue([
    {
      brand: 'SJC',
      goldType: 'MIEN_SJC',
      buyPrice: MOCK_PRICE,
      sellPrice: 80_000_000,
      recordedAt: MOCK_RECORDED_AT,
      status: 'live',
      changePercent: null,
    },
  ]),
};

const mockExchangeRateService = {
  getRates: jest.fn().mockResolvedValue({
    usdVnd: MOCK_USD_VND,
    eurVnd: MOCK_EUR_VND,
    updatedAt: MOCK_RECORDED_AT,
    source: 'fallback',
  }),
};

describe('ConverterService', () => {
  let service: ConverterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConverterService,
        { provide: PriceService, useValue: mockPriceService },
        { provide: ExchangeRateService, useValue: mockExchangeRateService },
      ],
    }).compile();

    service = module.get<ConverterService>(ConverterService);
    jest.clearAllMocks();
    mockPriceService.getCurrentPrices.mockResolvedValue([
      {
        brand: 'SJC',
        goldType: 'MIEN_SJC',
        buyPrice: MOCK_PRICE,
        sellPrice: 80_000_000,
        recordedAt: MOCK_RECORDED_AT,
        status: 'live',
        changePercent: null,
      },
    ]);
    mockExchangeRateService.getRates.mockResolvedValue({
      usdVnd: MOCK_USD_VND,
      eurVnd: MOCK_EUR_VND,
      updatedAt: MOCK_RECORDED_AT,
      source: 'fallback',
    });
  });

  it('1 TAEL 24K with SJC price 79_000_000 VND', async () => {
    const dto: CalculateQueryDto = {
      unit: 'TAEL',
      qty: 1,
      purity: '24K',
      brand: 'SJC',
      goldType: 'MIEN_SJC',
    };

    const result = await service.calculate(dto);

    expect(result.weightInGrams).toBe(37.5);
    expect(result.weightInTael).toBe(1.0);
    expect(result.valuations.VND).toBe(79_000_000);
    expect(result.priceUsed).toBe(MOCK_PRICE);
  });

  it('2 CHI 22K → correct weight and VND value', async () => {
    const dto: CalculateQueryDto = {
      unit: 'CHI',
      qty: 2,
      purity: '22K',
      brand: 'SJC',
      goldType: 'MIEN_SJC',
    };

    const result = await service.calculate(dto);

    expect(result.weightInGrams).toBeCloseTo(7.5, 5);
    expect(result.weightInTael).toBeCloseTo(0.2, 5);
    // valuations.VND = Math.round(0.2 * 79_000_000 * 0.9167)
    const expectedVnd = Math.round(0.2 * 79_000_000 * 0.9167);
    expect(result.valuations.VND).toBe(expectedVnd);
  });

  it('1 TROY_OZ 18K → correct gram and tael conversions', async () => {
    const dto: CalculateQueryDto = {
      unit: 'TROY_OZ',
      qty: 1,
      purity: '18K',
      brand: 'SJC',
      goldType: 'MIEN_SJC',
    };

    const result = await service.calculate(dto);

    expect(result.weightInGrams).toBeCloseTo(31.103477, 5);
    expect(result.weightInTael).toBeCloseTo(31.103477 / 37.5, 5);
  });

  it('exchange rate conversion: USD = VND / usdVnd, EUR = VND / eurVnd', async () => {
    const dto: CalculateQueryDto = {
      unit: 'TAEL',
      qty: 1,
      purity: '24K',
      brand: 'SJC',
      goldType: 'MIEN_SJC',
    };

    const result = await service.calculate(dto);

    const expectedVnd = 79_000_000;
    const expectedUsd = Math.round((expectedVnd / MOCK_USD_VND) * 100) / 100;
    const expectedEur = Math.round((expectedVnd / MOCK_EUR_VND) * 100) / 100;

    expect(result.valuations.USD).toBe(expectedUsd);
    expect(result.valuations.EUR).toBe(expectedEur);
  });
});
