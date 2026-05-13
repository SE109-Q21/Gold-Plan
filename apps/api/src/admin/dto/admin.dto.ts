// Admin DTOs — used by AdminController for @Body() decoration

export class CreateDataSourceDto {
  name: string;
  brand: string;
  url: string;
  crawlType: string;
  frequencyMin?: number;
}

export class UpdateDataSourceDto {
  name?: string;
  url?: string;
  crawlType?: string;
  frequencyMin?: number;
  isActive?: boolean;
}

export class ReviewAnomalyDto {
  action: 'approved' | 'rejected';
}
