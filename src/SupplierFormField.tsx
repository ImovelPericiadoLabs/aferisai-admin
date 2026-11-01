import type { ReactNode } from "react";

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="form-field">
      <label className="form-field-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? (
        <span className="form-hint sup-error" role="alert">
          {error}
        </span>
      ) : (
        hint && <span className="form-hint">{hint}</span>
      )}
    </div>
  );
}
