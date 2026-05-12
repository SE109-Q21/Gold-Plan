import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { CrawlerModule } from './crawler/crawler.module';
import { PriceModule } from './price/price.module';
import { InternationalModule } from './international/international.module';
import { HealthController } from './health/health.controller';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { allowUnknown: true },
    }),
    DatabaseModule,
    CrawlerModule,
    PriceModule,
    InternationalModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
