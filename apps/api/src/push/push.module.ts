import { Module } from '@nestjs/common';
import { WebPushService } from './web-push.service';
import { PushController } from './push.controller';

@Module({
  providers: [WebPushService],
  controllers: [PushController],
  exports: [WebPushService],
})
export class PushModule {}
