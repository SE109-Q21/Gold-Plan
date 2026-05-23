import { SmartAlertsService } from './smart-alerts.service';

class TestableService extends SmartAlertsService {
  public testEvaluateTrend = this.evaluateTrend.bind(this);
  public testEvaluateSpread = this.evaluateSpread.bind(this);
}

describe('SmartAlertsService — protected evaluation helpers', () => {
  let service: TestableService;

  beforeEach(() => {
    service = new TestableService(null as any, null as any, null as any);
  });

  it('evaluateTrend: [100,110,120] n=3 up → true', () => {
    expect(service.testEvaluateTrend([100, 110, 120], 3, 'up')).toBe(true);
  });

  it('evaluateTrend: [130,120,110] n=3 down → true', () => {
    expect(service.testEvaluateTrend([130, 120, 110], 3, 'down')).toBe(true);
  });

  it('evaluateTrend: [100,110,120] n=3 down → false', () => {
    expect(service.testEvaluateTrend([100, 110, 120], 3, 'down')).toBe(false);
  });

  it('evaluateTrend: [100,110] n=3 up → false (insufficient data)', () => {
    expect(service.testEvaluateTrend([100, 110], 3, 'up')).toBe(false);
  });

  it('evaluateSpread: buy=79_000_000 sell=79_150_000 threshold=200_000 → true (spread 150k ≤ 200k)', () => {
    expect(service.testEvaluateSpread(79_000_000, 79_150_000, 200_000)).toBe(true);
  });

  it('evaluateSpread: buy=79_000_000 sell=79_300_000 threshold=200_000 → false (spread 300k > 200k)', () => {
    expect(service.testEvaluateSpread(79_000_000, 79_300_000, 200_000)).toBe(false);
  });
});
