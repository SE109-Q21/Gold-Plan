import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { PriceUpdatedEvent } from './price-updated.event';

@Injectable()
@WebSocketGateway({
  cors: { origin: '*' },
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
}
