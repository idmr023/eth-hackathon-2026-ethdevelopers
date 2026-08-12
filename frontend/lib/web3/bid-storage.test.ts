import { describe, it, expect, beforeEach } from 'vitest';
import { saveBidSecret, getBidSecret, clearBidSecret } from './bid-storage';

function mockLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

describe('bid-storage (localStorage)', () => {
  beforeEach(() => {
    (globalThis as { localStorage?: Storage }).localStorage = mockLocalStorage();
  });

  it('guarda y recupera el secreto por auctionId', () => {
    saveBidSecret(1n, { price: '100.00', secret: 'secreto123' });
    expect(getBidSecret(1n)).toEqual({ price: '100.00', secret: 'secreto123' });
  });

  it('devuelve null si no hay secreto guardado para ese auctionId', () => {
    expect(getBidSecret(999n)).toBeNull();
  });

  it('aísla secretos por auctionId', () => {
    saveBidSecret(1n, { price: '100', secret: 'a' });
    saveBidSecret(2n, { price: '200', secret: 'b' });
    expect(getBidSecret(1n)?.secret).toBe('a');
    expect(getBidSecret(2n)?.secret).toBe('b');
  });

  it('limpia el secreto tras el reveal', () => {
    saveBidSecret(1n, { price: '100', secret: 'x' });
    clearBidSecret(1n);
    expect(getBidSecret(1n)).toBeNull();
  });

  it('tolera JSON corrupto sin lanzar', () => {
    globalThis.localStorage.setItem('licitabien_bid_1', '{not-json');
    expect(getBidSecret(1n)).toBeNull();
  });

  it('rechaza estructuras que no cumplen el contrato BidSecret', () => {
    globalThis.localStorage.setItem('licitabien_bid_1', JSON.stringify({ price: 100 }));
    expect(getBidSecret(1n)).toBeNull();
  });
});
