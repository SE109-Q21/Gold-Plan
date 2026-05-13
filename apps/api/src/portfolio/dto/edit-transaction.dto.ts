import {
  IsIn,
  IsOptional,
  IsString,
  IsPositive,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class EditTransactionDto {
  @IsOptional()
  @IsIn(['BUY', 'SELL'])
  type?: 'BUY' | 'SELL';

  @IsOptional()
  @IsIn(['SJC', 'DOJI', 'PNJ', 'BAO_TIN'])
  brand?: string;

  @IsOptional()
  @IsIn(['MIEN_SJC', 'NHAN_9999', 'VANG_24K', 'VANG_18K'])
  goldType?: string;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsPositive()
  quantity?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsPositive()
  pricePerTael?: number;

  @IsOptional()
  @IsDateString()
  transactedAt?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
