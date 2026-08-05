"use client";

import { useState } from "react";
import { factorsApi } from "@/lib/endpoints";
import { PageHeader, Card } from "@/components/ui/card";
import { DataTable, Pagination } from "@/components/ui/table";
import { TextInput, InlineError, InlineSuccess } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useAsyncResource } from "@/lib/use-async-resource";
import type { Factor } from "@/lib/types";
import { formatDate } from "@/lib/format";

const PAGE_SIZE = 10;

export function AdminFactorsView() {
  const [page, setPage] = useState(1);

  const { data, error, loading, reload } = useAsyncResource<Factor[]>(
    () => factorsApi.list({ page, limit: PAGE_SIZE }),
    [page],
  );

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [ruc, setRuc] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      await factorsApi.create({ name, ruc });
      setSuccess(`Factor ${name} registrado.`);
      setName("");
      setRuc("");
      setPage(1);
      reload();
    } catch (cause) {
      setCreateError(
        cause instanceof ApiError ? cause.message : "No se pudo crear el factor.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="flex-1 space-y-6 p-6">
      <PageHeader
        title="Factores"
        subtitle="Cedentes de facturas financiables en el protocolo."
      />

      <Card title="Registrar factor">
        <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TextInput
            label="Nombre"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Factor Andino S.A.C."
          />
          <TextInput
            label="RUC"
            required
            pattern="\d{11}"
            title="RUC de 11 dígitos"
            maxLength={11}
            value={ruc}
            onChange={(e) => setRuc(e.target.value.replace(/\D/g, ""))}
            placeholder="20123456789"
          />
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <Button type="submit" loading={creating}>
              Registrar factor
            </Button>
          </div>
        </form>
        <InlineError message={createError} />
      </Card>

      <InlineError message={error} />
      <InlineSuccess message={success} />

      <Card>
        <DataTable
          columns={[
            { key: "nombre", header: "Nombre" },
            { key: "ruc", header: "RUC" },
            { key: "creado", header: "Registrado" },
          ]}
          rows={rows.map((factor) => ({
            id: factor.id,
            cells: {
              nombre: factor.name,
              ruc: <span className="font-mono text-xs">{factor.ruc}</span>,
              creado: formatDate(factor.createdAt),
            },
          }))}
          emptyLabel="Sin factores registrados."
          loading={loading}
        />
        <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
      </Card>
    </main>
  );
}
