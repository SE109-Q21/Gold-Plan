import { IsIn, IsObject, IsOptional } from 'class-validator';

export class CreateSmartAlertDto {
  @IsIn(['SJC', 'DOJI', 'PNJ', 'BAO_TIN'])
  brand: string;

  @IsIn(['MIEN_SJC', 'NHAN_9999', 'VANG_24K', 'VANG_18K'])
  goldType: string;

  @IsObject()
  condition1: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  condition2?: Record<string, unknown>;
}
