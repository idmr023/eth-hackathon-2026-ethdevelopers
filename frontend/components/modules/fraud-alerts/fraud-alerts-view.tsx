"use client";

import { useState } from "react";
import Link from "next/link";
import { fraudAlertsApi } from "@/lib/endpoints";
import { PageHeader, Card } from "@/components/ui/card";
import { DataTable, Pagination } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/input";
import { useAsyncResource } from "@/lib/use-async-resource";
import type { FraudAlert } from "@/lib/types";
import { formatMoney, formatDate, shortHash } from "@/lib/format";

const PAGE_SIZE = 10;

export function FraudAlertsView() {
  const [page, setPage] = useState(1);

  const { data, error, loading, reload } = useAsyncResource<FraudAlert[]>(
    () => fraudAlertsApi.list({ page, limit: PAGE_SIZE }),
    [page],
  );

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="flex-1 space-y-6 p-6">
      <PageHeader
        title="Alertas de fraude"
        subtitle="Intentos de doble financiamiento detectados por el hash Keccak-256."
        actions={
          <Button variant="secondary" onClick={reload}>
            Refrescar
          </Button>
        }
      />

      <InlineError message={error} />

      <Card>
        <DataTable
          columns={[
            { key: "hash", header: "Hash intentado" },
            { key: "factura", header: "Factura" },
            { key: "monto", header: "Monto" },
            { key: "factor", header: "Factor que intentó" },
            { key: "motivo", header: "Motivo" },
            { key: "fecha", header: "Detectada" },
          ]}
          rows={rows.map((alert) => ({
            id: alert.id,
            cells: {
              hash: (
                <Link
                  href={alert.existingInvoiceId ? `/invoices/${alert.existingInvoiceId}` : "#"}
                  className="font-mono text-xs text-primary hover:underline"
                >
                  {shortHash(alert.invoiceHash)}
                </Link>
              ),
              factura: alert.numero,
              monto: formatMoney(alert.monto),
              factor: alert.attemptedFactor?.name ?? "—",
              motivo: <span className="text-danger">{alert.message}</span>,
              fecha: formatDate(alert.createdAt),
            },
          }))}
          emptyLabel="Sin alertas de fraude."
          loading={loading}
        />
        <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
      </Card>
    </main>
  );
}
