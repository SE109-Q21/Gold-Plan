import { IsEnum, IsOptional } from 'class-validator';
import { GoldBrand } from '@prisma/client';

export class DomesticQueryDto {
  @IsOptional()
  @IsEnum(GoldBrand)
  brand?: GoldBrand;
}
