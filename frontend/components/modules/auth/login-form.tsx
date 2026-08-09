"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/is-auth-provider";
import { Button } from "@/components/ui/button";
import { TextInput, InlineError } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { ErrorCodes } from "@/lib/auth";
import { IconChain } from "@/components/licitabien/icons";

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      const from = new URLSearchParams(window.location.search).get("from");
      router.replace(
        from && from.startsWith("/") ? from : "/licitabien/dashboard",
      );
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? translateError(cause.code, cause.message)
          : "No se pudo iniciar sesión. Inténtalo nuevamente.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-white p-8 shadow-[var(--shadow-card)]"
    >
      <div className="text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
          <IconChain className="size-6" />
        </span>
        <h2 className="mt-4 font-display text-xl font-bold text-ink">
          Acceso al protocolo
        </h2>
        <p className="mt-1 text-sm text-muted">
          Ingresa con tus credenciales de LICITABIEN.
        </p>
      </div>

      <TextInput
        label="Correo"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="usuario@factoring.pe"
      />
      <TextInput
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
      />

      <InlineError message={error} />

      <Button type="submit" loading={loading} className="w-full">
        Iniciar sesión
      </Button>

      <div className="rounded-lg border border-border bg-mist p-3 text-xs space-y-1">
        <p className="font-semibold text-muted">Credenciales de prueba:</p>
        <p className="text-ink/80">
          <span className="font-medium">Email:</span> admin@invoiceshield.dev
        </p>
        <p className="text-ink/80">
          <span className="font-medium">Contraseña:</span> ChangeMe123!
        </p>
      </div>
    </form>
  );
}

function translateError(code: string, fallback: string): string {
  switch (code) {
    case ErrorCodes.ACCOUNT_LOCKED:
      return "Demasiados intentos fallidos. Espera 15 minutos.";
    case ErrorCodes.ACCOUNT_SUSPENDED:
      return "La cuenta está suspendida. Contacta al administrador.";
    case ErrorCodes.INVALID_CREDENTIALS:
      return "Credenciales inválidas.";
    default:
      return fallback;
  }
}
