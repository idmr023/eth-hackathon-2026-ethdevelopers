import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type Abi,
  type AbiEvent,
  type Address,
  type Chain,
  type Hash,
  type Log,
  type PublicClient,
  type TransactionReceipt,
  type WalletClient,
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  defineChain,
  http,
} from 'viem';
import { privateKeyToAccount, type Account } from 'viem/accounts';
import { arbitrum, arbitrumSepolia } from 'viem/chains';
import { AppError, ErrorCodes } from '../../common/errors';

export interface TxResult {
  hash: Hash;
  blockNumber: bigint;
  status: TransactionReceipt['status'];
  logs: TransactionReceipt['logs'];
}

export interface WriteParams {
  address: Address;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
}

/**
 * Generic NestJS ↔ Arbitrum bridge. Wraps viem clients and exposes typed
 * read/write helpers for any deployed contract ABI, plus the operator signer.
 */
@Injectable()
export class ArbitrumService implements OnModuleInit {
  private readonly logger = new Logger(ArbitrumService.name);
  private publicClient: PublicClient | undefined;
  private walletClient: WalletClient | undefined;
  private account: Address | undefined;
  private signer: Account | undefined;
  private chain: Chain | undefined;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const rpcUrl = this.configService.get<string>('ARBITRUM_RPC_URL');
    const chainId = parseInt(
      this.configService.get<string>('ARBITRUM_CHAIN_ID') ?? '421614',
      10,
    );
    const privateKey = this.configService.get<string>('ARBITRUM_PRIVATE_KEY');

    if (!rpcUrl) {
      this.logger.warn(
        'ARBITRUM_RPC_URL is not set — ArbitrumService is unavailable.',
      );
      return;
    }
    this.chain = this.resolveChain(chainId, rpcUrl);
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(rpcUrl),
    });

    if (privateKey) {
      const signer = privateKeyToAccount(privateKey as `0x${string}`);
      this.signer = signer;
      this.account = signer.address;
      this.walletClient = createWalletClient({
        chain: this.chain,
        transport: http(rpcUrl),
        account: signer,
      });
      this.logger.log(`Connected to Arbitrum with signer ${signer.address}`);
    } else {
      this.logger.warn(
        'ARBITRUM_PRIVATE_KEY is not set — write operations are unavailable.',
      );
    }
  }

  isConfigured(): boolean {
    return this.publicClient !== undefined;
  }

  canWrite(): boolean {
    return this.walletClient !== undefined && this.account !== undefined;
  }

  getSignerAddress(): Address | undefined {
    return this.account;
  }

  getChainId(): number | undefined {
    return this.chain?.id;
  }

  getBlindBidVaultAddress(): Address {
    const address = this.configService.get<string>('BLIND_BID_VAULT_ADDRESS');
    if (!address) {
      throw new AppError(
        ErrorCodes.SERVICE_UNAVAILABLE,
        HttpStatus.SERVICE_UNAVAILABLE,
        'BLIND_BID_VAULT_ADDRESS is not set.',
      );
    }
    return address as Address;
  }

  /**
   * Sends a write transaction as the operator account and waits for the receipt.
   */
  async send(params: WriteParams): Promise<TxResult> {
    const { publicClient, walletClient, signer, chain } = this.assertReady();
    const hash = await walletClient.writeContract({
      address: params.address,
      abi: params.abi,
      functionName: params.functionName,
      args: params.args,
      account: signer,
      chain,
    } as never);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === 'reverted') {
      throw new AppError(
        ErrorCodes.BLOCKCHAIN_TX_REVERTED,
        HttpStatus.BAD_REQUEST,
        `Transaction reverted: ${hash}`,
      );
    }
    return {
      hash,
      blockNumber: receipt.blockNumber,
      status: receipt.status,
      logs: receipt.logs,
    };
  }

  /**
   * Reads contract state using a generic ABI.
   */
  async read<T>(params: WriteParams): Promise<T> {
    if (!this.publicClient) {
      throw new AppError(
        ErrorCodes.BLOCKCHAIN_NOT_CONFIGURED,
        HttpStatus.SERVICE_UNAVAILABLE,
        'Arbitrum RPC is not configured.',
      );
    }
    return this.publicClient.readContract({
      address: params.address,
      abi: params.abi,
      functionName: params.functionName,
      args: params.args,
    }) as Promise<T>;
  }

  /**
   * Fetches raw logs matching an ABI event between two block heights.
   */
  async getLogs(params: {
    address: Address;
    event: AbiEvent;
    args?: Record<string, unknown>;
    fromBlock: bigint;
    toBlock?: bigint;
  }): Promise<Log[]> {
    if (!this.publicClient) {
      throw new AppError(
        ErrorCodes.BLOCKCHAIN_NOT_CONFIGURED,
        HttpStatus.SERVICE_UNAVAILABLE,
        'Arbitrum RPC is not configured.',
      );
    }
    return this.publicClient.getLogs({
      address: params.address,
      event: params.event,
      args: params.args,
      fromBlock: params.fromBlock,
      toBlock: params.toBlock ?? 'latest',
    } as never);
  }

  /**
   * Decodes the first log matching `eventName` from a receipt using `abi`.
   */
  parseEvent<T>(
    abi: Abi,
    logs: TransactionReceipt['logs'],
    eventName: string,
  ): T {
    for (const log of logs) {
      try {
        const decoded = decodeEventLog({
          abi,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === eventName) {
          return decoded as unknown as T;
        }
      } catch {
        // Ignore unrelated / non-decodable logs.
      }
    }
    throw new AppError(
      ErrorCodes.BLOCKCHAIN_EVENT_NOT_FOUND,
      HttpStatus.BAD_GATEWAY,
      `${eventName} event not found in transaction.`,
    );
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private resolveChain(chainId: number, rpcUrl: string): Chain {
    if (chainId === arbitrum.id) return arbitrum;
    if (chainId === arbitrumSepolia.id) return arbitrumSepolia;
    return defineChain({
      id: chainId,
      name: `Arbitrum (chain ${chainId})`,
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [rpcUrl] } },
    });
  }

  private assertReady(): {
    publicClient: PublicClient;
    walletClient: WalletClient;
    signer: Account;
    chain: Chain;
  } {
    if (
      !this.publicClient ||
      !this.walletClient ||
      !this.signer ||
      !this.chain
    ) {
      throw new AppError(
        ErrorCodes.BLOCKCHAIN_NOT_CONFIGURED,
        HttpStatus.SERVICE_UNAVAILABLE,
        'Arbitrum RPC / signer is not configured.',
      );
    }
    return {
      publicClient: this.publicClient,
      walletClient: this.walletClient,
      signer: this.signer,
      chain: this.chain,
    };
  }
}
