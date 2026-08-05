"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { dashboardApi } from "@/lib/endpoints";
import { PageHeader, Card, EmptyState } from "@/components/ui/card";
import { StatusBadge, RoleBadge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/table";
import { Spinner } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/components/is-auth-provider";
import { canViewAudit, canViewInvoices, canManageUsers, canViewFraudAlerts } from "@/lib/permissions";
import type { DashboardOverview } from "@/lib/types";
import { formatMoney, formatDate, shortHash } from "@/lib/format";

export function DashboardView() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboardApi
      .overview()
      .then((result) => setData(result.data))
      .catch((cause) =>
        setError(cause instanceof ApiError ? cause.message : "No se pudo cargar el dashboard."),
      );
  }, []);

  if (error) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <EmptyState title="Error" description={error} />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex flex-1 items-center justify-center gap-2 p-6 text-muted">
        <Spinner /> Cargando dashboard…
      </main>
    );
  }

  const showInvoices = canViewInvoices(user);
  const showAudit = canViewAudit(user);
  const showUsers = canManageUsers(user);
  const showFraud = canViewFraudAlerts(user);

  return (
    <main className="flex-1 space-y-8 p-6">
      <PageHeader
        title="Dashboard"
        subtitle="Resumen operativo del protocolo de factoring."
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Facturas totales"
          value={String(data.counts.total)}
          accent="text-foreground"
        />
        <StatCard
          label="Pendientes"
          value={String(data.counts.byStatus.PENDING)}
          accent="text-warning"
        />
        <StatCard
          label="Validadas"
          value={String(data.counts.byStatus.VALIDATED)}
          accent="text-success"
        />
        <StatCard
          label="Alertas de fraude"
          value={String(data.counts.fraudAlerts)}
          accent="text-danger"
        />
      </section>

      {showFraud && data.recentFraudAlerts.length > 0 && (
        <Card
          title="Alertas de fraude recientes"
          actions={
            <Link href="/fraud-alerts" className="text-sm text-primary hover:underline">
              Ver todas →
            </Link>
          }
        >
          <ul className="divide-y divide-border">
            {data.recentFraudAlerts.map((alert) => (
              <li key={alert.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-foreground">
                    {shortHash(alert.invoiceHash)}
                  </p>
                  <p className="text-xs text-muted">
                    {alert.message} · {formatDate(alert.createdAt)}
                  </p>
                </div>
                <span className="font-mono text-xs text-danger">FRAUD</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {showInvoices && (
        <Card
          title="Facturas recientes"
          actions={
            <Link href="/invoices" className="text-sm text-primary hover:underline">
              Ver todas →
            </Link>
          }
        >
          <DataTable
            columns={[
              { key: "hash", header: "Hash" },
              { key: "numero", header: "Nº factura" },
              { key: "monto", header: "Monto" },
              { key: "estado", header: "Estado" },
              { key: "creado", header: "Registrada" },
            ]}
            rows={data.recentInvoices.map((invoice) => ({
              id: invoice.id,
              cells: {
                hash: <span className="font-mono text-xs">{shortHash(invoice.hash)}</span>,
                numero: invoice.numero,
                monto: formatMoney(invoice.monto, invoice.currency),
                estado: <StatusBadge status={invoice.status} />,
                creado: formatDate(invoice.createdAt),
              },
            }))}
            emptyLabel="Sin facturas registradas."
            loading={false}
          />
        </Card>
      )}

      {showAudit && (
        <Card
          title="Auditoría reciente"
          actions={
            <Link href="/audit" className="text-sm text-primary hover:underline">
              Ver todas →
            </Link>
          }
        >
          <ul className="divide-y divide-border">
            {data.recentAudit.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <p className="truncate text-muted">
                  <span className="text-foreground">
                    {entry.actorUserId ? `usuario ${shortHash(entry.actorUserId, 4)}` : "sistema"}
                  </span>{" "}
                  · {entry.operation.toLowerCase()} en {entry.tableName}
                </p>
                <span className="shrink-0 font-mono text-xs text-muted">
                  {formatDate(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {showUsers && (
        <Card
          title="Usuarios recientes"
          actions={
            <Link href="/admin/users" className="text-sm text-primary hover:underline">
              Administrar →
            </Link>
          }
        >
          <DataTable
            columns={[
              { key: "nombre", header: "Nombre" },
              { key: "correo", header: "Correo" },
              { key: "rol", header: "Rol" },
            ]}
            rows={data.recentUsers.map((entry) => ({
              id: entry.id,
              cells: {
                nombre: entry.fullName,
                correo: <span className="font-mono text-xs">{entry.email}</span>,
                rol: <RoleBadge role={entry.role} />,
              },
            }))}
            emptyLabel="Sin usuarios."
            loading={false}
          />
        </Card>
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}
