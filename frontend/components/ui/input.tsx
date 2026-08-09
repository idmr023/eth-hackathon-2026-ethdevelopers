import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export function Field({ label, error, hint, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && (
        <span className="text-xs font-medium tracking-wide text-muted uppercase">
          {label}
        </span>
      )}
      {children}
      {hint && !error && <span className="text-xs text-muted">{hint}</span>}
      {error && <span className="text-xs text-danger">{error}</span>}
    </label>
  );
}

const baseInput =
  "h-10 w-full rounded-md border bg-surface-2 px-3 text-sm text-foreground placeholder:text-muted/60 outline-none transition-colors focus:border-primary";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function TextInput({
  label,
  error,
  hint,
  className = "",
  ...rest
}: TextInputProps) {
  const input = (
    <input
      className={`${baseInput} ${error ? "border-danger" : "border-border"} ${className}`}
      {...rest}
    />
  );
  if (!label && !error && !hint) return input;
  return (
    <Field label={label} error={error} hint={hint}>
      {input}
    </Field>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({
  label,
  error,
  options,
  className = "",
  ...rest
}: SelectProps) {
  return (
    <Field label={label} error={error}>
      <select
        className={`${baseInput} ${error ? "border-danger" : "border-border"} ${className}`}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function InlineError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}

export function InlineSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-700">
      {message}
    </p>
  );
}
