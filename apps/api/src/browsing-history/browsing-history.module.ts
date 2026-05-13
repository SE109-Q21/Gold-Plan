import { Module } from '@nestjs/common';
import { BrowsingHistoryController } from './browsing-history.controller';
import { BrowsingHistoryService } from './browsing-history.service';

@Module({ controllers: [BrowsingHistoryController], providers: [BrowsingHistoryService] })
export class BrowsingHistoryModule {}
