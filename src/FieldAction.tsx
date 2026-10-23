import type { ReactNode } from "react";

export function FieldAction({
  id,
  label,
  hint,
  children,
  action,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  action: ReactNode;
}) {
  return (
    <div className="field-action">
      <label className="form-field-label" htmlFor={id}>
        {label}
      </label>
      <div className="field-action-row">
        {children}
        {action}
      </div>
      {hint && <span className="form-hint">{hint}</span>}
    </div>
  );
}
