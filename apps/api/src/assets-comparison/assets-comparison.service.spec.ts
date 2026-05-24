import { AssetsComparisonService } from './assets-comparison.service';

describe('AssetsComparisonService — pure helpers', () => {
  let service: AssetsComparisonService;

  beforeEach(() => {
    service = new AssetsComparisonService(null as any);
  });

  describe('normalizeToBase100', () => {
    it('first point becomes 100', () => {
      const input = [
        { date: '2026-01-01', value: 80_000_000 },
        { date: '2026-01-02', value: 82_000_000 },
        { date: '2026-01-03', value: 78_000_000 },
      ];
      const result = service.normalizeToBase100(input);
      expect(result[0].value).toBe(100);
      expect(result[1].value).toBeCloseTo(102.5, 1);
      expect(result[2].value).toBeCloseTo(97.5, 1);
    });

    it('returns empty array for empty input', () => {
      expect(service.normalizeToBase100([])).toEqual([]);
    });

    it('preserves date strings', () => {
      const input = [
        { date: '2026-03-01', value: 100 },
        { date: '2026-03-02', value: 110 },
      ];
      const result = service.normalizeToBase100(input);
      expect(result[0].date).toBe('2026-03-01');
      expect(result[1].date).toBe('2026-03-02');
    });

    it('single element normalizes to exactly 100', () => {
      const result = service.normalizeToBase100([{ date: '2026-05-01', value: 99_000_000 }]);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(100);
    });
  });

  describe('computeBankSeries', () => {
    it('day 0 value is 100', () => {
      const base = new Date('2026-01-01');
      const end = new Date('2026-01-03');
      const result = service.computeBankSeries(5.5, base, end);
      expect(result[0].value).toBe(100);
    });

    it('returns one point per day inclusive', () => {
      const base = new Date('2026-01-01');
      const end = new Date('2026-01-05');
      const result = service.computeBankSeries(5.5, base, end);
      expect(result).toHaveLength(5);
    });

    it('day 365 value ≈ 105.5 for 5.5% annual rate', () => {
      const base = new Date('2026-01-01');
      const end = new Date('2027-01-01'); // 365 days
      const result = service.computeBankSeries(5.5, base, end);
      expect(result[result.length - 1].value).toBeCloseTo(105.65, 0);
    });

    it('date strings are ISO date format YYYY-MM-DD', () => {
      const base = new Date('2026-06-15');
      const end = new Date('2026-06-16');
      const result = service.computeBankSeries(5.5, base, end);
      expect(result[0].date).toBe('2026-06-15');
      expect(result[1].date).toBe('2026-06-16');
    });
  });
});
