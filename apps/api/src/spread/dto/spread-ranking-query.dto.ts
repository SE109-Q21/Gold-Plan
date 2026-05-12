import { IsIn } from 'class-validator';

const GOLD_TYPES = ['MIEN_SJC', 'NHAN_9999', 'VANG_24K', 'VANG_18K'] as const;

export class SpreadRankingQueryDto {
  @IsIn(GOLD_TYPES)
  goldType: (typeof GOLD_TYPES)[number];
}
