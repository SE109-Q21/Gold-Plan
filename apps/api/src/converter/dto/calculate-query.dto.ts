import { IsIn, IsNumber, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CalculateQueryDto {
  @IsIn(['TAEL', 'CHI', 'PHAN', 'TROY_OZ', 'GRAM', 'KILOGRAM'])
  unit: 'TAEL' | 'CHI' | 'PHAN' | 'TROY_OZ' | 'GRAM' | 'KILOGRAM';

  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0.001)
  qty: number;

  @IsIn(['24K', '22K', '18K', '14K'])
  purity: '24K' | '22K' | '18K' | '14K';

  @IsIn(['SJC', 'DOJI'])
  brand: 'SJC' | 'DOJI';

  @IsString()
  goldType: string;
}
