import type { ReactNode } from "react";
import type { InvoiceStatus } from "@/lib/types";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/format";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

const TONES: Record<BadgeTone, string> = {
  neutral: "border-border bg-surface-2 text-muted",
  info: "border-primary/30 bg-primary/15 text-primary",
  success: "border-emerald-400/30 bg-emerald-400/15 text-emerald-300",
  warning: "border-amber-400/30 bg-amber-400/15 text-amber-300",
  danger: "border-rose-400/30 bg-rose-400/15 text-rose-300",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge className={STATUS_COLORS[status]}>
      <span
        className={`size-1.5 rounded-full ${status === "PENDING" ? "bg-amber-300" : status === "VALIDATED" ? "bg-emerald-300" : "bg-rose-300"}`}
      />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === "ADMIN";
  return (
    <Badge
      className={
        isAdmin
          ? "bg-secondary/15 text-secondary border-secondary/30"
          : "bg-primary/15 text-primary border-primary/30"
      }
    >
      {isAdmin ? "Admin" : "Analista"}
    </Badge>
  );
}
