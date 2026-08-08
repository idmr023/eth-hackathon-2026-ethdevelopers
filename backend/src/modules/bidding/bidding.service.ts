import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Auction, Delegation, AuditVerdict } from '@prisma/client';
import {
  type Address,
  encodePacked,
  formatUnits,
  keccak256,
  parseAbiItem,
  parseUnits,
} from 'viem';
import { AppError, ErrorCodes } from '../../common/errors';
import { ArbitrumService } from '../blockchain/arbitrum.service';
import { blindBidVaultAbi } from '../blockchain/abi/blind-bid-vault.abi';
import { CryptoService } from '../../shared/crypto.service';
import { PrismaService } from '../../shared/prisma.service';

const BID_COMMITTED_EVENT = parseAbiItem(
  'event BidCommitted(uint256 indexed auctionId, address indexed bidder, bytes32 commitment)',
);

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export interface OnChainAuction {
  organizer: Address;
  treasury: Address;
  stakeAmount: bigint;
  minPrice: bigint;
  maxPrice: bigint;
  commitEnd: bigint;
  revealEnd: bigint;
  state: number;
  winner: Address;
  winningPrice: bigint;
}

export interface OnChainCommitment {
  hash: `0x${string}`;
  revealed: boolean;
  slashed: boolean;
  refunded: boolean;
  price: bigint;
}

export interface CreateAuctionInput {
  title: string;
  description?: string;
  stakeAmount: string; // USDC amount (e.g., "1000.00")
  minPrice: string; // USDC amount
  maxPrice: string; // USDC amount
  commitEnd: string; // Unix timestamp (seconds) as number string
  revealEnd: string; // Unix timestamp (seconds) as number string
  treasury?: string; // Optional treasury address
}

export interface DelegateRevealInput {
  auctionId: string; // BigInt as string
  bidder: string; // Address
  price: string; // USDC amount
  secret: string; // Reveal secret
  proposalUri?: string;
}

/**
 * Orchestrates BlindBidVault interactions: mirrors on-chain auctions into the
 * database and manages secret delegation for auto-reveal.
 */
