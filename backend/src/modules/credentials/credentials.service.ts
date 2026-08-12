import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Address, encodeAbiParameters, parseAbiParameters } from 'viem';
import { ArbitrumService } from '../blockchain/arbitrum.service';
import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class CredentialsService {
  private readonly logger = new Logger(CredentialsService.name);
  private readonly easAddress: Address;
  private readonly schemaRegistryAddress: Address;
  private readonly schemaUid: `0x${string}`;

  constructor(
    private readonly blockchain: ArbitrumService,
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.easAddress = configService.get<string>(
      'EAS_CONTRACT_ADDRESS',
    ) as Address;
    this.schemaRegistryAddress = configService.get<string>(
      'EAS_SCHEMA_REGISTRY_ADDRESS',
    ) as Address;
    this.schemaUid = configService.get<string>(
      'EAS_SCHEMA_UID',
    ) as `0x${string}`;
  }

  async attest(
    recipient: Address,
    title: string,
    description: string,
    issuer: string,
    auctionId: bigint,
    winningPrice: bigint,
    aiScore: number,
    badge: string,
    evidenceUri: string,
  ): Promise<string> {
    if (!this.blockchain.canWrite()) {
      throw new Error('Blockchain write not configured');
    }

    const encodedData = encodeAbiParameters(
      parseAbiParameters(
        'string title, string description, string issuer, address recipientWallet, uint256 auctionId, uint256 winningPrice, uint256 aiScore, string badge, string evidenceUri',
      ),
      [
        title,
        description,
        issuer,
        recipient,
        auctionId,
        winningPrice,
        BigInt(aiScore),
        badge,
        evidenceUri,
      ],
    );

    const tx = await this.blockchain.send({
      address: this.easAddress,
      abi: [
        {
          inputs: [
            {
              components: [
                { internalType: 'bytes32', name: 'schema', type: 'bytes32' },
                {
                  components: [
                    {
                      internalType: 'address',
                      name: 'recipient',
                      type: 'address',
                    },
                    {
                      internalType: 'uint64',
                      name: 'expirationTime',
                      type: 'uint64',
                    },
                    { internalType: 'bool', name: 'revocable', type: 'bool' },
                    {
                      internalType: 'bytes32',
                      name: 'refUID',
                      type: 'bytes32',
                    },
                    { internalType: 'bytes', name: 'data', type: 'bytes' },
                    { internalType: 'uint256', name: 'value', type: 'uint256' },
                  ],
                  internalType: 'struct AttestationRequestData',
                  name: 'data',
                  type: 'tuple',
                },
              ],
              internalType: 'struct AttestationRequest',
              name: 'request',
              type: 'tuple',
            },
          ],
          name: 'attest',
          outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
          stateMutability: 'payable',
          type: 'function',
        },
      ],
      functionName: 'attest',
      args: [
        {
          schema: this.schemaUid,
          data: {
            recipient,
            expirationTime: 0n,
            revocable: true,
            refUID:
              '0x0000000000000000000000000000000000000000000000000000000000000000',
            data: encodedData,
            value: 0n,
          },
        },
      ],
    });

    const uid = this.blockchain.parseEvent<{ args: { uid: string } }>(
      [
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: 'bytes32',
              name: 'uid',
              type: 'bytes32',
            },
            {
              indexed: true,
              internalType: 'bytes32',
              name: 'schema',
              type: 'bytes32',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'recipient',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'attester',
              type: 'address',
            },
          ],
          name: 'Attested',
          type: 'event',
        },
      ],
      tx.logs,
      'Attested',
    );

    // Persist to DB
    await this.prisma.credential.create({
      data: {
        uid: uid.args.uid,
        schemaUid: this.schemaUid,
        recipientWallet: recipient.toLowerCase(),
        attester: this.blockchain.getSignerAddress()!,
        auctionId: auctionId.toString(),
        title,
        description,
        issuer,
        badge,
        awardedAt: new Date(),
        txHash: tx.hash,
      },
    });

    return uid.args.uid;
  }

  async listForWallet(wallet: Address) {
    return this.prisma.credential.findMany({
      where: { recipientWallet: wallet.toLowerCase() },
      orderBy: { awardedAt: 'desc' },
    });
  }

  async getCredentialByUid(uid: string) {
    return this.prisma.credential.findUnique({
      where: { uid },
    });
  }
}
