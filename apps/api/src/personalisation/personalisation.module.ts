import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PersonalisationController } from './personalisation.controller';
import { PersonalisationService } from './personalisation.service';

@Module({
  imports: [AuthModule],
  controllers: [PersonalisationController],
  providers: [PersonalisationService],
})
export class PersonalisationModule {}
