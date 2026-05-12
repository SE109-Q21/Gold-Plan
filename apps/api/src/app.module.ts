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
  ],
  controllers: [HealthController],
})
export class AppModule {}
