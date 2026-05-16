import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { DigestService } from './digest.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../database/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Controller('digest')
export class DigestController {
  constructor(
    private readonly digestService: DigestService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('latest')
  async getLatest() {
    const digest = await this.digestService.getLatest();
    if (!digest) return null;
    return {
      ...digest,
      sjcBuyVnd: Number(digest.sjcBuyVnd),
      sjcSellVnd: Number(digest.sjcSellVnd),
    };
  }

  @Get('archive')
  async getArchive(@Query('page') page?: string) {
    const result = await this.digestService.getArchive(page ? parseInt(page, 10) : 1);
    return {
      ...result,
      items: result.items.map(d => ({
        ...d,
        sjcBuyVnd: Number(d.sjcBuyVnd),
        sjcSellVnd: Number(d.sjcSellVnd),
      })),
    };
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async subscribe(@CurrentUser() user: JwtPayload) {
    await this.prisma.user.update({
      where: { id: user.sub },
      data: { digestOptIn: true },
    });
    return { subscribed: true };
  }

  @Delete('subscribe')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async unsubscribe(@CurrentUser() user: JwtPayload) {
    await this.prisma.user.update({
      where: { id: user.sub },
      data: { digestOptIn: false },
    });
    return { subscribed: false };
  }
}
