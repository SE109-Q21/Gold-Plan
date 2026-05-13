import { IsIn, IsNumber, Min } from 'class-validator';

export class RecordBrowseDto {
  @IsIn(['SJC', 'DOJI', 'PNJ', 'BAO_TIN']) brand: string;
  @IsIn(['MIEN_SJC', 'NHAN_9999', 'VANG_24K', 'VANG_18K']) goldType: string;
  @IsNumber({ allowInfinity: false, allowNaN: false }) @Min(1) buyPrice: number;
}
