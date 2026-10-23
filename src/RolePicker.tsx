import { useId } from "react";
import type { PartnerRole } from "./api";
import { ROLE_OPTIONS } from "./partner-roles";

export function RolePicker({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: PartnerRole | null;
  onChange: (role: PartnerRole) => void;
  disabled?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className="role-picker" disabled={disabled}>
      <legend className="form-field-label">{label}</legend>
      <div className="role-picker-options">
        {ROLE_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`role-option${value === option.value ? " is-selected" : ""}`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>
              <strong>{option.label}</strong>
              <small>{option.summary}</small>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
