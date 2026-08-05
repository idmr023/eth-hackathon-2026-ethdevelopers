"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextInput, InlineError, InlineSuccess } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { changePassword } from "@/lib/auth";
import { ErrorCodes } from "@/lib/auth";

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;

export function ChangePasswordForm({
  onSuccess,
}: {
  onSuccess?: () => void | Promise<void>;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!PASSWORD_PATTERN.test(newPassword)) {
      setError(
        "La contraseña debe tener 8-72 caracteres, con mayúscula, minúscula y número.",
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess("Contraseña actualizada correctamente.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await onSuccess?.();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? translateError(cause.code, cause.message)
          : "No se pudo cambiar la contraseña.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Cambio de contraseña
        </h2>
        <p className="mt-1 text-sm text-muted">
          Requerido antes de continuar con la plataforma.
        </p>
      </div>

      <TextInput
        label="Contraseña actual"
        type="password"
        required
        autoComplete="current-password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
      />
      <TextInput
        label="Nueva contraseña"
        type="password"
        required
        autoComplete="new-password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        hint="8-72 caracteres, mayúscula, minúscula y número."
      />
      <TextInput
        label="Confirmar nueva contraseña"
        type="password"
        required
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />

      <InlineError message={error} />
      <InlineSuccess message={success} />

      <Button type="submit" loading={loading} className="w-full">
        Actualizar contraseña
      </Button>
    </form>
  );
}

function translateError(code: string, fallback: string): string {
  switch (code) {
    case ErrorCodes.INVALID_CREDENTIALS:
      return "La contraseña actual es incorrecta.";
    default:
      return fallback;
  }
}
