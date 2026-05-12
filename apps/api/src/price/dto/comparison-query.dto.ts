import { IsEnum } from 'class-validator';
import { GoldType } from '@prisma/client';

export class ComparisonQueryDto {
  @IsEnum(GoldType)
  goldType: GoldType;
}
