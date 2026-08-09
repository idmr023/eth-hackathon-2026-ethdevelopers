import { IconChain, IconExternal } from "./icons";

export function ChainBadge({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2 py-1 font-mono text-[11px] text-muted transition-colors hover:border-brand/50 hover:text-ink"
    >
      <IconChain className="size-3 shrink-0 text-brand" />
      <span className="tabular-nums">{label}</span>
      <IconExternal className="size-3 shrink-0 opacity-50 transition-opacity group-hover:opacity-100" />
    </a>
  );
}
