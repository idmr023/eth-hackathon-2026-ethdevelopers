import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { keccak256, encodePacked, formatUnits } from 'viem';
import { BiddingService } from './bidding.service';
import { ArbitrumService } from '../blockchain/arbitrum.service';
import { CryptoService } from '../../shared/crypto.service';
import { PrismaService } from '../../shared/prisma.service';
import { CredentialsService } from '../credentials/credentials.service';
import { ErrorCodes } from '../../common/errors';
import { blindBidVaultAbi } from '../blockchain/abi/blind-bid-vault.abi';

const VAULT = '0x80d5408c6a0496e7318b94613d11128ba9d844ff' as const;
const BIDDER = '0x0000000000000000000000000000000000000001' as const;
const PRICE = 1_000n * 10n ** 6n;

describe('BiddingService', () => {
  let service: BiddingService;
  const blockchain = {
    canWrite: jest.fn().mockReturnValue(false),
    getBlindBidVaultAddress: jest.fn().mockReturnValue(VAULT),
    getSignerAddress: jest.fn(),
    read: jest.fn(),
    send: jest.fn(),
    parseEvent: jest.fn(),
    getLogs: jest.fn(),
  };
  const crypto = {
    encrypt: jest.fn().mockReturnValue('enc'),
    decrypt: jest.fn().mockReturnValue('my-secret'),
  };
  const prisma = {
    auction: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    delegation: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    auditVerdict: { upsert: jest.fn() },
  };
  const config = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const values: Record<string, unknown> = {
        ARBITRUM_TOKEN_DECIMALS: '6',
      };
      return values[key] ?? defaultValue;
    }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        BiddingService,
        { provide: ArbitrumService, useValue: blockchain },
        { provide: CryptoService, useValue: crypto },
        { provide: PrismaService, useValue: prisma },
        { provide: CredentialsService, useValue: {} },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = moduleRef.get(BiddingService);
  });

  beforeEach(() => jest.clearAllMocks());

  describe('commitmentHash', () => {
    it('coincide con keccak256(abi.encodePacked(uint256,string))', () => {
      const expected = keccak256(
        encodePacked(['uint256', 'string'], [PRICE, 'my-secret']),
      );
      expect(service.commitmentHash(PRICE, 'my-secret')).toBe(expected);
    });
  });

  describe('formatPrice', () => {
    it('formatea con 6 decimals del token', () => {
      expect(service.formatPrice(PRICE)).toBe(formatUnits(PRICE, 6));
    });
  });

  describe('recordAuditScore', () => {
    it('rechaza aiScore fuera de rango', async () => {
      // syncAuction necesita leer on-chain; simulamos con el mock read.
      blockchain.read.mockResolvedValue([
        '0x0000000000000000000000000000000000000001',
        '0x0000000000000000000000000000000000000002',
        1_000n,
        900n,
        1_100n,
        100n,
        200n,
        0n,
        '0x0000000000000000000000000000000000000000',
        0n,
      ]);
      await expect(
        service.recordAuditScore(1n, BIDDER, 150),
      ).rejects.toMatchObject({ code: ErrorCodes.VALIDATION_ERROR });
    });

    it('sin signer configurado solo espeja (dev mode) y no escribe on-chain', async () => {
      blockchain.read.mockResolvedValue([
        '0x0000000000000000000000000000000000000001',
        '0x0000000000000000000000000000000000000002',
        1_000n,
        900n,
        1_100n,
        100n,
        200n,
        0n,
        '0x0000000000000000000000000000000000000000',
        0n,
      ]);
      blockchain.canWrite.mockReturnValue(false);
      prisma.auction.upsert.mockResolvedValue({ id: 'a1' });
      prisma.auditVerdict.upsert.mockResolvedValue({ id: 'v1', aiScore: 80 });

      await service.recordAuditScore(1n, BIDDER, 80);

      expect(blockchain.send).not.toHaveBeenCalled();
      expect(prisma.auditVerdict.upsert).toHaveBeenCalled();
    });
  });

  describe('autoReveal / settle / slash sin signer', () => {
    it('autoReveal lanza BLOCKCHAIN_NOT_CONFIGURED si no hay signer', async () => {
      blockchain.canWrite.mockReturnValue(false);
      await expect(service.autoReveal(1n, BIDDER)).rejects.toMatchObject({
        code: ErrorCodes.BLOCKCHAIN_NOT_CONFIGURED,
      });
    });

    it('settleAuctionOnChain lanza BLOCKCHAIN_NOT_CONFIGURED si no hay signer', async () => {
      blockchain.canWrite.mockReturnValue(false);
      await expect(service.settleAuctionOnChain(1n)).rejects.toMatchObject({
        code: ErrorCodes.BLOCKCHAIN_NOT_CONFIGURED,
      });
    });

    it('slashBidOnChain lanza BLOCKCHAIN_NOT_CONFIGURED si no hay signer', async () => {
      blockchain.canWrite.mockReturnValue(false);
      await expect(service.slashBidOnChain(1n, BIDDER)).rejects.toMatchObject({
        code: ErrorCodes.BLOCKCHAIN_NOT_CONFIGURED,
      });
    });
  });

  // Sanity: el ABI importado contiene las funciones que invocamos on-chain.
  describe('ABI', () => {
    it('expone setAuditScore, revealBid, settleAuction, slashBid', () => {
      const names = blindBidVaultAbi
        .filter((x) => x.type === 'function')
        .map((x) => x.name);
      expect(names).toEqual(
        expect.arrayContaining([
          'setAuditScore',
          'revealBid',
          'settleAuction',
          'slashBid',
        ]),
      );
    });
  });
});
