import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateDataSourceDto, UpdateDataSourceDto, ReviewAnomalyDto } from './dto/admin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CrawlSchedulerService } from '../crawler/crawl-scheduler.service';

// ─── AdminController ──────────────────────────────────────────────────────────

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly crawlScheduler: CrawlSchedulerService,
  ) {}

  // POST /admin/crawl/trigger — force a crawl cycle regardless of trading hours
  @Post('crawl/trigger')
  triggerCrawl() {
    return this.crawlScheduler.runNow();
  }

  // GET /admin/stats
  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  // GET /admin/stats/period?period=day|week|month
  @Get('stats/period')
  getStatsByPeriod(@Query('period') period: 'day' | 'week' | 'month' = 'day') {
    const p: 'day' | 'week' | 'month' =
      period === 'week' || period === 'month' ? period : 'day';
    return this.adminService.getStatsByPeriod(p);
  }

  // GET /admin/users?page=1&limit=20&status=active&role=user
  @Get('users')
  listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('role') role?: string,
  ) {
    const filter: { status?: string; role?: string } = {};
    if (status) filter.status = status;
    if (role) filter.role = role;

    return this.adminService.listUsers(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      filter,
    );
  }

  // PATCH /admin/users/:id/lock
  @Patch('users/:id/lock')
  lockUser(@Param('id') id: string) {
    return this.adminService.lockUser(id);
  }

  // PATCH /admin/users/:id/unlock
  @Patch('users/:id/unlock')
  unlockUser(@Param('id') id: string) {
    return this.adminService.unlockUser(id);
  }

  // GET /admin/data-sources
  @Get('data-sources')
  listDataSources() {
    return this.adminService.listDataSources();
  }

  // POST /admin/data-sources
  @Post('data-sources')
  createDataSource(@Body() dto: CreateDataSourceDto) {
    return this.adminService.createDataSource(dto);
  }

  // PATCH /admin/data-sources/:id
  @Patch('data-sources/:id')
  updateDataSource(@Param('id') id: string, @Body() dto: UpdateDataSourceDto) {
    return this.adminService.updateDataSource(id, dto);
  }

  // DELETE /admin/data-sources/:id  → disable (soft delete)
  @Delete('data-sources/:id')
  disableDataSource(@Param('id') id: string) {
    return this.adminService.disableDataSource(id);
  }

  // GET /admin/anomalies
  @Get('anomalies')
  listAnomalies() {
    return this.adminService.listAnomalies();
  }

  // POST /admin/anomalies/:id/review
  @Post('anomalies/:id/review')
  reviewAnomaly(
    @Param('id') priceRecordId: string,
    @Body() body: ReviewAnomalyDto,
    @Req() req: { user: { sub: string } },
  ) {
    return this.adminService.reviewAnomaly(priceRecordId, body.action, req.user.sub);
  }
}
