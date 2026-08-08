import { Module } from '@nestjs/common';
import { ArbitrumService } from './arbitrum.service';

/**
 * Bridges the backend to the Arbitrum contracts (BlindBidVault).
 */
@Module({
  providers: [ArbitrumService],
  exports: [ArbitrumService],
})
export class BlockchainModule {}
