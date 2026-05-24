import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WebPushService } from './web-push.service';
import { PushController } from './push.controller';

@Module({
  imports: [AuthModule],
  providers: [WebPushService],
  controllers: [PushController],
  exports: [WebPushService],
})
export class PushModule {}
