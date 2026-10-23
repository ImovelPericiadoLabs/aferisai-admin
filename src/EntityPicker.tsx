import { useEffect, useId, useRef, useState } from "react";
import {
  mergeOptions,
  nextIndex,
  type PickerOption,
  type PickerSearch,
} from "./picker-model";
import "./entity-picker.css";

type Shared = {
  id: string;
  label: string;
  search: PickerSearch;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  limitNote?: string;
  knownOptions?: PickerOption[];
  cacheKey?: string;
  resolve?: (id: string) => Promise<PickerOption | null>;
};

type Single = Shared & {
  multiple?: false;
  value: string;
  onChange: (id: string) => void;
};

type Multiple = Shared & {
  multiple: true;
  value: string[];
  onChange: (ids: string[]) => void;
};

type Props = Single | Multiple;

type Loaded = {
  query: string;
  options: PickerOption[];
  truncated: boolean;
  failed: boolean;
};

export function EntityPicker(props: Props) {
  const {
    id,
    label,
    search,
    placeholder,
    required,
    disabled,
    hint,
    limitNote,
    knownOptions,
    cacheKey,
    resolve,
  } = props;
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [labels, setLabels] = useState<PickerOption[]>(knownOptions ?? []);
  const searchRef = useRef(search);
  const resolveRef = useRef(resolve);
  useEffect(() => {
    searchRef.current = search;
    resolveRef.current = resolve;
  });

  const selectedIds = props.multiple
    ? props.value
    : props.value
      ? [props.value]
      : [];
  const loading = open && loaded?.query !== query;
  const options = loaded?.query === query ? loaded.options : [];
  const labelFor = (optionId: string) =>
    labels.find((option) => option.id === optionId);

  const missingKey = selectedIds
    .filter((selected) => !labels.some((option) => option.id === selected))
    .join(",");
  useEffect(() => {
    const resolver = resolveRef.current;
    if (!resolver || !missingKey) return;
    let live = true;
    void Promise.all(
      missingKey
        .split(",")
        .map((missing) => resolver(missing).catch(() => null)),
    ).then((found) => {
      if (live)
        setLabels((current) =>
          mergeOptions(
            current,
            found.filter((option): option is PickerOption => option !== null),
          ),
        );
    });
    return () => {
      live = false;
    };
  }, [missingKey]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    const timer = window.setTimeout(
      () => {
        searchRef
          .current(query)
          .then((result) => {
            if (!live) return;
            setLoaded({
              query,
              options: result.options,
              truncated: Boolean(result.truncated),
              failed: false,
            });
            setLabels((current) => mergeOptions(current, result.options));
            setActive(result.options.length ? 0 : -1);
          })
          .catch(() => {
            if (live)
              setLoaded({ query, options: [], truncated: false, failed: true });
          });
      },
      query ? 250 : 0,
    );
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [open, query, cacheKey]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.setCustomValidity(
      required && selectedIds.length === 0
        ? "Selecione uma opção da lista."
        : "",
    );
  });

  function close() {
    setOpen(false);
    setQuery("");
    setActive(-1);
  }

  function choose(option: PickerOption) {
    setLabels((current) => mergeOptions(current, [option]));
    if (props.multiple) {
      props.onChange(
        props.value.includes(option.id)
          ? props.value.filter((item) => item !== option.id)
          : [...props.value, option.id],
      );
      setQuery("");
      inputRef.current?.focus();
    } else {
      props.onChange(option.id);
      close();
    }
  }

  function remove(optionId: string) {
    if (props.multiple)
      props.onChange(props.value.filter((item) => item !== optionId));
    else props.onChange("");
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) setOpen(true);
      else
        setActive((index) =>
          nextIndex(index, event.key === "ArrowDown" ? 1 : -1, options.length),
        );
    } else if (event.key === "Enter" && open && options[active]) {
      event.preventDefault();
      choose(options[active]);
    } else if (event.key === "Escape" && open) {
      event.stopPropagation();
      close();
    } else if (
      event.key === "Backspace" &&
      !query &&
      props.multiple &&
      props.value.length
    ) {
      remove(props.value[props.value.length - 1]);
    }
  }

  const single = !props.multiple && props.value ? labelFor(props.value) : null;
  const inputValue = open || props.multiple ? query : (single?.label ?? "");
  const placeholderText =
    !props.multiple && props.value && !single
      ? "Selecionado"
      : (placeholder ?? "Buscar…");

  return (
    <div className="form-field picker" ref={rootRef}>
      <label className="form-field-label" htmlFor={id}>
        {label}
      </label>
      <div
        className={`picker-control${open ? " open" : ""}${disabled ? " disabled" : ""}`}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {props.multiple &&
          props.value.map((optionId) => (
            <span className="picker-chip" key={optionId}>
              {labelFor(optionId)?.label ?? optionId}
              <button
                type="button"
                aria-label={`Remover ${labelFor(optionId)?.label ?? optionId}`}
                disabled={disabled}
                onClick={(event) => {
                  event.stopPropagation();
                  remove(optionId);
                }}
              >
                ✕
              </button>
            </span>
          ))}
        <input
          id={id}
          ref={inputRef}
          className="picker-input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && active >= 0 ? `${listId}-${active}` : undefined
          }
          autoComplete="off"
          value={inputValue}
          placeholder={placeholderText}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setOpen(true);
            setQuery(event.target.value);
          }}
          onKeyDown={onKeyDown}
        />
        {!props.multiple && props.value && !required && !disabled && (
          <button
            className="picker-clear"
            type="button"
            aria-label="Limpar seleção"
            onClick={(event) => {
              event.stopPropagation();
              remove(props.value as string);
            }}
          >
            ✕
          </button>
        )}
      </div>
      {open && (
        <div className="picker-popover">
          <ul
            className="picker-list"
            role="listbox"
            id={listId}
            aria-multiselectable={props.multiple}
          >
            {options.map((option, index) => (
              <li
                key={option.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={selectedIds.includes(option.id)}
                className={`picker-option${index === active ? " active" : ""}`}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                <span>
                  <strong>{option.label}</strong>
                  {option.hint && <small>{option.hint}</small>}
                </span>
                {selectedIds.includes(option.id) && (
                  <span className="picker-check" aria-hidden="true">
                    ✓
                  </span>
                )}
              </li>
            ))}
          </ul>
          {loading && (
            <p className="picker-status" role="status">
              Buscando…
            </p>
          )}
          {!loading && loaded?.failed && (
            <p className="picker-status picker-error" role="alert">
              Não foi possível buscar agora.
            </p>
          )}
          {!loading && !loaded?.failed && options.length === 0 && (
            <p className="picker-status">Nenhum resultado.</p>
          )}
          {(loaded?.truncated || limitNote) && !loading && (
            <p className="picker-note">
              {limitNote ??
                "Mostrando só os primeiros resultados. Digite para refinar a busca."}
            </p>
          )}
        </div>
      )}
      {hint && <span className="form-hint">{hint}</span>}
    </div>
  );
}
