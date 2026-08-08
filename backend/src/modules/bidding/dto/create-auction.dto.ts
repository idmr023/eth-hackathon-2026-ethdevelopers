import {
  IsString,
  IsOptional,
  IsNumberString,
  IsInt,
  Min,
  Max,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuctionDto {
  @ApiProperty({ example: 'Licitación Factoring Q3 2026' })
  @IsString()
  @Length(1, 255)
  title!: string;

  @ApiPropertyOptional({ example: 'Descripción opcional de la licitación' })
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  description?: string;

  @ApiProperty({
    example: '1000.00',
    description: 'Stake amount in USDC (6 decimals)',
  })
  @IsString()
  @Matches(/^\d+(\.\d{1,6})?$/, {
    message: 'stakeAmount must be a valid decimal with up to 6 decimals',
  })
  stakeAmount!: string;

  @ApiProperty({ example: '950.00', description: 'Minimum bid price in USDC' })
  @IsString()
  @Matches(/^\d+(\.\d{1,6})?$/, {
    message: 'minPrice must be a valid decimal with up to 6 decimals',
  })
  minPrice!: string;

  @ApiProperty({ example: '1050.00', description: 'Maximum bid price in USDC' })
  @IsString()
  @Matches(/^\d+(\.\d{1,6})?$/, {
    message: 'maxPrice must be a valid decimal with up to 6 decimals',
  })
  maxPrice!: string;

  @ApiProperty({
    example: 1725000000,
    description: 'Commit window end (Unix timestamp seconds)',
  })
  @IsNumberString()
  commitEnd!: string;

  @ApiProperty({
    example: 1725086400,
    description: 'Reveal window end (Unix timestamp seconds)',
  })
  @IsNumberString()
  revealEnd!: string;

  @ApiPropertyOptional({
    example: '0x1234...',
    description: 'Optional treasury address',
  })
  @IsOptional()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'treasury must be a valid Ethereum address',
  })
  treasury?: string;
}

export class DelegateRevealDto {
  @ApiProperty({ example: '1', description: 'Auction ID (BigInt as string)' })
  @IsString()
  @Matches(/^\d+$/, { message: 'auctionId must be a positive integer string' })
  auctionId!: string;

  @ApiProperty({ example: '0x1234567890123456789012345678901234567890' })
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'bidder must be a valid Ethereum address',
  })
  bidder!: string;

  @ApiProperty({ example: '1000.00', description: 'Bid price in USDC' })
  @IsString()
  @Matches(/^\d+(\.\d{1,6})?$/, {
    message: 'price must be a valid decimal with up to 6 decimals',
  })
  price!: string;

  @ApiProperty({ example: 'my-secret-reveal-phrase-123' })
  @IsString()
  @Length(1, 1024)
  secret!: string;

  @ApiPropertyOptional({ example: 'ipfs://Qm...' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  proposalUri?: string;
}

export class SetAuditScoreDto {
  @ApiProperty({ example: '1' })
  @IsString()
  @Matches(/^\d+$/, { message: 'auctionId must be a positive integer string' })
  auctionId!: string;

  @ApiProperty({ example: '0x1234567890123456789012345678901234567890' })
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'bidder must be a valid Ethereum address',
  })
  bidder!: string;

  @ApiProperty({ example: 85, minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  aiScore!: number;

  @ApiPropertyOptional({ example: '0xabc...' })
  @IsOptional()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{64}$/, {
    message: 'docHash must be a valid bytes32 hex',
  })
  docHash?: string;

  @ApiPropertyOptional({ example: 'ipfs://Qm...' })
  @IsOptional()
  @IsString()
  summaryUri?: string;

  @ApiPropertyOptional({ example: 'gpt-4o-mini' })
  @IsOptional()
  @IsString()
  modelVersion?: string;
}
