import { IsIn, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';

const GOLD_TYPES = ['MIEN_SJC', 'NHAN_9999', 'VANG_24K', 'VANG_18K'] as const;

export class CalculateQueryDto {
  @IsIn(['TAEL', 'CHI', 'PHAN', 'TROY_OZ', 'GRAM', 'KILOGRAM'])
  unit: 'TAEL' | 'CHI' | 'PHAN' | 'TROY_OZ' | 'GRAM' | 'KILOGRAM';

  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0.001)
  qty: number;

  @IsIn(['24K', '22K', '18K', '14K'])
  purity: '24K' | '22K' | '18K' | '14K';

  @IsIn(['SJC', 'DOJI'])
  brand: 'SJC' | 'DOJI';

  @IsIn(GOLD_TYPES)
  goldType: (typeof GOLD_TYPES)[number];
}
