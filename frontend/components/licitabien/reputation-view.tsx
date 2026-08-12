"use client";

import { useQuery } from "@tanstack/react-query";
import { CredentialCard, ReputationHeader } from "./is-credential-card";
import { IconBadgeCheck, IconSparkles } from "./icons";
import { credentialsApi } from "@/lib/endpoints";

export function ReputationView() {
  const { data: result, isLoading } = useQuery({
    queryKey: ["myCredentials"],
    queryFn: () => credentialsApi.listMine(),
  });

  const credentials = result?.data ?? [];

  return (
    <main className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark">
          Identidad soberana
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
          Perfil de empresa y reputación
        </h1>
      </div>

      <ReputationHeader />

      <section>
        <div className="mb-4 flex items-center gap-2">
          <IconBadgeCheck className="size-5 text-brand-dark" />
          <h2 className="font-display text-lg font-bold text-ink">
            Insignias criptográficas
          </h2>
          <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-medium text-muted">
            {credentials.length} credenciales
          </span>
        </div>
        {isLoading ? (
            <p>Cargando credenciales...</p>
        ) : credentials.length === 0 ? (
            <p className="text-muted text-sm">No tienes credenciales on-chain todavía. Participa en una subasta y gana un contrato para recibir tu primera insignia.</p>
        ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {credentials.map((credential) => (
                <CredentialCard key={credential.id} credential={credential} />
            ))}
            </div>
        )}
      </section>

      <section className="rounded-xl border border-brand/30 bg-brand-soft p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10">
            <IconSparkles className="size-5 text-brand-dark" />
          </span>
          <div>
            <h3 className="font-display text-sm font-bold text-ink">
              Tus credenciales te pertenecen
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-navy/70">
              Cada insignia es una credencial verificable atestiguada on-chain
              (estándar abierto EAS). Son{" "}
              <strong className="font-semibold text-ink">
                inmutables, portátiles y demostrables
              </strong>{" "}
              ante cualquier cliente, banco o protocolo del mundo. Presenta tu
              historial sin depender de la plataforma: la reputación es tuya,
              no nuestra.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
