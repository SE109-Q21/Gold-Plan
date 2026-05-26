import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { PriceUpdatedEvent } from './price-updated.event';
import type { ArbitrageOpportunityDto, SpreadRankingDto, ExchangeRateDto, InternationalPriceDto } from '@gpls/shared';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000'],
    credentials: true,
  },
  path: '/ws',
})
export class PriceGateway {
  @WebSocketServer()
  server: Server;

  @OnEvent('price.updated')
  handlePriceUpdated(event: PriceUpdatedEvent): void {
    this.server.emit('price:updated', {
      brand: event.brand,
      goldType: event.goldType,
      buyPrice: event.buyPrice.toString(),
      sellPrice: event.sellPrice.toString(),
      recordedAt: event.recordedAt.toISOString(),
    });
  }

  @OnEvent('arbitrage.updated')
  handleArbitrageUpdated(opportunities: ArbitrageOpportunityDto[]): void {
    this.server.emit('arbitrage:updated', opportunities);
  }

  @OnEvent('spread.updated')
  handleSpreadUpdated(payload: { goldType: string; ranking: SpreadRankingDto[] }): void {
    this.server.emit('spread:updated', payload);
  }

  @OnEvent('international-price.updated')
  handleInternationalPriceUpdated(dto: InternationalPriceDto): void {
    this.server.emit('international-price:updated', dto);
  }

  @OnEvent('exchange-rate.updated')
  handleExchangeRateUpdated(dto: ExchangeRateDto): void {
    this.server.emit('exchange-rate:updated', dto);
  }
}
