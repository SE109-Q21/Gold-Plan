import { Module } from '@nestjs/common';
import { InternationalService } from './international.service';
import { InternationalController } from './international.controller';

@Module({
  providers: [InternationalService],
  controllers: [InternationalController],
})
export class InternationalModule {}
