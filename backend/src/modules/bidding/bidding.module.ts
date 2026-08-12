import { Module } from '@nestjs/common';
import { BiddingService } from './bidding.service';
import { BiddingController } from './bidding.controller';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { CredentialsModule } from '../credentials/credentials.module';

/**
 * BlindBidVault auction management module.
 * Bridges on-chain BlindBidVault contract with database mirrors.
 */
@Module({
  imports: [BlockchainModule, CredentialsModule],
  controllers: [BiddingController],
  providers: [BiddingService],
  exports: [BiddingService],
})
export class BiddingModule {}
