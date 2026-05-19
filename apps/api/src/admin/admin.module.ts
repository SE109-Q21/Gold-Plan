import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { CrawlerModule } from '../crawler/crawler.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [DatabaseModule, AuthModule, CrawlerModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
