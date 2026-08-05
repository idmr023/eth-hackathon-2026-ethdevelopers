"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { invoicesApi, factorsApi } from "@/lib/endpoints";
import { PageHeader, Card, EmptyState } from "@/components/ui/card";
import { TextInput, Select, InlineError, InlineSuccess } from "@/components/ui/input";
import { Button, Spinner } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import type { Factor } from "@/lib/types";

export function InvoiceNewView() {
  const router = useRouter();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [factorsError, setFactorsError] = useState(false);

  const [rucEmisor, setRucEmisor] = useState("");
  const [rucReceptor, setRucReceptor] = useState("");
  const [numero, setNumero] = useState("");
  const [monto, setMonto] = useState("");
  const [currency, setCurrency] = useState("PEN");
  const [factorId, setFactorId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    factorsApi
      .list()
      .then((result) => {
        setFactors(result.data);
        setFactorId((prev) => prev || result.data[0]?.id || "");
      })
      .catch(() => setFactorsError(true));
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const amount = Number(monto);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("El monto debe ser un número mayor a 0.");
      return;
    }

    setLoading(true);
    try {
      const result = await invoicesApi.register({
        rucEmisor: rucEmisor.trim(),
        rucReceptor: rucReceptor.trim(),
        numero: numero.trim(),
        monto: amount,
        currency,
        factorId: factorId || undefined,
      });
      const invoice = result.data;
      setSuccess(`Factura ${invoice.numero} registrada.`);
      router.push(`/invoices/${invoice.id}`);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? translateError(cause.code, cause.message)
          : "No se pudo registrar la factura.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex-1 max-w-2xl space-y-6 p-6">
      <PageHeader
        title="Registrar factura"
        subtitle="El hash Keccak-256 se calcula server-side contra la lista negra."
      />

      {factorsError ? (
        <EmptyState
          title="No se pudieron cargar los factores"
          description="Recarga la página para reintentar."
        />
      ) : (
        <Card>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput
                label="RUC emisor"
                required
                pattern="\d{8,11}"
                title="RUC de 8 a 11 dígitos"
                value={rucEmisor}
                onChange={(e) => setRucEmisor(e.target.value)}
                placeholder="20123456789"
              />
              <TextInput
                label="RUC receptor"
                required
                pattern="\d{8,11}"
                title="RUC de 8 a 11 dígitos"
                value={rucReceptor}
                onChange={(e) => setRucReceptor(e.target.value)}
                placeholder="20187654321"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <TextInput
                label="Nº de factura"
                required
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="F001-000001"
              />
              <TextInput
                label="Monto"
                required
                type="number"
                min="0"
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="12500.00"
              />
              <Select
                label="Moneda"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={[
                  { value: "PEN", label: "PEN — S/" },
                  { value: "USD", label: "USD — $" },
                ]}
              />
            </div>

            <Select
              label="Factor (cedente)"
              value={factorId}
              onChange={(e) => setFactorId(e.target.value)}
              options={[
                ...(factors.length > 1
                  ? []
                  : [{ value: "", label: "Selecciona un factor…" }]),
                ...factors.map((f) => ({ value: f.id, label: `${f.name} (${f.ruc})` })),
              ]}
            />

            <InlineError message={error} />
            <InlineSuccess message={success} />

            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/invoices")}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={loading}>
                Registrar factura
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted">
          <Spinner /> Registrando…
        </p>
      )}
    </main>
  );
}

function translateError(code: string, fallback: string): string {
  switch (code) {
    case "FRAUD_DETECTED":
      return "Factura detectada como fraude (doble financiamiento). Revisa las alertas.";
    case "DUPLICATE_INVOICE":
      return "La factura ya fue registrada.";
    case "FACTOR_NOT_FOUND":
      return "El factor seleccionado no existe.";
    default:
      return fallback;
  }
}
