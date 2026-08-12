"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/is-auth-provider";
import { Button } from "@/components/ui/button";
import { TextInput, InlineError } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { ErrorCodes } from "@/lib/auth";
import { IconChain } from "@/components/licitabien/icons";
import { DEFAULT_APP_ROUTE } from "@/lib/licitabien/persona";

type Step = "credentials" | "two-fa";

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

export function LoginForm() {
  const { login, verify2faLogin } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectAfterLogin = () => {
    const from = new URLSearchParams(window.location.search).get("from");
    router.replace(from && from.startsWith("/") ? from : DEFAULT_APP_ROUTE);
  };

  async function submitCredentials(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result && "step" in result && result.step === "verify-2fa") {
        setPendingToken(result.pendingToken);
        setStep("two-fa");
      } else {
        redirectAfterLogin();
      }
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? translateError(cause.code, cause.message)
          : "No se pudo iniciar sesión. Inténtalo nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submit2fa(event: React.FormEvent) {
    event.preventDefault();
    if (!pendingToken) {
      setStep("credentials");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await verify2faLogin(pendingToken, code);
      redirectAfterLogin();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.code === ErrorCodes.SESSION_EXPIRED
            ? "El tiempo expiró. Inicia sesión de nuevo."
            : cause.message
          : "El código no es válido. Inténtalo nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={step === "credentials" ? submitCredentials : submit2fa}
      className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-white p-8 shadow-[var(--shadow-card)]"
    >
      <div className="text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
          <IconChain className="size-6" />
        </span>
        <h2 className="mt-4 font-display text-xl font-bold text-ink">
          {step === "credentials" ? "Acceso al protocolo" : "Verificación en dos pasos"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {step === "credentials"
            ? "Ingresa con tus credenciales de LICITABIEN."
            : "Ingresa el código de 6 dígitos de tu app de autenticación."}
        </p>
      </div>

      {step === "credentials" ? (
        <>
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
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-brand-dark hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <InlineError message={error} />
          <Button type="submit" loading={loading} className="w-full">
            Iniciar sesión
          </Button>
          <p className="text-center text-sm text-muted">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="font-medium text-brand-dark hover:underline">
              Regístrate
            </Link>
          </p>
          <div className="rounded-lg border border-border bg-mist p-3 text-xs space-y-1">
            <p className="font-semibold text-muted">Credenciales de prueba:</p>
            <p className="text-ink/80">
              <span className="font-medium">Email:</span> admin@invoiceshield.dev
            </p>
            <p className="text-ink/80">
              <span className="font-medium">Contraseña:</span> ChangeMe123!
            </p>
          </div>
        </>
      ) : (
        <>
          <TextInput
            label="Código de 6 dígitos"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
          />
          <InlineError message={error} />
          <Button type="submit" loading={loading} className="w-full">
            Verificar
          </Button>
          <button
            type="button"
            onClick={() => {
              setStep("credentials");
              setCode("");
              setError(null);
              setPendingToken(null);
            }}
            className="w-full text-center text-xs text-muted hover:text-ink"
          >
            Volver a las credenciales
          </button>
        </>
      )}
    </form>
  );
}