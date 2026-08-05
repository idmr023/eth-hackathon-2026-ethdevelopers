import type { ReactNode } from "react";
import { Spinner } from "./button";

export interface DataTableColumn {
  key: string;
  header: string;
  headerClassName?: string;
  cellClassName?: string;
}

export interface DataTableRow {
  id: string;
  cells: Record<string, ReactNode>;
}

export function DataTable({
  columns,
  children,
  rows,
  loading = false,
  empty,
  emptyLabel,
}: {
  columns: string[] | DataTableColumn[];
  children?: ReactNode;
  rows?: DataTableRow[];
  loading?: boolean;
  empty?: { icon?: string; title: string; description?: string };
  emptyLabel?: string;
}) {
  const headers = columns.map((column) => {
    const header =
      typeof column === "string"
        ? column
        : column.header;
    const headerClassName =
      typeof column === "string" ? undefined : column.headerClassName;
    return (
      <th
        key={header}
        className={`px-4 py-3 text-left text-xs font-semibold tracking-wider text-muted uppercase ${headerClassName ?? ""}`}
      >
        {header}
      </th>
    );
  });

  const rowsNode = rows
    ? rows.map((row) => (
        <tr key={row.id}>
          {columns.map((column) => {
            const key = typeof column === "string" ? column : column.key;
            const cellClassName =
              typeof column === "string" ? undefined : column.cellClassName;
            return (
              <td
                key={key}
                className={`px-4 py-3 align-middle ${cellClassName ?? ""}`}
              >
                {row.cells[key]}
              </td>
            );
          })}
        </tr>
      ))
    : children;

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-2/60">{headers}</tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-16">
                <div className="flex items-center justify-center gap-2 text-muted">
                  <Spinner /> Cargando…
                </div>
              </td>
            </tr>
          ) : rows && rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  {empty?.icon && <span className="text-3xl">{empty.icon}</span>}
                  <p className="font-medium text-foreground">
                    {empty?.title ?? emptyLabel ?? "Sin resultados"}
                  </p>
                  {empty?.description && (
                    <p className="max-w-sm text-sm text-muted">{empty.description}</p>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            rowsNode ?? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="flex flex-col items-center gap-2 py-12 text-center">
                    {empty?.icon && <span className="text-3xl">{empty.icon}</span>}
                    <p className="font-medium text-foreground">
                      {empty?.title ?? emptyLabel ?? "Sin resultados"}
                    </p>
                    {empty?.description && (
                      <p className="max-w-sm text-sm text-muted">
                        {empty.description}
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  total = 0,
  onPage,
}: {
  page: number;
  totalPages: number;
  total?: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 pt-4 text-sm text-muted">
      <span>
        {total} registro{total === 1 ? "" : "s"}
      </span>
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded-md border border-border px-3 py-1.5 transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anterior
        </button>
        <span className="px-2 tabular-nums">
          {page} / {Math.max(1, totalPages)}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="rounded-md border border-border px-3 py-1.5 transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
