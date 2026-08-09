export const DashboardFilter = {
  ALL: "ALL",
  ACTIVE: "ACTIVE",
  DRAFT: "DRAFT",
  CLOSED: "CLOSED",
} as const;

export type DashboardFilter =
  (typeof DashboardFilter)[keyof typeof DashboardFilter];

const OPTIONS: { value: DashboardFilter; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "ACTIVE", label: "Activas" },
  { value: "DRAFT", label: "Borradores" },
  { value: "CLOSED", label: "Cerradas" },
];

export function FilterPills({
  value,
  onChange,
}: {
  value: DashboardFilter;
  onChange: (value: DashboardFilter) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
      {OPTIONS.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "bg-navy text-white shadow-sm"
                : "text-muted hover:bg-mist hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
