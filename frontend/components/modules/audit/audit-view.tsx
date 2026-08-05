"use client";

import { useState } from "react";
import { auditApi } from "@/lib/endpoints";
import { PageHeader, Card } from "@/components/ui/card";
import { DataTable, Pagination } from "@/components/ui/table";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { Select, InlineError } from "@/components/ui/input";
import { useAsyncResource } from "@/lib/use-async-resource";
import type { AuditLogEntry } from "@/lib/types";
import { formatDate, shortHash } from "@/lib/format";

const PAGE_SIZE = 15;

const OPERATION_TONES: Record<string, BadgeTone> = {
  CREATE: "info",
  UPDATE: "warning",
  DELETE: "danger",
  SIGN: "success",
  LOGIN: "neutral",
  LOGIN_FAILED: "danger",
};

export function AuditView() {
  const [page, setPage] = useState(1);
  const [tableName, setTableName] = useState("");
  const [operation, setOperation] = useState("");

  const { data, error, loading } = useAsyncResource<AuditLogEntry[]>(
    () =>
      auditApi.list({
        page,
        limit: PAGE_SIZE,
        ...(tableName ? { tableName } : {}),
        ...(operation ? { operation } : {}),
      }),
    [page, tableName, operation],
  );

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="flex-1 space-y-6 p-6">
      <PageHeader
        title="Auditoría"
        subtitle="Registro WORM (solo lectura, inmutable) de la actividad del protocolo."
      />

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Select
              label="Tabla"
              value={tableName}
              onChange={(e) => {
                setTableName(e.target.value);
                setPage(1);
              }}
              options={[
                { value: "", label: "Todas" },
                { value: "invoices", label: "Facturas" },
                { value: "validations", label: "Validaciones" },
                { value: "anomalies", label: "Anomalías" },
                { value: "users", label: "Usuarios" },
                { value: "factors", label: "Factores" },
                { value: "sessions", label: "Sesiones" },
              ]}
            />
          </div>
          <div className="flex-1">
            <Select
              label="Operación"
              value={operation}
              onChange={(e) => {
                setOperation(e.target.value);
                setPage(1);
              }}
              options={[
                { value: "", label: "Todas" },
                { value: "CREATE", label: "Creación" },
                { value: "UPDATE", label: "Actualización" },
                { value: "DELETE", label: "Eliminación" },
                { value: "SIGN", label: "Firma" },
                { value: "LOGIN", label: "Login" },
              ]}
            />
          </div>
        </div>
      </Card>

      <InlineError message={error} />

      <Card>
        <DataTable
          columns={[
            { key: "fecha", header: "Fecha" },
            { key: "operacion", header: "Operación" },
            { key: "tabla", header: "Tabla" },
            { key: "registro", header: "Registro" },
            { key: "actor", header: "Actor" },
          ]}
          rows={rows.map((entry) => ({
            id: entry.id,
            cells: {
              fecha: formatDate(entry.createdAt),
              operacion: (
                <Badge tone={OPERATION_TONES[entry.operation] ?? "neutral"}>
                  {entry.operation}
                </Badge>
              ),
              tabla: <code className="font-mono text-xs">{entry.tableName}</code>,
              registro: <span className="font-mono text-xs">{shortHash(entry.recordId, 8)}</span>,
              actor: entry.actorUserId ? shortHash(entry.actorUserId, 8) : "sistema",
            },
          }))}
          emptyLabel="Sin registros de auditoría."
          loading={loading}
        />
        <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
      </Card>
    </main>
  );
}
