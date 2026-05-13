import { IsIn } from 'class-validator';

export class RecordViewDto {
  @IsIn(['SJC', 'DOJI', 'PNJ', 'BAO_TIN'])
  brand: string;

  @IsIn(['MIEN_SJC', 'NHAN_9999', 'VANG_24K', 'VANG_18K'])
  goldType: string;
}
