import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BrowsingHistoryService, BrowsingContextDto, BrowsingHistoryItemDto, LowestSeenItemDto } from './browsing-history.service';
import { RecordBrowseDto } from './dto/record-browse.dto';

@UseGuards(JwtAuthGuard)
@Controller('browsing-history')
export class BrowsingHistoryController {
  constructor(private readonly service: BrowsingHistoryService) {}

  @Post('record')
  @HttpCode(202)
  async record(
    @CurrentUser() user: { sub: string; email: string; role: string },
    @Body() dto: RecordBrowseDto,
  ): Promise<void> {
    await this.service.recordView(user.sub, dto.brand, dto.goldType, dto.buyPrice);
  }

  @Get('context')
  async getContext(
    @CurrentUser() user: { sub: string; email: string; role: string },
    @Query('brand') brand: string,
    @Query('goldType') goldType: string,
  ): Promise<BrowsingContextDto | null> {
    return this.service.getInlineContext(user.sub, brand, goldType);
  }

  @Get()
  async getHistory(
    @CurrentUser() user: { sub: string; email: string; role: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ items: BrowsingHistoryItemDto[]; total: number; page: number; totalPages: number }> {
    return this.service.getHistory(
      user.sub,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('lowest')
  async getLowest(
    @CurrentUser() user: { sub: string; email: string; role: string },
  ): Promise<LowestSeenItemDto[]> {
    return this.service.getAllLowestSeen(user.sub);
  }

  @Delete()
  @HttpCode(204)
  async clearHistory(
    @CurrentUser() user: { sub: string; email: string; role: string },
  ): Promise<void> {
    await this.service.clearHistory(user.sub);
  }
}
