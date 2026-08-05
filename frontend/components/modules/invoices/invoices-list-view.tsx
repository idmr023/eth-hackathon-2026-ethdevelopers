"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { invoicesApi } from "@/lib/endpoints";
import { PageHeader, Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { DataTable, Pagination } from "@/components/ui/table";
import { TextInput, Select, InlineError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/components/is-auth-provider";
import { canRegisterInvoices } from "@/lib/permissions";
import type { InvoiceListItem, InvoiceStatus } from "@/lib/types";
import { InvoiceStatus as InvoiceStatusEnum } from "@/lib/types";
import { formatMoney, formatDate, shortHash } from "@/lib/format";
import { staggered } from "@/lib/animations";

const PAGE_SIZE = 10;

export function InvoicesListView() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialStatus = (searchParams.get("status") ?? "") as InvoiceStatus | "";

  const [rows, setRows] = useState<InvoiceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<InvoiceStatus | "">(initialStatus);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await invoicesApi.list({
          page,
          limit: PAGE_SIZE,
          ...(status ? { status } : {}),
          ...(q.trim() ? { q: q.trim() } : {}),
        });
        if (!cancelled) {
          setRows(result.data);
          setTotal(result.total ?? 0);
          setError(null);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof ApiError ? cause.message : "No se pudo cargar las facturas.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, status, q]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="flex-1 space-y-6 p-6">
      <PageHeader
        title="Facturas"
        subtitle="Registro y estado del financiamiento de facturas."
        actions={
          canRegisterInvoices(user) ? (
            <Link href="/invoices/new">
              <Button>Registrar factura</Button>
            </Link>
          ) : undefined
        }
      />

      <Card>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
          }}
        >
          <div className="flex-1">
            <TextInput
              label="Buscar"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="RUC, número o hash…"
            />
          </div>
          <Select
            label="Estado"
            value={status}
            onChange={(e) => {
              const next = e.target.value as InvoiceStatus | "";
              setPage(1);
              setStatus(next);
            }}
            options={[
              { value: "", label: "Todos" },
              ...Object.values(InvoiceStatusEnum).map((s) => ({ value: s, label: s })),
            ]}
          />
          <Button type="submit" variant="secondary">
            Filtrar
          </Button>
        </form>
      </Card>

      <InlineError message={error} />

      <Card>
        <DataTable
          columns={[
            { key: "hash", header: "Hash" },
            { key: "numero", header: "Factura" },
            { key: "emisor", header: "Emisor" },
            { key: "receptor", header: "Receptor" },
            { key: "monto", header: "Monto" },
            { key: "estado", header: "Estado" },
            { key: "creado", header: "Registrada" },
          ]}
          rows={rows.map((invoice, index) => ({
            id: invoice.id,
            cells: {
              hash: (
                <Link
                  href={`/invoices/${invoice.id}`}
                  {...staggered(index, 40)}
                  className="font-mono text-xs text-primary hover:underline"
                >
                  {shortHash(invoice.hash)}
                </Link>
              ),
              numero: invoice.numero,
              emisor: invoice.rucEmisor,
              receptor: invoice.rucReceptor,
              monto: formatMoney(invoice.monto, invoice.currency),
              estado: <StatusBadge status={invoice.status} />,
              creado: formatDate(invoice.createdAt),
            },
          }))}
          emptyLabel="No hay facturas que coincidan con el filtro."
          loading={loading}
        />
        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </Card>
    </main>
  );
}
