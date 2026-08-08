"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/is-auth-provider";
import { Button } from "@/components/ui/button";
import { TextInput, InlineError } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { ErrorCodes } from "@/lib/auth";

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
      router.replace("/auctions");
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
      className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface/80 p-6 shadow-[var(--shadow-glow)] backdrop-blur"
    >
      <div>
        <h2 className="text-lg font-semibold text-foreground">Acceso al protocolo</h2>
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
