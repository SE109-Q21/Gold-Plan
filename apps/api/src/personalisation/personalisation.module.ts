import { Module } from '@nestjs/common';
import { PersonalisationController } from './personalisation.controller';
import { PersonalisationService } from './personalisation.service';

@Module({
  controllers: [PersonalisationController],
  providers: [PersonalisationService],
})
export class PersonalisationModule {}
