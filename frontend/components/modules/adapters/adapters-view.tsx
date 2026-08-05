"use client";

import { adaptersApi } from "@/lib/endpoints";
import { PageHeader, Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, Spinner } from "@/components/ui/button";
import { InlineError } from "@/components/ui/input";
import { useAsyncResource } from "@/lib/use-async-resource";
import type { AdapterPortalStatus } from "@/lib/types";
import { formatDate } from "@/lib/format";

export function AdaptersView() {
  const { data, error, reload } = useAsyncResource<{
    adapters: AdapterPortalStatus[];
  }>(() => adaptersApi.status(), []);

  const adapters = data?.data.adapters ?? null;

  return (
    <main className="mx-auto flex-1 max-w-3xl space-y-6 p-6">
      <PageHeader
        title="Adaptadores"
        subtitle="Interfaz de oráculos SUNAT / CAVALI (simulados y aislados tras AdapterService)."
        actions={
          <Button variant="secondary" onClick={reload}>
            Verificar estado
          </Button>
        }
      />

      <InlineError message={error} />

      {!adapters ? (
        <p className="flex items-center justify-center gap-2 text-muted">
          <Spinner /> Consultando portales…
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {adapters.map((adapter) => (
            <Card key={adapter.provider}>
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-foreground">{adapter.provider}</p>
                {adapter.connected ? (
                  <Badge tone="success">Conectado</Badge>
                ) : (
                  <Badge tone="danger">Sin conexión</Badge>
                )}
              </div>
              <p className="mt-2 text-sm text-muted">{adapter.detail}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-muted">
                <span className="font-mono uppercase">{adapter.source}</span>
                <span>{formatDate(adapter.lastSyncAt)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
