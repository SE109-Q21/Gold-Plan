import { Injectable } from '@nestjs/common';

const ANOMALY_THRESHOLD = 0.15;

@Injectable()
export class AnomalyDetectorService {
  isAnomalous(prevPrice: bigint | null, newPrice: bigint): boolean {
    if (prevPrice === null || prevPrice === 0n) return false;
    const deviation = Math.abs(
      (Number(newPrice) - Number(prevPrice)) / Number(prevPrice),
    );
    return deviation > ANOMALY_THRESHOLD;
  }

  getDeviationPercent(prevPrice: bigint, newPrice: bigint): number {
    return ((Number(newPrice) - Number(prevPrice)) / Number(prevPrice)) * 100;
  }
}
