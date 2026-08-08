import { apiFetch } from "./api";
import type {
  AdapterPortalStatus,
  AdapterSignResult,
  Auction,
  AuctionResponse,
  AuditLogEntry,
  AuditVerdict,
  DashboardOverview,
  Delegation,
  Factor,
  FraudAlert,
  Invoice,
  InvoiceDetail,
  InvoiceListItem,
  InvoiceStatus,
  OnChainCommitment,
  PageResult,
  User,
} from "./types";
export const dashboardApi = {
  overview: () => apiFetch<DashboardOverview>("/api/dashboard"),
};

export const invoicesApi = {
  list: (query?: {
    page?: number;
    limit?: number;
    status?: InvoiceStatus;
    factorId?: string;
    q?: string;
  }) => apiFetch<InvoiceListItem[]>("/api/invoices", { query }),
  detail: (id: string) => apiFetch<InvoiceDetail>(`/api/invoices/${id}`),
  register: (body: {
    rucEmisor: string;
    rucReceptor: string;
    numero: string;
    monto: number;
    currency?: string;
    factorId?: string;
    metadata?: string;
  }) => apiFetch<Invoice>("/api/invoices/register", { method: "POST", body }),
};

export const factorsApi = {
  list: (query?: { page?: number; limit?: number; q?: string }) =>
    apiFetch<Factor[]>("/api/factors", { query }),
  create: (body: { name: string; ruc: string }) =>
    apiFetch<Factor>("/api/factors", { method: "POST", body }),
};

export const adaptersApi = {
  status: () => apiFetch<{ adapters: AdapterPortalStatus[] }>("/api/adapters/status"),
  signSunat: (invoiceId: string) =>
    apiFetch<AdapterSignResult>("/api/adapters/sunat/conformity", {
      method: "POST",
      body: { invoiceId },
    }),
  signCavali: (invoiceId: string) =>
    apiFetch<AdapterSignResult>("/api/adapters/cavali/factrack", {
      method: "POST",
      body: { invoiceId },
    }),
};

export const anomaliesApi = {
  create: (body: { invoiceId: string; type: string; detail?: string }) =>
    apiFetch<Invoice>("/api/anomalies", { method: "POST", body }),
};

export const fraudAlertsApi = {
  list: (query?: { page?: number; limit?: number }) =>
    apiFetch<FraudAlert[]>("/api/invoices/fraud-alerts", { query }),
};

export const auditApi = {
  list: (query?: {
    page?: number;
    limit?: number;
    tableName?: string;
    operation?: string;
  }) => apiFetch<AuditLogEntry[]>("/api/audit", { query }),
};

export const usersApi = {
  list: (query?: { page?: number; limit?: number; q?: string }) =>
    apiFetch<User[]>("/api/users", { query }),
  create: (body: {
    email: string;
    fullName: string;
    password: string;
    role?: string;
    factorId?: string;
  }) => apiFetch<User>("/api/users", { method: "POST", body }),
  updateStatus: (id: string, status: string) =>
    apiFetch<User>(`/api/users/${id}/status`, {
      method: "PATCH",
      body: { status },
    }),
};

export const auctionsApi = {
  list: (query?: { page?: number; limit?: number }) =>
    apiFetch<PageResult<Auction>>("/api/auctions", { query }),
  detail: (id: string) => apiFetch<Auction>(`/api/auctions/${id}`),
  bidders: (id: string) => apiFetch<string[]>(`/api/auctions/${id}/bidders`),
  commitment: (id: string, bidder: string) =>
    apiFetch<OnChainCommitment>(`/api/auctions/${id}/commitment/${bidder}`),
  create: (body: {
    title: string;
    description?: string;
    stakeAmount: string;
    minPrice: string;
    maxPrice: string;
    commitEnd: string;
    revealEnd: string;
    treasury?: string;
  }) => apiFetch<AuctionResponse>("/api/auctions", { method: "POST", body }),
  delegateReveal: (
    id: string,
    body: { bidder: string; price: string; secret: string; proposalUri?: string },
  ) =>
    apiFetch<{ delegation: Delegation; status: Delegation["status"] }>(
      `/api/auctions/${id}/delegate-reveal`,
      { method: "POST", body },
    ),
  setAuditScore: (
    id: string,
    body: {
      bidder: string;
      aiScore: number;
      docHash?: string;
      summaryUri?: string;
      modelVersion?: string;
    },
  ) => apiFetch<AuditVerdict>(`/api/auctions/${id}/audit-score`, { method: "POST", body }),
};
