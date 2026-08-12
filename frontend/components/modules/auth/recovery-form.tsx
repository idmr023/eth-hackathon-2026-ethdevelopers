"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextInput, InlineError } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { ErrorCodes, recoveryInit, recoveryReset } from "@/lib/auth";
import { IconChain } from "@/components/licitabien/icons";

type Step = "email" | "answer";

const PWD_HINT = "8-72 caracteres, con mayúscula, minúscula y número.";

export function RecoveryForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submitEmail(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await recoveryInit(email);
      setQuestion(res.question);
      setStep("answer");
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "No se pudo iniciar la recuperación.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitReset(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await recoveryReset({ email, answer, newPassword });
      setDone(true);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.code === ErrorCodes.INVALID_CREDENTIALS
            ? "La respuesta no coincide o la cuenta no existe."
            : cause.message
          : "No se pudo restablecer la contraseña.",
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
          Contraseña restablecida
        </h2>
        <p className="text-sm text-muted">
          Ya puedes iniciar sesión con tu nueva contraseña.
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
      onSubmit={step === "email" ? submitEmail : submitReset}
      className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-white p-8 shadow-[var(--shadow-card)]"
    >
      <div className="text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
          <IconChain className="size-6" />
        </span>
        <h2 className="mt-4 font-display text-xl font-bold text-ink">
          {step === "email" ? "Recuperar contraseña" : "Verifica tu identidad"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {step === "email"
            ? "Te pediremos tu pregunta de seguridad."
            : "Responde tu pregunta de seguridad para crear una nueva contraseña."}
        </p>
      </div>

      {step === "email" ? (
        <>
          <TextInput
            label="Correo"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="empresa@correo.pe"
          />
          <InlineError message={error} />
          <Button type="submit" loading={loading} className="w-full">
            Continuar
          </Button>
        </>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-mist p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Pregunta
            </p>
            <p className="mt-1 text-sm text-ink">{question}</p>
          </div>
          <TextInput
            label="Respuesta"
            required
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Tu respuesta"
          />
          <TextInput
            label="Nueva contraseña"
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            hint={PWD_HINT}
          />
          <InlineError message={error} />
          <Button type="submit" loading={loading} className="w-full">
            Restablecer contraseña
          </Button>
        </>
      )}

      <p className="text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-brand-dark hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}