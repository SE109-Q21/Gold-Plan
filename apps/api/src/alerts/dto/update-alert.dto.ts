import {
  IsIn,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateAlertDto {
  @IsIn(['SJC', 'DOJI', 'PNJ', 'BAO_TIN'])
  @IsOptional()
  brand?: string;

  @IsIn(['MIEN_SJC', 'NHAN_9999', 'VANG_24K', 'VANG_18K'])
  @IsOptional()
  goldType?: string;

  @IsIn(['lte', 'gte'])
  @IsOptional()
  condition?: string;

  @Transform(({ value }) => (value !== undefined ? BigInt(value) : undefined))
  @IsNotEmpty()
  @IsOptional()
  thresholdPrice?: bigint;

  @IsBoolean()
  @IsOptional()
  repeatMode?: boolean;
}
