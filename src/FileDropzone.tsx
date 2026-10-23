import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  describeFile,
  formatBytes,
  validateFile,
  type FileKind,
  type FileRule,
} from "./file-rules";
import "./file-upload.css";

type Props = {
  id: string;
  label: string;
  rule: FileRule;
  file: File | null;
  onFile: (file: File | null) => void;
  status?: "idle" | "uploading" | "done" | "error";
  progress?: number;
  errorMessage?: string;
  hint?: string;
  disabled?: boolean;
};

export function FileGlyph({ kind }: { kind: FileKind | "other" }) {
  return (
    <svg
      className="file-glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "image" ? (
        <>
          <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
          <circle cx="9" cy="10" r="1.6" />
          <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
        </>
      ) : (
        <>
          <path d="M6 3.5h8l4 4V20H6z" />
          <path d="M14 3.5V8h4" />
          {kind === "json" && (
            <path d="M10 12c-1 0-1 .8-1 1.5s0 1.5-1 1.5m1-3c1 0 1 .8 1 1.5s0 1.5 1 1.5" />
          )}
          {kind === "pdf" && <path d="M9 14h6M9 17h4" />}
          {kind === "text" && <path d="M9 12h6M9 15h6M9 18h4" />}
        </>
      )}
    </svg>
  );
}

export function FileDropzone({
  id,
  label,
  rule,
  file,
  onFile,
  status = "idle",
  progress = 0,
  errorMessage,
  hint,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const hadFile = useRef(Boolean(file));
  const [dragging, setDragging] = useState(false);
  const [shake, setShake] = useState(false);
  const [message, setMessage] = useState("");
  const busy = status === "uploading";
  const locked = disabled || busy;
  const accept = [
    ...rule.mimeTypes,
    ...rule.extensions.map((extension) => `.${extension}`),
  ].join(",");

  function choose(list: FileList | null) {
    const next = list?.[0];
    if (!next) return;
    const result = validateFile(next, rule);
    if (!result.ok) {
      setMessage(result.message);
      setShake(true);
      window.setTimeout(() => setShake(false), 450);
      return;
    }
    setMessage("");
    onFile(next);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (!locked) choose(event.dataTransfer.files);
  }

  useEffect(() => {
    const has = Boolean(file);
    if (has !== hadFile.current) {
      const active = document.activeElement;
      if (
        !active ||
        active === document.body ||
        areaRef.current?.contains(active)
      )
        areaRef.current
          ?.querySelector<HTMLElement>(
            has ? ".dz-file-actions button:not(:disabled)" : ".dz-pick",
          )
          ?.focus();
      hadFile.current = has;
    }
  }, [file]);

  const info = file ? describeFile(file) : null;
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const shownError = message || (status === "error" ? errorMessage : "");

  return (
    <div className="dz" data-status={status}>
      <span className="form-field-label" id={`${id}-label`}>
        {label}
      </span>
      <div
        ref={areaRef}
        className={`dz-area${dragging ? " dragging" : ""}${shake ? " shake" : ""}${file ? " has-file" : ""}${shownError ? " invalid" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!locked) setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setDragging(false);
        }}
        onDrop={onDrop}
      >
        <input
          id={id}
          ref={inputRef}
          className="sr-only"
          type="file"
          accept={accept}
          tabIndex={-1}
          aria-labelledby={`${id}-label`}
          disabled={locked}
          onChange={(event) => {
            choose(event.target.files);
            event.target.value = "";
          }}
        />
        {!file || !info ? (
          <button
            className="dz-pick"
            type="button"
            disabled={locked}
            aria-describedby={`${id}-hint`}
            onClick={() => inputRef.current?.click()}
          >
            <span className="dz-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 16V5m0 0-4 4m4-4 4 4" />
                <path d="M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15" />
              </svg>
            </span>
            <strong>
              {dragging ? "Solte para escolher" : "Arraste o arquivo aqui"}
            </strong>
            <span id={`${id}-hint`}>
              ou clique para escolher · até {formatBytes(rule.maxBytes)}
              {hint ? ` · ${hint}` : ""}
            </span>
          </button>
        ) : (
          <div className="dz-file">
            <span className="dz-file-icon" aria-hidden="true">
              <FileGlyph kind={info.kind} />
            </span>
            <span className="dz-file-text">
              <strong>{file.name}</strong>
              <small>
                {info.sizeLabel}
                {info.extension ? ` · ${info.extension.toUpperCase()}` : ""}
              </small>
            </span>
            {status === "done" && (
              <svg
                className="dz-check"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-label="Enviado"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="m7.5 12.5 3 3 6-6.5" />
              </svg>
            )}
            <span className="dz-file-actions">
              {status === "error" && (
                <button
                  className="btn btn-secondary btn-sm"
                  type="button"
                  onClick={() => onFile(file)}
                >
                  Tentar de novo
                </button>
              )}
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                disabled={locked}
                onClick={() => inputRef.current?.click()}
              >
                Trocar
              </button>
              <button
                className="btn btn-ghost btn-sm btn-ghost-danger"
                type="button"
                disabled={locked}
                onClick={() => {
                  setMessage("");
                  onFile(null);
                }}
              >
                Remover
              </button>
            </span>
          </div>
        )}
        {busy && (
          <div className="dz-progress">
            <div
              className="dz-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label="Progresso do envio"
            >
              <span style={{ width: `${percent}%` }} />
            </div>
            <small>Enviando… {percent}%</small>
          </div>
        )}
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {status === "uploading"
          ? "Enviando arquivo."
          : status === "done"
            ? "Envio concluído."
            : ""}
      </span>
      {shownError && (
        <p className="dz-error" role="alert">
          {shownError}
        </p>
      )}
    </div>
  );
}
