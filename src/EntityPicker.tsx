import { useEffect, useId, useRef, useState } from "react";
import { ApiError } from "./api";
import {
  mergeOptions,
  nextIndex,
  pickerKeyAction,
  shortId,
  type PickerOption,
  type PickerResult,
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
  emptyMessage?: string;
  emptyAction?: { label: string; href: string };
  knownOptions?: PickerOption[];
  cacheKey?: string;
  onUnauthorized?: () => void;
  resolve?: (id: string) => Promise<PickerOption | null>;
};

type Single = Shared & {
  multiple?: false;
  value: string;
  onChange: (id: string, option?: PickerOption) => void;
};

type Multiple = Shared & {
  multiple: true;
  value: string[];
  onChange: (ids: string[]) => void;
};

type Props = Single | Multiple;

type Loaded = {
  key: string | undefined;
  query: string;
  options: PickerOption[];
  next?: () => Promise<PickerResult>;
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
    emptyMessage,
    emptyAction,
    knownOptions,
    cacheKey,
    onUnauthorized,
    resolve,
  } = props;
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [moreBusy, setMoreBusy] = useState(false);
  const [labels, setLabels] = useState<PickerOption[]>(knownOptions ?? []);
  const searchRef = useRef(search);
  const resolveRef = useRef(resolve);
  const unauthorizedRef = useRef(onUnauthorized);
  useEffect(() => {
    searchRef.current = search;
    resolveRef.current = resolve;
    unauthorizedRef.current = onUnauthorized;
  });

  function handleFailure(cause: unknown) {
    if (cause instanceof ApiError && cause.status === 401)
      unauthorizedRef.current?.();
  }

  const selectedIds = props.multiple
    ? props.value
    : props.value
      ? [props.value]
      : [];
  const current =
    loaded?.query === query && loaded.key === cacheKey ? loaded : null;
  const loading = open && current === null;
  const options = current ? current.options : [];
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
      missingKey.split(",").map((missing) =>
        resolver(missing).catch((cause: unknown) => {
          handleFailure(cause);
          return null;
        }),
      ),
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
              key: cacheKey,
              query,
              options: result.options,
              next: result.next,
              failed: false,
            });
            setLabels((current) => mergeOptions(current, result.options));
            setActive(result.options.length ? 0 : -1);
          })
          .catch((cause: unknown) => {
            handleFailure(cause);
            if (live)
              setLoaded({
                key: cacheKey,
                query,
                options: [],
                failed: true,
              });
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
      props.onChange(option.id, option);
      close();
    }
  }

  function remove(optionId: string) {
    if (props.multiple)
      props.onChange(props.value.filter((item) => item !== optionId));
    else props.onChange("");
  }

  async function loadMore() {
    const next = current?.next;
    if (!next || moreBusy) return;
    setMoreBusy(true);
    try {
      const result = await next();
      setLoaded((state) =>
        state && state.query === query && state.key === cacheKey
          ? {
              ...state,
              options: mergeOptions(state.options, result.options),
              next: result.next,
            }
          : state,
      );
      setLabels((known) => mergeOptions(known, result.options));
    } catch (cause) {
      handleFailure(cause);
      setLoaded((state) => (state ? { ...state, failed: true } : state));
    } finally {
      setMoreBusy(false);
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const action = pickerKeyAction(event.key, {
      open,
      hasActive: Boolean(options[active]),
      queryEmpty: !query,
      multiple: Boolean(props.multiple),
      hasValue: Boolean(props.multiple && props.value.length > 0),
    });
    if (action === "none") return;
    if (action === "close") event.stopPropagation();
    else event.preventDefault();
    if (action === "open") setOpen(true);
    else if (action === "next")
      setActive((index) => nextIndex(index, 1, options.length));
    else if (action === "prev")
      setActive((index) => nextIndex(index, -1, options.length));
    else if (action === "choose") choose(options[active]);
    else if (action === "close") close();
    else if (action === "removeLast" && props.multiple)
      remove(props.value[props.value.length - 1]);
  }

  const single = !props.multiple && props.value ? labelFor(props.value) : null;
  const inputValue =
    open || props.multiple
      ? query
      : (single?.label ?? (props.value ? shortId(props.value) : ""));
  const placeholderText = placeholder ?? "Buscar…";

  return (
    <div
      className="form-field picker"
      ref={rootRef}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null))
          close();
      }}
    >
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
              {labelFor(optionId)?.label ?? shortId(optionId)}
              <button
                type="button"
                aria-label={`Remover ${labelFor(optionId)?.label ?? shortId(optionId)}`}
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
            tabIndex={-1}
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
            <>
              <p className="picker-status">
                {!query.trim() && !current?.next && emptyMessage
                  ? emptyMessage
                  : "Nenhum resultado."}
              </p>
              {!query.trim() && !current?.next && emptyAction && (
                <a className="picker-empty-action" href={emptyAction.href}>
                  {emptyAction.label}
                </a>
              )}
            </>
          )}
          {current?.next && (
            <button
              className="picker-more"
              type="button"
              disabled={moreBusy}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => void loadMore()}
            >
              {moreBusy ? "Carregando…" : "Carregar mais resultados"}
            </button>
          )}
          {limitNote && !loading && current?.next && (
            <p className="picker-note">{limitNote}</p>
          )}
        </div>
      )}
      {hint && <span className="form-hint">{hint}</span>}
    </div>
  );
}
