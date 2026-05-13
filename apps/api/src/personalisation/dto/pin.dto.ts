import { IsIn, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PinItemDto {
  @IsIn(['SJC', 'DOJI', 'PNJ', 'BAO_TIN'])
  brand: string;

  @IsIn(['MIEN_SJC', 'NHAN_9999', 'VANG_24K', 'VANG_18K'])
  goldType: string;
}

export class AddPinDto extends PinItemDto {}
export class RemovePinDto extends PinItemDto {}

export class ReorderPinsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PinItemDto)
  order: PinItemDto[];
}
