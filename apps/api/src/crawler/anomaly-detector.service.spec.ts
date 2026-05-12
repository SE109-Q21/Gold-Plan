import { AnomalyDetectorService } from './anomaly-detector.service';

describe('AnomalyDetectorService', () => {
  let service: AnomalyDetectorService;

  beforeEach(() => {
    service = new AnomalyDetectorService();
  });

  describe('isAnomalous', () => {
    it('returns false when no previous price (first record)', () => {
      expect(service.isAnomalous(null, 8_500_000n)).toBe(false);
    });

    it('returns false for normal movement within 15%', () => {
      const prev = 8_500_000n;
      const curr = 8_600_000n; // +1.18%
      expect(service.isAnomalous(prev, curr)).toBe(false);
    });

    it('returns true for upward spike > 15%', () => {
      const prev = 8_500_000n;
      const curr = 10_000_000n; // +17.6%
      expect(service.isAnomalous(prev, curr)).toBe(true);
    });

    it('returns true for downward spike > 15%', () => {
      const prev = 8_500_000n;
      const curr = 7_000_000n; // -17.6%
      expect(service.isAnomalous(prev, curr)).toBe(true);
    });

    it('returns false at exactly 15% boundary', () => {
      const prev = 8_000_000n;
      const curr = 9_200_000n; // exactly +15%
      expect(service.isAnomalous(prev, curr)).toBe(false);
    });
  });

  describe('getDeviationPercent', () => {
    it('calculates positive deviation correctly', () => {
      const result = service.getDeviationPercent(8_000_000n, 8_800_000n);
      expect(result).toBeCloseTo(10, 1);
    });

    it('calculates negative deviation correctly', () => {
      const result = service.getDeviationPercent(8_000_000n, 7_200_000n);
      expect(result).toBeCloseTo(-10, 1);
    });
  });
});
