import {
  IsIn,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateAlertDto {
  @IsIn(['SJC', 'DOJI', 'PNJ', 'BAO_TIN'])
  brand: string;

  @IsIn(['MIEN_SJC', 'NHAN_9999', 'VANG_24K', 'VANG_18K'])
  goldType: string;

  @IsIn(['lte', 'gte'])
  condition: string;

  @Transform(({ value }) => BigInt(value))
  @IsNotEmpty()
  thresholdPrice: bigint;

  @IsBoolean()
  @IsOptional()
  repeatMode?: boolean;
}
