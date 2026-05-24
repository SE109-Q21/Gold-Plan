import { Body, Controller, Delete, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WebPushService } from './web-push.service';

@Controller('push')
export class PushController {
  constructor(private readonly webPushService: WebPushService) {}

  @Get('vapid-key')
  getVapidKey() {
    return { publicKey: this.webPushService.getPublicKey() };
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  async subscribe(
    @Req() req: { user: { sub: string } },
    @Body() body: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    await this.webPushService.saveSubscription(req.user.sub, body);
    return { ok: true };
  }

  @Delete('subscribe')
  @UseGuards(JwtAuthGuard)
  async unsubscribe(
    @Req() req: { user: { sub: string } },
    @Body() body: { endpoint: string },
  ) {
    await this.webPushService.removeSubscription(req.user.sub, body.endpoint);
    return { ok: true };
  }
}
