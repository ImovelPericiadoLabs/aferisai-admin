import { useId } from "react";
import type { PartnerRole } from "./api";
import { ROLE_OPTIONS } from "./partner-roles";

type Option<T extends string> = { value: T; label: string; summary: string };

export function RolePicker<T extends string = PartnerRole>({
  label,
  value,
  onChange,
  disabled = false,
  options = ROLE_OPTIONS as unknown as Option<T>[],
}: {
  label: string;
  value: T | null;
  onChange: (role: T) => void;
  disabled?: boolean;
  options?: Option<T>[];
}) {
  const name = useId();
  return (
    <fieldset className="role-picker" disabled={disabled}>
      <legend className="form-field-label">{label}</legend>
      <div className="role-picker-options">
        {options.map((option) => (
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
