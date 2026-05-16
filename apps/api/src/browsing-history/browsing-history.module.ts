import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BrowsingHistoryController } from './browsing-history.controller';
import { BrowsingHistoryService } from './browsing-history.service';

@Module({
  imports: [AuthModule],
  controllers: [BrowsingHistoryController], providers: [BrowsingHistoryService] })
export class BrowsingHistoryModule {}
