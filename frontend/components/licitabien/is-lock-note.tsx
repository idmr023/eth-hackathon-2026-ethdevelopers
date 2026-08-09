import type { ReactNode } from "react";
import { IconLock } from "./icons";

export function LockNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <IconLock className="mt-0.5 size-4 shrink-0" />
      <p className="leading-relaxed">{children}</p>
    </div>
  );
}
