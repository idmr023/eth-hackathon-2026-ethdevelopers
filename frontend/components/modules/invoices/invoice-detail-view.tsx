"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { invoicesApi, adaptersApi } from "@/lib/endpoints";
import { PageHeader, Card, EmptyState } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button, Spinner } from "@/components/ui/button";
import { InlineError, InlineSuccess } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/components/is-auth-provider";
import { canSignAdapters } from "@/lib/permissions";
import type { InvoiceDetail } from "@/lib/types";
import { ValidationType } from "@/lib/types";
import { InvoiceStatus } from "@/lib/types";
import { formatMoney, formatDate, shortHash } from "@/lib/format";

export function InvoiceDetailView({ invoiceId }: { invoiceId: string }) {
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [signing, setSigning] = useState<ValidationType | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await invoicesApi.detail(invoiceId);
        if (!cancelled) setInvoice(result.data);
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof ApiError ? cause.message : "No se pudo cargar la factura.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  async function sign(type: ValidationType) {
    setError(null);
    setSuccess(null);
    setSigning(type);
    try {
      const result =
        type === ValidationType.SUNAT_CONFORMITY
          ? await adaptersApi.signSunat(invoiceId)
          : await adaptersApi.signCavali(invoiceId);
      setInvoice(result.data.invoice);
      setSuccess(result.data.message);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? translateError(cause.code, cause.message)
          : "No se pudo firmar la conformidad.",
      );
    } finally {
      setSigning(null);
    }
  }

  if (error && !invoice) {
    return (
      <main className="flex-1 p-6">
        <EmptyState title="Error" description={error} />
      </main>
    );
  }

  if (!invoice) {
    return (
      <main className="flex flex-1 items-center justify-center gap-2 p-6 text-muted">
        <Spinner /> Cargando factura…
      </main>
    );
  }

  const hasSunat = invoice.validations.some(
    (v) => v.type === ValidationType.SUNAT_CONFORMITY,
  );
  const hasCavali = invoice.validations.some(
    (v) => v.type === ValidationType.CAVALI_FACTRACK,
  );
  const canSign = canSignAdapters(user) && invoice.status === InvoiceStatus.PENDING;

  return (
    <main className="mx-auto flex-1 max-w-4xl space-y-6 p-6">
      <PageHeader
        title={`Factura ${invoice.numero}`}
        subtitle={<code className="font-mono text-xs">{invoice.hash}</code>}
        actions={<StatusBadge status={invoice.status} />}
      />

      <InlineError message={error} />
      <InlineSuccess message={success} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Info label="Emisor" value={invoice.rucEmisor} mono />
        <Info label="Receptor" value={invoice.rucReceptor} mono />
        <Info label="Monto" value={formatMoney(invoice.monto, invoice.currency)} />
        <Info label="Factor" value={invoice.factor?.name ?? "—"} />
        <Info label="Registrada por" value={shortHash(invoice.registeredBy, 8)} mono />
        <Info label="Registrada" value={formatDate(invoice.createdAt)} />
      </div>

      {canSign && (
        <Card title="Conformidad de adaptadores (oráculos simulados)">
          <p className="mb-4 text-sm text-muted">
            Ambas firmas son requeridas para liberar el financiamiento. El hash se
            anota on-chain vía la interfaz <code className="font-mono text-xs">AdapterService</code>.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              disabled={hasSunat}
              loading={signing === ValidationType.SUNAT_CONFORMITY}
              onClick={() => sign(ValidationType.SUNAT_CONFORMITY)}
            >
              {hasSunat ? "SUNAT firmada ✓" : "Firmar conformidad SUNAT"}
            </Button>
            <Button
              variant="secondary"
              disabled={hasCavali}
              loading={signing === ValidationType.CAVALI_FACTRACK}
              onClick={() => sign(ValidationType.CAVALI_FACTRACK)}
            >
              {hasCavali ? "CAVALI firmada ✓" : "Firmar anotación CAVALI"}
            </Button>
          </div>
        </Card>
      )}

      <Card title="Validaciones on-chain">
        {invoice.validations.length === 0 ? (
          <p className="text-sm text-muted">Sin validaciones registradas.</p>
        ) : (
          <ul className="divide-y divide-border">
            {invoice.validations.map((validation) => (
              <li key={validation.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">
                    {validation.type === ValidationType.SUNAT_CONFORMITY
                      ? "SUNAT — Conformidad"
                      : "CAVALI — Factrack"}
                  </p>
                  <p className="font-mono text-xs text-muted">
                    {shortHash(validation.txHash, 10)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted">{validation.signedBy}</p>
                  <p className="text-xs text-muted">{formatDate(validation.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Anomalías">
        {invoice.anomalies.length === 0 ? (
          <p className="text-sm text-muted">Sin anomalías registradas.</p>
        ) : (
          <ul className="divide-y divide-border">
            {invoice.anomalies.map((anomaly) => (
              <li key={anomaly.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-danger">{anomaly.type}</p>
                  {anomaly.detail && <p className="text-xs text-muted">{anomaly.detail}</p>}
                </div>
                <p className="shrink-0 text-xs text-muted">{formatDate(anomaly.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {invoice.fraudAlerts.length > 0 && (
        <Card title="Alertas de fraude">
          <ul className="divide-y divide-border">
            {invoice.fraudAlerts.map((alert) => (
              <li key={alert.id} className="py-3 text-sm">
                <p className="text-danger">{alert.message}</p>
                <p className="mt-1 text-xs text-muted">
                  {alert.attemptedFactor?.name ?? "factor desconocido"} intentó registrar una
                  factura ya financiada · {formatDate(alert.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-sm text-muted">
        <Link href="/invoices" className="text-primary hover:underline">
          ← Volver a facturas
        </Link>
      </p>
    </main>
  );
}

function Info({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs tracking-wide text-muted uppercase">{label}</p>
      <p className={`mt-1 truncate text-sm font-medium text-foreground ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function translateError(code: string, fallback: string): string {
  switch (code) {
    case "INVOICE_BLOCKED":
      return "La factura está bloqueada por una anomalía.";
    case "INVOICE_ALREADY_VALIDATED":
      return "La factura ya fue validada.";
    default:
      return fallback;
  }
}
