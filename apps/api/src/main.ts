import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser = require('cookie-parser');
import helmet from 'helmet';
import { AppModule } from './app.module';
import * as dns from 'dns';

// Railway does not route IPv6; force all DNS lookups to resolve IPv4 addresses first
dns.setDefaultResultOrder('ipv4first');

// BigInt is not JSON-serializable by default; serialize as string to match DTO contracts
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.use(cookieParser());

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`API listening on port ${port}`);
}
bootstrap();
