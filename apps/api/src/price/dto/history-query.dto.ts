import { IsEnum, IsIn } from 'class-validator';
import { GoldBrand, GoldType } from '@prisma/client';

export class HistoryQueryDto {
  @IsEnum(GoldBrand)
  brand: GoldBrand;

  @IsEnum(GoldType)
  goldType: GoldType;

  @IsIn(['1D', '1W', '1M'])
  range: '1D' | '1W' | '1M';
}
