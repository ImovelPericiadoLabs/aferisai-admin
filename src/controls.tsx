import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import "./controls.css";

export function Checkbox({
  id,
  label,
  checked,
  indeterminate = false,
  disabled = false,
  description,
  onChange,
}: {
  id: string;
  label: ReactNode;
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  description?: ReactNode;
  onChange: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <label
      className={`ctl ctl-check${disabled ? " disabled" : ""}`}
      htmlFor={id}
    >
      <input
        ref={ref}
        id={id}
        className="ctl-input"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="ctl-box" aria-hidden="true">
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path className="ctl-tick" d="m3.5 8.5 3 3 6-6.5" />
          <path className="ctl-dash" d="M4 8h8" />
        </svg>
      </span>
      <span className="ctl-text">
        <span className="ctl-label">{label}</span>
        {description && <small>{description}</small>}
      </span>
    </label>
  );
}

export function RadioGroup({
  name,
  legend,
  value,
  options,
  onChange,
}: {
  name: string;
  legend: string;
  value: string;
  options: {
    value: string;
    label: ReactNode;
    description?: ReactNode;
    disabled?: boolean;
  }[];
  onChange: (value: string) => void;
}) {
  const base = useId();
  return (
    <fieldset className="ctl-group">
      <legend className="form-field-label">{legend}</legend>
      {options.map((option) => {
        const id = `${base}-${option.value}`;
        return (
          <label
            key={option.value}
            className={`ctl ctl-radio${option.disabled ? " disabled" : ""}`}
            htmlFor={id}
          >
            <input
              id={id}
              className="ctl-input"
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={option.disabled}
              onChange={() => onChange(option.value)}
            />
            <span className="ctl-box ctl-round" aria-hidden="true">
              <span className="ctl-dot" />
            </span>
            <span className="ctl-text">
              <span className="ctl-label">{option.label}</span>
              {option.description && <small>{option.description}</small>}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

export function Switch({
  id,
  label,
  checked,
  disabled = false,
  description,
  onChange,
}: {
  id: string;
  label: ReactNode;
  checked: boolean;
  disabled?: boolean;
  description?: ReactNode;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`ctl ctl-switch${disabled ? " disabled" : ""}`}
      htmlFor={id}
    >
      <input
        id={id}
        className="ctl-input"
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="ctl-track" aria-hidden="true">
        <span className="ctl-thumb" />
      </span>
      <span className="ctl-text">
        <span className="ctl-label">{label}</span>
        {description && <small>{description}</small>}
      </span>
    </label>
  );
}

export function Disclosure({
  title,
  defaultOpen = false,
  children,
}: {
  title: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const base = useId();
  return (
    <div className={`ctl-disclosure${open ? " open" : ""}`}>
      <button
        className="ctl-disclosure-head"
        type="button"
        id={`${base}-head`}
        aria-expanded={open}
        aria-controls={`${base}-body`}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{title}</span>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>
      <div
        className="ctl-disclosure-body"
        id={`${base}-body`}
        role="region"
        aria-labelledby={`${base}-head`}
        inert={!open}
      >
        <div>{children}</div>
      </div>
    </div>
  );
}

export function Slider({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = (current) => String(current),
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className="ctl-slider">
      <div className="ctl-slider-head">
        <label className="form-field-label" htmlFor={id}>
          {label}
        </label>
        <output htmlFor={id}>{format(value)}</output>
      </div>
      <input
        id={id}
        className="ctl-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--fill": `${fill}%` } as React.CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}
