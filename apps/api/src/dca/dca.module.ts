import { Module } from '@nestjs/common';
import { DcaService } from './dca.service';
import { DcaController } from './dca.controller';

@Module({
  providers: [DcaService],
  controllers: [DcaController],
  exports: [DcaService],
})
export class DcaModule {}
