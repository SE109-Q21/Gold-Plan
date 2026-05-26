import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
import { DcaModule } from './dca/dca.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { BrowsingHistoryModule } from './browsing-history/browsing-history.module';
import { PersonalisationModule } from './personalisation/personalisation.module';
import { AiModule } from './ai/ai.module';
import { DigestModule } from './digest/digest.module';
import { SmartAlertsModule } from './smart-alerts/smart-alerts.module';
import { ForecastModule } from './forecast/forecast.module';
import { PushModule } from './push/push.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RealtimeModule } from './realtime/realtime.module';
import { ArbitrageModule } from './arbitrage/arbitrage.module';
import { AssetsComparisonModule } from './assets-comparison/assets-comparison.module';
import { DemoModule } from './demo/demo.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { allowUnknown: true },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    EventEmitterModule.forRoot(),
    RealtimeModule,
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
    DcaModule,
    PortfolioModule,
    BrowsingHistoryModule,
    PersonalisationModule,
    AiModule,
    DigestModule,
    SmartAlertsModule,
    ForecastModule,
    ArbitrageModule,
    AssetsComparisonModule,
    PushModule,
    DemoModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
