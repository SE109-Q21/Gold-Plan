import { IsString, IsOptional, IsNumber, IsBoolean, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDataSourceDto {
  @IsString()
  name: string;

  @IsString()
  brand: string;

  @IsString()
  url: string;

  @IsString()
  crawlType: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  frequencyMin?: number;
}

export class UpdateDataSourceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  crawlType?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  frequencyMin?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReviewAnomalyDto {
  @IsIn(['approved', 'rejected'])
  action: 'approved' | 'rejected';
}
