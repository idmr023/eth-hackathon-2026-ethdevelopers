"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ANIM } from "@/lib/animations";
import { IconCheck } from "./icons";

export function SuccessModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return <SuccessModalFlow onClose={onClose} />;
}

function SuccessModalFlow({ onClose }: { onClose: () => void }) {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setConfirmed(true), 2600);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-8 text-center shadow-2xl">
        {!confirmed ? (
          <div className="flex flex-col items-center gap-5">
            <span className="size-14 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
            <div>
              <p className="font-display text-base font-bold text-ink">
                Registrando hash en la red segura...
              </p>
              <p className="mt-1.5 text-sm text-muted">
                Tu licitación se sella matemáticamente en Arbitrum. Nadie podrá
                ver las ofertas antes del cierre.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <span
              className={`flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand-dark ${ANIM.checkPop}`}
            >
              <IconCheck className="size-8" strokeWidth={3} />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-ink">
                ¡Licitación Creada!
              </p>
              <p className="mt-1.5 text-sm text-muted">
                El contrato queda abierto a compromisos. Los proveedores
                invitados ya pueden sellar sus ofertas.
              </p>
            </div>
            <Button
              className="w-full bg-brand text-white hover:bg-brand-dark"
              onClick={onClose}
            >
              Listo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
