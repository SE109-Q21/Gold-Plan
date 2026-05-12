import { Module } from '@nestjs/common';
import { SpreadService } from './spread.service';
import { SpreadController } from './spread.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [SpreadService],
  controllers: [SpreadController],
  exports: [SpreadService],
})
export class SpreadModule {}
