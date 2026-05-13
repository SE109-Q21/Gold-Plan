import {
  IsIn,
  IsOptional,
  IsString,
  IsPositive,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class AddTransactionDto {
  @IsIn(['BUY', 'SELL'])
  type: 'BUY' | 'SELL';

  @IsIn(['SJC', 'DOJI', 'PNJ', 'BAO_TIN'])
  brand: string;

  @IsIn(['MIEN_SJC', 'NHAN_9999', 'VANG_24K', 'VANG_18K'])
  goldType: string;

  @Transform(({ value }) => parseFloat(value))
  @IsPositive()
  quantity: number;

  @Transform(({ value }) => parseInt(value, 10))
  @IsPositive()
  pricePerTael: number;

  @IsDateString()
  transactedAt: string;

  @IsOptional()
  @IsString()
  note?: string;
}
