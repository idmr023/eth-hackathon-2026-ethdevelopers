import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Auction, Delegation, AuditVerdict } from '@prisma/client';
import { BiddingService, OnChainCommitment } from './bidding.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { DelegateRevealDto } from './dto/create-auction.dto';
import { SetAuditScoreDto } from './dto/create-auction.dto';

@ApiTags('auctions')
@Controller('auctions')
export class BiddingController {
  constructor(private readonly bidding: BiddingService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new BlindBid auction on-chain and mirror it',
  })
  @ApiResponse({ status: 201, description: 'Auction created successfully' })
  async create(@Body() dto: CreateAuctionDto) {
    const { auctionId, txHash, auction } =
      await this.bidding.createAuction(dto);
    return {
      auctionId: auctionId.toString(),
      txHash,
      auction: this.serializeAuction(auction),
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all mirrored auctions (syncs active ones)' })
  @ApiResponse({ status: 200, description: 'List of auctions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(@Query('page') page?: number, @Query('limit') limit?: number) {
    const auctions = await this.bidding.listAuctions();
    // Simple pagination in memory (for now)
    const p = page ?? 1;
    const l = limit ?? 20;
    const start = (p - 1) * l;
    const paginated = auctions.slice(start, start + l);
    return {
      data: paginated.map((a) => this.serializeAuction(a)),
      total: auctions.length,
      page: p,
      limit: l,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get auction by ID (syncs from chain)' })
  @ApiResponse({ status: 200, description: 'Auction details' })
  @ApiResponse({ status: 404, description: 'Auction not found' })
  async get(@Param('id', ParseIntPipe) id: number) {
    const auction = await this.bidding.syncAuction(BigInt(id));
    return this.serializeAuction(auction);
  }

  @Get(':id/bidders')
  @ApiOperation({ summary: 'Get list of bidders for an auction' })
  async bidders(@Param('id', ParseIntPipe) id: number) {
    return this.bidding.getBidders(BigInt(id));
  }

  @Get(':id/commitment/:bidder')
  @ApiOperation({ summary: 'Get on-chain commitment for a bidder' })
  @ApiResponse({ status: 200, description: 'Commitment details' })
  async commitment(
    @Param('id', ParseIntPipe) id: number,
    @Param('bidder') bidder: string,
  ): Promise<OnChainCommitment & { priceFormatted: string }> {
    const commitment = await this.bidding.getCommitment(
      BigInt(id),
      bidder as `0x${string}`,
    );
    return {
      ...commitment,
      priceFormatted: this.bidding.formatPrice(commitment.price),
    };
  }

  @Post(':id/delegate-reveal')
  @ApiOperation({ summary: 'Delegate reveal secret for auto-reveal by agent' })
  @ApiResponse({ status: 201, description: 'Delegation created/updated' })
  async delegateReveal(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Omit<DelegateRevealDto, 'auctionId'>,
  ): Promise<{ delegation: Delegation; status: Delegation['status'] }> {
    const delegation = await this.bidding.delegateReveal({
      ...dto,
      auctionId: id.toString(),
    });
    return { delegation, status: delegation.status };
  }

  @Post(':id/audit-score')
  @ApiOperation({ summary: 'Record AI quality score (auditor role required)' })
  @ApiResponse({ status: 201, description: 'Audit score recorded' })
  async setAuditScore(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Omit<SetAuditScoreDto, 'auctionId'>,
  ): Promise<AuditVerdict> {
    return this.bidding.recordAuditScore(
      BigInt(id),
      dto.bidder as `0x${string}`,
      dto.aiScore,
      dto.docHash,
      dto.summaryUri,
      dto.modelVersion,
    );
  }

  private serializeAuction(auction: Auction): Record<string, unknown> {
    const {
      commitEnd,
      revealEnd,
      stakeAmount,
      minPrice,
      maxPrice,
      winningPrice,
      auctionId,
      createdAt,
      updatedAt,
      createdBlock,
      ...rest
    } = auction;
    return {
      ...rest,
      auctionId: auctionId.toString(),
      createdBlock: createdBlock?.toString() ?? null,
      winner: auction.winner ?? null,
      winningPrice: winningPrice?.toString() ?? null,
      commitEnd: commitEnd.toISOString(),
      revealEnd: revealEnd.toISOString(),
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      stakeAmount: this.bidding.formatPrice(stakeAmount),
      minPrice: this.bidding.formatPrice(minPrice),
      maxPrice: this.bidding.formatPrice(maxPrice),
    };
  }
}
