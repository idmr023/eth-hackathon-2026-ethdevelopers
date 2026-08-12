export const UserRole = {
  ADMIN: "ADMIN",
  ANALYST: "ANALYST",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const InvoiceStatus = {
  PENDING: "PENDING",
  VALIDATED: "VALIDATED",
  BLOCKED: "BLOCKED",
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const ValidationType = {
  SUNAT_CONFORMITY: "SUNAT_CONFORMITY",
  CAVALI_FACTRACK: "CAVALI_FACTRACK",
} as const;
export type ValidationType =
  (typeof ValidationType)[keyof typeof ValidationType];

export const AnomalyType = {
  CREDIT_NOTE: "CREDIT_NOTE",
  BUYER_DISPUTE: "BUYER_DISPUTE",
} as const;
export type AnomalyType = (typeof AnomalyType)[keyof typeof AnomalyType];

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  permissions: string[];
  mustChangePassword: boolean;
  totpEnabled: boolean;
  factorId: string | null;
  walletAddress: string | null;
}

export interface AuthUserView {
  id: string;
  email: string;
  fullName: string;
  role: string;
  mustChangePassword: boolean;
  totpEnabled: boolean;
  factorId: string | null;
  walletAddress: string | null;
}

export interface Factor {
  id: string;
  name: string;
  ruc: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  rucEmisor: string;
  rucReceptor: string;
  numero: string;
  monto: string;
  currency: string;
  hash: string;
  status: InvoiceStatus;
  factorId: string;
  registeredBy: string;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceListItem extends Invoice {
  factor: { id: string; name: string; ruc: string };
}

export interface Validation {
  id: string;
  invoiceId: string;
  type: ValidationType;
  signedBy: string;
  txHash: string;
  createdAt: string;
}

export interface Anomaly {
  id: string;
  invoiceId: string;
  type: AnomalyType;
  detail: string;
  createdAt: string;
}

export interface FraudAlert {
  id: string;
  invoiceHash: string;
  rucEmisor: string;
  rucReceptor: string;
  numero: string;
  monto: string;
  existingFactorId: string | null;
  existingInvoiceId: string | null;
  attemptedFactorId: string | null;
  message: string;
  createdAt: string;
  existingFactor?: Factor | null;
  attemptedFactor?: Factor | null;
}

export interface InvoiceDetail extends InvoiceListItem {
  factor: Factor;
  validations: Validation[];
  anomalies: Anomaly[];
  fraudAlerts: FraudAlert[];
}

export interface Counts {
  total: number;
  byStatus: Record<InvoiceStatus, number>;
  fraudAlerts: number;
}

export interface DashboardOverview {
  counts: Counts;
  recentInvoices: InvoiceListItem[];
  recentFraudAlerts: FraudAlert[];
  recentAudit: AuditLogEntry[];
  recentUsers: User[];
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  factorId: string | null;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  tableName: string;
  recordId: string;
  operation: string;
  actorUserId: string | null;
  newData: unknown;
  createdAt: string;
}

export interface AdapterPortalStatus {
  provider: string;
  connected: boolean;
  source: "simulated" | "real";
  lastSyncAt: string;
  detail: string;
}

export interface AdapterSignResult {
  txHash: string;
  signedBy: string;
  message: string;
  invoice: InvoiceDetail;
}

export interface PageResult<T> {
  data: T[];
  total: number;
}

// ─── Blockchain: Auctions (BlindBidVault) ────────────────────────────
export const AuctionStatus = {
  ACTIVE: "ACTIVE",
  SETTLED: "SETTLED",
  CANCELLED: "CANCELLED",
} as const;
export type AuctionStatus = (typeof AuctionStatus)[keyof typeof AuctionStatus];

export const DelegationStatus = {
  PENDING: "PENDING",
  REVEALED: "REVEALED",
  FAILED: "FAILED",
} as const;
export type DelegationStatus =
  (typeof DelegationStatus)[keyof typeof DelegationStatus];

export interface Auction {
  id: string;
  contractAddress: string;
  auctionId: string;
  title: string;
  description: string | null;
  status: AuctionStatus;
  organizerAddress: string;
  treasuryAddress: string;
  tokenAddress: string;
  stakeAmount: string;
  minPrice: string;
  maxPrice: string;
  priceWeight: number;
  qualityWeight: number;
  commitEnd: string;
  revealEnd: string;
  winner: string | null;
  winningPrice: string | null;
  createdBlock: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuctionResponse {
  auctionId: string;
  txHash: string;
  auction: Auction;
}

export interface OnChainCommitment {
  hash: string;
  revealed: boolean;
  slashed: boolean;
  refunded: boolean;
  price: string;
  priceFormatted: string;
}

export interface Delegation {
  id: string;
  auctionId: string;
  bidderAddress: string;
  commitmentHash: string;
  price: string;
  secretEncrypted: string | null;
  proposalUri: string | null;
  status: DelegationStatus;
  revealTxHash: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditVerdict {
  id: string;
  auctionId: string;
  bidderAddress: string;
  aiScore: number;
  docHash: string | null;
  summaryUri: string | null;
  modelVersion: string | null;
  createdAt: string;
}
