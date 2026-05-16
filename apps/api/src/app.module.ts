import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { CrawlerModule } from './crawler/crawler.module';
import { PriceModule } from './price/price.module';
import { InternationalModule } from './international/international.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HealthController } from './health/health.controller';
import { envValidationSchema } from './config/env.validation';
import { ExchangeRateModule } from './exchange-rate/exchange-rate.module';
import { ConverterModule } from './converter/converter.module';
import { SpreadModule } from './spread/spread.module';
import { AdminModule } from './admin/admin.module';
import { AlertsModule } from './alerts/alerts.module';
import { HeatIndexModule } from './heat-index/heat-index.module';
import { DcaModule } from './dca/dca.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { BrowsingHistoryModule } from './browsing-history/browsing-history.module';
import { PersonalisationModule } from './personalisation/personalisation.module';
import { AiModule } from './ai/ai.module';

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
    MailModule,
    AuthModule,
    UsersModule,
    ExchangeRateModule,
    ConverterModule,
    SpreadModule,
    AdminModule,
    AlertsModule,
    HeatIndexModule,
    DcaModule,
    PortfolioModule,
    BrowsingHistoryModule,
    PersonalisationModule,
    AiModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
