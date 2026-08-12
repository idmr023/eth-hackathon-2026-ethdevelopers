"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/is-auth-provider";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { TextInput, InlineError, InlineSuccess } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import {
  confirm2fa,
  disable2fa,
  setup2fa,
  fetchMe,
} from "@/lib/auth";
import { usersApi } from "@/lib/endpoints";
import { ChangePasswordForm } from "@/components/modules/auth/change-password-form";

type Setup = { secret: string; otpauthUri: string } | null;

export function CuentaView() {
  const { user, setUser } = useAuth();
  const { address, isConnected } = useAccount();
  const [setup, setSetup] = useState<Setup>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const enabled = user?.totpEnabled === true;

  async function bindWallet() {
    if (!address) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const updatedUser = await usersApi.bindWallet(address);
      setUser(updatedUser.data);
      setSuccess("Wallet vinculada correctamente.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al vincular wallet.");
    } finally {
      setLoading(false);
    }
  }

// Renderiza el QR de la URI otpauth cuando hay un setup pendiente.
useEffect(() => {
    if (!setup) return;
    let cancelled = false;
    import("qrcode")
      .then((QR) => QR.toDataURL(setup.otpauthUri, { width: 220, margin: 1 }))
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [setup]);

  async function startSetup() {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await setup2fa();
      setSetup(res);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "No se pudo iniciar 2FA.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function confirmSetup() {
    setError(null);
    setSuccess(null);
    if (!/^\d{6}$/.test(code)) {
      setError("El código debe tener 6 dígitos.");
      return;
    }
    setLoading(true);
    try {
      await confirm2fa(code);
      setSetup(null);
      setCode("");
      await fetchMe().then(() => location.reload());
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "El código no es válido.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function cancelSetup() {
    setSetup(null);
    setCode("");
    setError(null);
  }

  async function doDisable() {
    setError(null);
    setSuccess(null);
    if (!/^\d{6}$/.test(code)) {
      setError("Ingresa el código de 6 dígitos para desactivar 2FA.");
      return;
    }
    setLoading(true);
    try {
      await disable2fa(code);
      setCode("");
      await fetchMe().then(() => location.reload());
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "El código no es válido.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark">
          Mi cuenta
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
          {user?.email ?? "Cuenta"}
        </h1>
      </div>

      {/* ── Datos ── */}
      <section className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
        <h2 className="font-display text-base font-bold text-ink">
          Datos de la cuenta
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Correo</dt>
            <dd className="font-medium text-ink">{user?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Rol</dt>
            <dd className="font-medium text-ink">{user?.role}</dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-muted">Wallet</dt>
            <dd className="font-medium text-ink font-mono text-xs">
              {user?.walletAddress ? (
                user.walletAddress
              ) : isConnected ? (
                <Button variant="secondary" size="sm" onClick={bindWallet} loading={loading}>
                  Vincular {address?.slice(0, 6)}...
                </Button>
              ) : (
                <span className="text-muted">No vinculada</span>
              )}
            </dd>
          </div>
        </dl>
        <InlineError message={error} />
        <InlineSuccess message={success} />
      </section>

      {/* ── Cambio de contraseña ── */}
      <section className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
        <h2 className="font-display text-base font-bold text-ink">
          Contraseña
        </h2>
        <p className="mt-1 text-sm text-muted">
          Cambia tu contraseña cuando lo necesites. Se cerrarán las demás
          sesiones.
        </p>
        <ChangePasswordInline />
      </section>

      {/* ── 2FA ── */}
      <section className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-ink">
            Autenticación en dos pasos
          </h2>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              enabled
                ? "bg-emerald-100 text-emerald-700"
                : "bg-mist text-muted"
            }`}
          >
            {enabled ? "Activada" : "Desactivada"}
          </span>
        </div>

        {!enabled && !setup && (
          <div className="mt-3">
            <p className="text-sm text-muted">
              Protege tu cuenta con un código de un solo uso desde tu app de
              autenticación (Google Authenticator, Authy, etc.).
            </p>
            <Button
              className="mt-3 bg-brand text-white hover:bg-brand-dark"
              loading={loading}
              onClick={startSetup}
            >
              Configurar 2FA
            </Button>
          </div>
        )}

        {!enabled && setup && (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-muted">
              Escanea este código con tu app de autenticación.
            </p>
            {qr ? (
              <img
                src={qr}
                alt="QR de configuración 2FA"
                className="rounded-lg border border-border bg-white p-2"
              />
            ) : (
              <p className="font-mono text-xs break-all text-muted">
                {setup.otpauthUri}
              </p>
            )}
            <p className="text-xs text-muted">
              Secreto (manual):{" "}
              <span className="font-mono text-ink">{setup.secret}</span>
            </p>
            <TextInput
              label="Código de 6 dígitos"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
            />
            <InlineError message={error} />
            <InlineSuccess message={success} />
            <div className="flex gap-2">
              <Button onClick={confirmSetup} loading={loading}>
                Activar
              </Button>
              <Button variant="ghost" onClick={cancelSetup}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {enabled && (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-muted">
              Si desactivas la verificación en dos pasos, tu cuenta quedará
              protegida solo con contraseña.
            </p>
            <TextInput
              label="Código actual de 6 dígitos"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
            />
            <InlineError message={error} />
            <Button
              variant="danger"
              onClick={doDisable}
              loading={loading}
            >
              Desactivar 2FA
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}

// Cambio de contraseña inline reutilizando el componente existente.
function ChangePasswordInline() {
  return <ChangePasswordForm />;
}