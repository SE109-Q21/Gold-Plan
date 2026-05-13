import { IsIn, IsDateString, IsPositive } from 'class-validator';
import { Transform } from 'class-transformer';

export class DcaQueryDto {
  @IsIn(['SJC', 'DOJI', 'PNJ', 'BAO_TIN'])
  brand: string;

  @IsIn(['MIEN_SJC', 'NHAN_9999', 'VANG_24K', 'VANG_18K'])
  goldType: string;

  @IsDateString()
  startDate: string;

  @IsIn(['weekly', 'monthly'])
  frequency: 'weekly' | 'monthly';

  @Transform(({ value }) => parseFloat(value))
  @IsPositive()
  qtyPerPurchase: number;
}
