"use client";

import { ChangePasswordForm } from "@/components/modules/auth/change-password-form";

// Pantalla obligatoria cuando el backend exige cambio de contraseña.
export function ForceChangePassword() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface/80 p-6 backdrop-blur">
        <div className="mb-4 flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-warning anim-pulse-dot" />
          <span className="font-mono text-xs tracking-widest text-warning">
            MUST_CHANGE_PASSWORD
          </span>
        </div>
        <ChangePasswordForm />
      </div>
    </main>
  );
}
