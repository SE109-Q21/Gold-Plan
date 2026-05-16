import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PriceService } from './price.service';
import { PriceController } from './price.controller';

@Module({
  imports: [AuthModule],
  providers: [PriceService],
  controllers: [PriceController],
  exports: [PriceService],
})
export class PriceModule {}
