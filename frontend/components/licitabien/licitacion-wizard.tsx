"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/is-auth-provider";
import { Button } from "@/components/ui/button";
import { TextInput, Select } from "@/components/ui/input";
import { ANIM } from "@/lib/animations";
import { ApiError } from "@/lib/api";
import { createLicitacion } from "@/lib/licitabien/api";
import { SuccessModal } from "./is-success-modal";
import { IconCheck, IconDocument, IconLock, IconUsers } from "./icons";

const STEPS = [
  { label: "Datos generales", caption: "Título y presupuesto" },
  { label: "Fechas y documentos", caption: "Ventanas de compromiso y revelación" },
  { label: "Invitación", caption: "Elige a tus proveedores" },
] as const;

const CATEGORIES = [
  { value: "Papelería y suministros", label: "Papelería y suministros" },
  { value: "Servicios generales", label: "Servicios generales" },
  { value: "Obras y remodelación", label: "Obras y remodelación" },
  { value: "Tecnología", label: "Tecnología" },
];

const PROVIDERS = [
  "Proveedor A",
  "Proveedor B",
  "Proveedor C",
  "Proveedor D",
  "Proveedor E",
  "Proveedor F",
  "Proveedor G",
  "Proveedor H",
];

function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function LicitacionWizard({
  open,
  onClose,
  onPublished,
}: {
  open: boolean;
  onClose: () => void;
  onPublished?: () => void;
}) {
  const router = useRouter();
  const { status } = useAuth();
  const defaultCommit = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return toLocalInput(d);
  }, []);

  const defaultReveal = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return toLocalInput(d);
  }, []);

  const [step, setStep] = useState(0);
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docsAttached, setDocsAttached] = useState(false);
  const [invited, setInvited] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: "",
    category: "suministros",
    budget: "",
    description: "",
    commitEnd: defaultCommit,
    revealEnd: defaultReveal,
  });

  if (!open) return null;

  const setField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const validate = (index: number): string | null => {
    if (index === 0) {
      if (form.title.trim().length < 4) return "Ingresa un título descriptivo.";
      if (!Number(form.budget) || Number(form.budget) <= 0)
        return "Ingresa un presupuesto de referencia válido.";
    }
    if (index === 1) {
      if (!form.commitEnd || !form.revealEnd)
        return "Define ambas fechas (compromiso y revelación).";
      if (new Date(form.commitEnd).getTime() >= new Date(form.revealEnd).getTime())
        return "La fecha de cierre de compromisos debe ser anterior a la de revelación.";
    }
    if (index === 2 && invited.length === 0)
      return "Invita al menos a un proveedor para abrir la licitación.";
    return null;
  };

  const next = () => {
    const issue = validate(step);
    if (issue) {
      setError(issue);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const toggleProvider = (name: string) => {
    setInvited((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name],
    );
  };

  const publish = async () => {
    const issue = validate(2);
    if (issue) {
      setError(issue);
      return;
    }
    if (status !== "authenticated") {
      router.push("/login?from=/licitabien/licitante");
      return;
    }
    setError(null);
    setPublishing(true);
    try {
      await createLicitacion({
        title: form.title.trim(),
        category: form.category,
        budget: Number(form.budget),
        commitEnd: form.commitEnd,
        revealEnd: form.revealEnd,
        description: form.description.trim() || undefined,
      });
      setPublished(true);
    } catch (cause) {
      if (cause instanceof ApiError) {
        if (
          cause.code === "AUTH_REQUIRED" ||
          cause.code === "SESSION_EXPIRED" ||
          cause.code === "SESSION_REVOKED"
        ) {
          router.push("/login?from=/licitabien/licitante");
          return;
        }
        setError(cause.message);
      } else {
        setError("No se pudo publicar la licitación. Inténtalo de nuevo.");
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleDone = () => {
    setPublished(false);
    setStep(0);
    setInvited([]);
    setDocsAttached(false);
    setForm((prev) => ({ ...prev, title: "", budget: "", description: "" }));
    onPublished?.();
    onClose();
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
        <header className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">
                Nueva licitación
              </h2>
              <p className="text-xs text-muted">
                {STEPS[step].label} · {STEPS[step].caption}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="flex size-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-danger/40 hover:text-danger"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-mist">
            <div
              className={`h-full rounded-full bg-brand ${ANIM.growBar}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput
                label="Título de la licitación"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="Ej: Suministro de materiales de oficina Q4"
                className="sm:col-span-2"
              />
              <Select
                label="Categoría"
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
                options={CATEGORIES}
              />
              <TextInput
                label="Presupuesto de referencia (S/)"
                type="number"
                min="0"
                value={form.budget}
                onChange={(e) => setField("budget", e.target.value)}
                placeholder="8,500,000"
              />
              <TextInput
                label="Descripción (opcional)"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Detalla el alcance del requerimiento..."
                className="sm:col-span-2"
              />
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput
                label="Cierre de compromisos"
                type="datetime-local"
                value={form.commitEnd}
                onChange={(e) => setField("commitEnd", e.target.value)}
              />
              <TextInput
                label="Apertura y revelación"
                type="datetime-local"
                value={form.revealEnd}
                onChange={(e) => setField("revealEnd", e.target.value)}
              />
              <button
                type="button"
                onClick={() => setDocsAttached(true)}
                className={`flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-4 text-left transition-colors sm:col-span-2 ${
                  docsAttached
                    ? "border-brand bg-brand-soft"
                    : "border-border hover:border-brand/50"
                }`}
              >
                <span
                  className={`flex size-10 items-center justify-center rounded-lg ${
                    docsAttached ? "bg-brand/10 text-brand-dark" : "bg-mist text-muted"
                  }`}
                >
                  <IconDocument className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-ink">
                    {docsAttached
                      ? "Terminos-y-condiciones.pdf · listo para sellar"
                      : "Adjuntar términos y condiciones"}
                  </span>
                  <span className="block text-xs text-muted">
                    El documento se firma junto al hash: el contrato solo revela
                    las ofertas al cierre.
                  </span>
                </span>
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {PROVIDERS.map((name) => {
                  const selected = invited.includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleProvider(name)}
                      className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                        selected
                          ? "border-brand bg-brand-soft text-ink"
                          : "border-border text-navy/70 hover:border-brand/40"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <IconUsers className="size-4 text-muted" />
                        {name}
                      </span>
                      <span
                        className={`flex size-5 items-center justify-center rounded-full border ${
                          selected
                            ? "border-brand bg-brand text-white"
                            : "border-border"
                        }`}
                      >
                        {selected && <IconCheck className="size-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <IconLock className="mt-0.5 size-4 shrink-0" />
                <p>
                  Solo los proveedores invitados verán esta licitación. Sus
                  ofertas viajan cifradas y permanecen ocultas hasta el cierre.
                </p>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <Button variant="secondary" onClick={step === 0 ? onClose : back}>
            {step === 0 ? "Cancelar" : "Atrás"}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button className="bg-brand text-white hover:bg-brand-dark" onClick={next}>
              Continuar
            </Button>
          ) : (
            <Button
              className="bg-brand text-white hover:bg-brand-dark"
              onClick={publish}
              loading={publishing}
              disabled={publishing}
            >
              Publicar licitación
            </Button>
          )}
        </footer>
      </div>

      <SuccessModal open={published} onClose={handleDone} />
    </div>
  );
}
