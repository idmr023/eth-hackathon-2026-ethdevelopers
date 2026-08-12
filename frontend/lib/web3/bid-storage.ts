export interface BidSecret {
  price: string;
  secret: string;
}

const PREFIX = 'licitabien_bid_';

function key(auctionId: bigint): string {
  return `${PREFIX}${auctionId.toString()}`;
}

function ls(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function saveBidSecret(auctionId: bigint, secret: BidSecret): void {
  const storage = ls();
  if (!storage) return;
  try {
    storage.setItem(key(auctionId), JSON.stringify(secret));
  } catch {
    // Cuota llena o almacenamiento bloqueado (modo incógnito): no se puede persistir.
  }
}

export function getBidSecret(auctionId: bigint): BidSecret | null {
  const storage = ls();
  if (!storage) return null;
  try {
    const raw = storage.getItem(key(auctionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BidSecret>;
    if (typeof parsed.price !== 'string' || typeof parsed.secret !== 'string') {
      return null;
    }
    return { price: parsed.price, secret: parsed.secret };
  } catch {
    return null;
  }
}

export function clearBidSecret(auctionId: bigint): void {
  const storage = ls();
  if (!storage) return;
  try {
    storage.removeItem(key(auctionId));
  } catch {
    // no-op
  }
}
