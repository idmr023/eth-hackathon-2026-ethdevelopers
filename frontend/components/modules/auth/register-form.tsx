"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextInput, InlineError, InlineSuccess } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { ErrorCodes, register } from "@/lib/auth";
import { IconChain } from "@/components/licitabien/icons";

const PWD_HINT = "8-72 caracteres, con mayúscula, minúscula y número.";

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    password: "",
    phone: "",
    dni: "",
    recoveryQuestion: "",
    recoveryAnswer: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const update = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({
        email: form.email,
        fullName: form.fullName,
        password: form.password,
        phone: form.phone || undefined,
        dni: form.dni || undefined,
        recoveryQuestion: form.recoveryQuestion,
        recoveryAnswer: form.recoveryAnswer,
      });
      setDone(true);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.code === ErrorCodes.CONFLICT
            ? "Ya existe una cuenta con ese correo o DNI."
            : cause.message
          : "No se pudo registrar. Inténtalo nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-white p-8 text-center shadow-[var(--shadow-card)]">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
          <IconChain className="size-6" />
        </span>
        <h2 className="font-display text-xl font-bold text-ink">
          Cuenta creada
        </h2>
        <p className="text-sm text-muted">
          Revisa tu correo <strong>{form.email}</strong> e inicia sesión para
          participar en LICITABIEN.
        </p>
        <Button
          className="w-full bg-brand text-white hover:bg-brand-dark"
          onClick={() => router.push("/login")}
        >
          Ir a iniciar sesión
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-white p-8 shadow-[var(--shadow-card)]"
    >
      <div className="text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
          <IconChain className="size-6" />
        </span>
        <h2 className="mt-4 font-display text-xl font-bold text-ink">
          Crear cuenta de empresa
        </h2>
        <p className="mt-1 text-sm text-muted">
          Participa en licitaciones selladas sobre Arbitrum.
        </p>
      </div>

      <TextInput
        label="Nombre de la empresa"
        required
        value={form.fullName}
        onChange={(e) => update("fullName", e.target.value)}
        placeholder="Mi Empresa S.A.C."
      />
      <TextInput
        label="Correo"
        type="email"
        required
        value={form.email}
        onChange={(e) => update("email", e.target.value)}
        placeholder="empresa@correo.pe"
      />
      <TextInput
        label="Contraseña"
        type="password"
        required
        value={form.password}
        onChange={(e) => update("password", e.target.value)}
        placeholder="••••••••"
        hint={PWD_HINT}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextInput
          label="Teléfono (9 dígitos)"
          inputMode="numeric"
          maxLength={9}
          value={form.phone}
          onChange={(e) => update("phone", e.target.value.replace(/\D/g, ""))}
          placeholder="999999999"
        />
        <TextInput
          label="DNI (8 dígitos)"
          inputMode="numeric"
          maxLength={8}
          value={form.dni}
          onChange={(e) => update("dni", e.target.value.replace(/\D/g, ""))}
          placeholder="12345678"
        />
      </div>
      <TextInput
        label="Pregunta de recuperación"
        required
        value={form.recoveryQuestion}
        onChange={(e) => update("recoveryQuestion", e.target.value)}
        placeholder="¿Cuál es el RUC de tu empresa?"
      />
      <TextInput
        label="Respuesta de recuperación"
        required
        value={form.recoveryAnswer}
        onChange={(e) => update("recoveryAnswer", e.target.value)}
        placeholder="Tu respuesta secreta"
      />

      <InlineError message={error} />
      <InlineSuccess message={done ? "Cuenta creada correctamente." : null} />

      <Button type="submit" loading={loading} className="w-full">
        Crear cuenta
      </Button>

      <p className="text-center text-sm text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-brand-dark hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}