@Injectable()
export class BiddingService {
  private readonly logger = new Logger(BiddingService.name);
  private readonly tokenDecimals: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchain: ArbitrumService,
    private readonly crypto: CryptoService,
    configService: ConfigService,
  ) {
    this.tokenDecimals = parseInt(
      configService.get<string>('ARBITRUM_TOKEN_DECIMALS') ?? '6',
      10,
    );
  }

  getVaultAddress(): Address {
    return this.blockchain.getBlindBidVaultAddress();
  }

  /**
   * Creates an auction on-chain with the operator account and mirrors it.
   */
  async createAuction(dto: CreateAuctionInput): Promise<{
    auctionId: bigint;
    txHash: string;
    auction: Auction;
  }> {
    if (!this.blockchain.canWrite()) {
      throw new AppError(
        ErrorCodes.BLOCKCHAIN_NOT_CONFIGURED,
        HttpStatus.SERVICE_UNAVAILABLE,
        'Blockchain write operations not configured (missing ARBITRUM_PRIVATE_KEY).',
      );
    }

    const stakeAmount = parseUnits(dto.stakeAmount, this.tokenDecimals);
    const minPrice = parseUnits(dto.minPrice, this.tokenDecimals);
    const maxPrice = parseUnits(dto.maxPrice, this.tokenDecimals);
    const treasury = (dto.treasury ??
      this.blockchain.getSignerAddress()) as Address;

    const tx = await this.blockchain.send({
      address: this.getVaultAddress(),
      abi: blindBidVaultAbi,
      functionName: 'createAuction',
      args: [
        treasury,
        stakeAmount,
        minPrice,
        maxPrice,
        BigInt(dto.commitEnd),
        BigInt(dto.revealEnd),
      ],
    });

    const event = this.blockchain.parseEvent<{ args: { auctionId: bigint } }>(
      blindBidVaultAbi,
      tx.logs,
      'AuctionCreated',
    );

    const auction = await this.syncAuction(
      event.args.auctionId,
      tx.blockNumber,
    );
    return { auctionId: event.args.auctionId, txHash: tx.hash, auction };
  }

  /**
   * Re-reads an auction on-chain and upserts its database mirror.
   */
  async syncAuction(
    auctionId: bigint,
    createdBlock?: bigint,
  ): Promise<Auction> {
    const onChain = await this.getAuctionOnChain(auctionId);
    const [priceWeight, qualityWeight, token] = await Promise.all([
      this.blockchain.read<bigint>({
        address: this.getVaultAddress(),
        abi: blindBidVaultAbi,
        functionName: 'priceWeight',
        args: [],
      }),
      this.blockchain.read<bigint>({
        address: this.getVaultAddress(),
        abi: blindBidVaultAbi,
        functionName: 'qualityWeight',
        args: [],
      }),
      this.blockchain.read<Address>({
        address: this.getVaultAddress(),
        abi: blindBidVaultAbi,
        functionName: 'token',
        args: [],
      }),
    ]);

    return this.prisma.auction.upsert({
      where: {
        auction_contract_address_auction_id_key: {
          contractAddress: this.getVaultAddress().toLowerCase(),
          auctionId,
        },
      },
      create: {
        contractAddress: this.getVaultAddress().toLowerCase(),
        auctionId,
        title: `Licitación #${auctionId.toString()}`,
        description: undefined,
        status: this.mapState(onChain.state),
        organizerAddress: onChain.organizer,
        treasuryAddress: onChain.treasury,
        tokenAddress: token,
        stakeAmount: onChain.stakeAmount,
        minPrice: onChain.minPrice,
        maxPrice: onChain.maxPrice,
        priceWeight: Number(priceWeight),
        qualityWeight: Number(qualityWeight),
        commitEnd: new Date(Number(onChain.commitEnd) * 1000),
        revealEnd: new Date(Number(onChain.revealEnd) * 1000),
        createdBlock: createdBlock ?? undefined,
      },
      update: {
        status: this.mapState(onChain.state),
        winner: onChain.winner === ZERO_ADDRESS ? null : onChain.winner,
        winningPrice: onChain.winningPrice === 0n ? null : onChain.winningPrice,
        createdBlock: createdBlock ?? undefined,
      },
    });
  }

  /**
   * Reads an auction directly from the contract.
   */
  async getAuctionOnChain(auctionId: bigint): Promise<OnChainAuction> {
    const result = await this.blockchain.read<
      [
        Address,
        Address,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        Address,
        bigint,
      ]
    >({
      address: this.getVaultAddress(),
      abi: blindBidVaultAbi,
      functionName: 'auctions',
      args: [auctionId],
    });

    const [
      organizer,
      treasury,
      stakeAmount,
      minPrice,
      maxPrice,
      commitEnd,
      revealEnd,
      state,
      winner,
      winningPrice,
    ] = result;

    if (organizer === '0x0000000000000000000000000000000000000000') {
      throw new AppError(
        ErrorCodes.AUCTION_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        `Auction ${auctionId.toString()} does not exist on-chain.`,
      );
    }
    return {
      organizer,
      treasury,
      stakeAmount,
      minPrice,
      maxPrice,
      commitEnd,
      revealEnd,
      state: Number(state),
      winner,
      winningPrice,
    };
  }

  /**
   * Lists mirrored auctions, syncing active ones against the chain.
   */
  async listAuctions(): Promise<Auction[]> {
    const active = await this.prisma.auction.findMany({
      where: { status: 'ACTIVE', revealEnd: { gte: new Date() } },
    });
    for (const auction of active) {
      try {
        await this.syncAuction(auction.auctionId);
      } catch (error) {
        this.logger.warn(
          `Sync failed for auction ${auction.auctionId.toString()}: ${String(error)}`,
        );
      }
    }
    return this.prisma.auction.findMany({ orderBy: { createdAt: 'desc' } });
  }

  /**
   * Returns the on-chain commitment for a bidder.
   */
  async getCommitment(
    auctionId: bigint,
    bidder: Address,
  ): Promise<OnChainCommitment> {
    const [hash, revealed, slashed, refunded, price] =
      await this.blockchain.read<
        [`0x${string}`, boolean, boolean, boolean, bigint]
      >({
        address: this.getVaultAddress(),
        abi: blindBidVaultAbi,
        functionName: 'commitments',
        args: [auctionId, bidder],
      });
    return { hash, revealed, slashed, refunded, price };
  }

  /**
   * Enumerates bidders from BidCommitted events.
   */
  async getBidders(auctionId: bigint): Promise<Address[]> {
    const mirror = await this.prisma.auction.findUnique({
      where: {
        auction_contract_address_auction_id_key: {
          contractAddress: this.getVaultAddress().toLowerCase(),
          auctionId,
        },
      },
    });
    const fromBlock = mirror?.createdBlock ?? 0n;

    const logs = await this.blockchain.getLogs({
      address: this.getVaultAddress(),
      event: BID_COMMITTED_EVENT,
      args: { auctionId },
      fromBlock,
    });

    return [
      ...new Set(
        logs.map(
          (log) =>
            (log as unknown as { args: { bidder: Address } }).args.bidder,
        ),
      ),
    ];
  }

  /**
   * Stores a bidder's reveal secret (AES-GCM encrypted at rest) for the agent.
   * Validates that the provided (price, secret) matches the committed hash.
   */
  async delegateReveal(dto: DelegateRevealInput): Promise<Delegation> {
    const auctionId = BigInt(dto.auctionId);
    const bidder = dto.bidder.toLowerCase() as Address;
    const price = parseUnits(dto.price, this.tokenDecimals);

    const commitment = await this.getCommitment(auctionId, bidder);
    if (
      commitment.hash ===
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    ) {
      throw new AppError(
        ErrorCodes.BID_NOT_COMMITTED,
        HttpStatus.NOT_FOUND,
        `Bidder ${bidder} has not committed to auction ${auctionId.toString()}.`,
      );
    }
    if (this.commitmentHash(price, dto.secret) !== commitment.hash) {
      throw new AppError(
        ErrorCodes.INVALID_REVEAL_SECRET,
        HttpStatus.BAD_REQUEST,
        'The provided (price, secret) does not match the committed hash.',
      );
    }

    const auction = await this.syncAuction(auctionId);

    return this.prisma.delegation.upsert({
      where: {
        delegation_auction_id_bidder_address_key: {
          auctionId: auction.id,
          bidderAddress: bidder,
        },
      },
      create: {
        auctionId: auction.id,
        bidderAddress: bidder,
        commitmentHash: commitment.hash,
        price,
        secretEncrypted: this.crypto.encrypt(dto.secret),
        proposalUri: dto.proposalUri ?? null,
        status: 'PENDING',
      },
      update: {
        price,
        secretEncrypted: this.crypto.encrypt(dto.secret),
        proposalUri: dto.proposalUri ?? null,
        status: 'PENDING',
        error: null,
      },
    });
  }

  /**
   * Records an AI quality score for a bidder (auditor only).
   */
  async recordAuditScore(
    auctionId: bigint,
    bidder: Address,
    aiScore: number,
    docHash?: string,
    summaryUri?: string,
    modelVersion?: string,
  ): Promise<AuditVerdict> {
    const auction = await this.syncAuction(auctionId);

    return this.prisma.auditVerdict.upsert({
      where: {
        audit_verdict_auction_id_bidder_address_key: {
          auctionId: auction.id,
          bidderAddress: bidder,
        },
      },
      create: {
        auctionId: auction.id,
        bidderAddress: bidder,
        aiScore,
        docHash: docHash ?? null,
        summaryUri: summaryUri ?? null,
        modelVersion: modelVersion ?? null,
      },
      update: {
        aiScore,
        docHash: docHash ?? null,
        summaryUri: summaryUri ?? null,
        modelVersion: modelVersion ?? null,
      },
    });
  }

  /** keccak256(abi.encodePacked(uint256 price, string secret)) — matches the contract. */
  commitmentHash(price: bigint, secret: string): `0x${string}` {
    return keccak256(encodePacked(['uint256', 'string'], [price, secret]));
  }

  /** Formats a wei-level amount into token units for API responses. */
  formatPrice(value: bigint): string {
    return formatUnits(value, this.tokenDecimals);
  }

  private mapState(state: number): Auction['status'] {
    if (state === 0) return 'ACTIVE';
    if (state === 1) return 'SETTLED';
    return 'CANCELLED';
  }
}
