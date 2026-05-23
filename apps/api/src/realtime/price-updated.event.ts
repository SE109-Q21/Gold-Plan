export class PriceUpdatedEvent {
  brand: string;
  goldType: string;
  buyPrice: bigint;
  sellPrice: bigint;
  recordedAt: Date;
}
