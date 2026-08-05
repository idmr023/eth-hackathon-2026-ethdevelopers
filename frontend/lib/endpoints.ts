import { apiFetch } from "./api";
import type {
  AdapterPortalStatus,
  AdapterSignResult,
  AuditLogEntry,
  DashboardOverview,
  Factor,
  FraudAlert,
  Invoice,
  InvoiceDetail,
  InvoiceListItem,
  InvoiceStatus,
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
