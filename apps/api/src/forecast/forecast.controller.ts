import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ForecastService } from './forecast.service';
import { VoteDto } from './dto/vote.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Controller('forecast')
export class ForecastController {
  constructor(private readonly forecastService: ForecastService) {}

  /**
   * GET /forecast/session
   * Public but optionally authenticated — userId extracted when token present.
   */
  @Get('session')
  @UseGuards(OptionalJwtAuthGuard)
  getSession(@Req() req: any) {
    const userId: string | undefined = req.user?.sub;
    return this.forecastService.getActiveSession(userId);
  }

  /**
   * POST /forecast/vote
   * Requires auth.
   */
  @Post('vote')
  @UseGuards(JwtAuthGuard)
  vote(@CurrentUser() user: JwtPayload, @Body() dto: VoteDto) {
    return this.forecastService.vote(user.sub, dto.sessionId, dto.direction);
  }

  /**
   * GET /forecast/leaderboard?month=2026-05
   * Public.
   */
  @Get('leaderboard')
  getLeaderboard(@Query('month') month?: string) {
    const targetMonth = month ?? new Date().toISOString().slice(0, 7);
    return this.forecastService.getLeaderboard(targetMonth);
  }

  /**
   * GET /forecast/history?page=1
   * Requires auth.
   */
  @Get('history')
  @UseGuards(JwtAuthGuard)
  getHistory(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    return this.forecastService.getUserHistory(user.sub, pageNum);
  }
}
