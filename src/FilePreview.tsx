import { useEffect, useRef, useState } from "react";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { FileGlyph } from "./FileDropzone";
import { describeFile } from "./file-rules";
import { summarizeServiceAccount, textPreview } from "./file-preview-model";

export function FilePreview({ file }: { file: File }) {
  const key = `${file.name}:${file.size}:${file.lastModified}`;
  const info = describeFile(file);
  return (
    <div className="fp" key={key}>
      {info.kind === "image" ? (
        <ImagePreview file={file} />
      ) : info.kind === "pdf" ? (
        <PdfPreview file={file} />
      ) : info.kind === "json" ? (
        <JsonPreview file={file} />
      ) : info.kind === "text" ? (
        <TextPreview file={file} />
      ) : (
        <div className="fp-generic">
          <FileGlyph kind="other" />
          <span>
            {file.name}
            <small>
              {info.extension ? info.extension.toUpperCase() : "Arquivo"} ·{" "}
              {info.sizeLabel}
            </small>
          </span>
        </div>
      )}
    </div>
  );
}

function ImagePreview({ file }: { file: File }) {
  const [url] = useState(() => URL.createObjectURL(file));
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <figure className="fp-image">
      <img
        src={url}
        alt={`Pré-visualização de ${file.name}`}
        onLoad={(event) =>
          setSize({
            w: event.currentTarget.naturalWidth,
            h: event.currentTarget.naturalHeight,
          })
        }
      />
      <figcaption>
        {size ? `${size.w} × ${size.h} px · ` : ""}
        {describeFile(file).sizeLabel}
      </figcaption>
    </figure>
  );
}

type PdfState =
  | { status: "loading" }
  | { status: "ready"; pages: number }
  | { status: "error" };

function PdfPreview({ file }: { file: File }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<PdfState>({ status: "loading" });

  useEffect(() => {
    let disposed = false;
    let task: { destroy: () => Promise<void> | void } | null = null;
    void (async () => {
      try {
        const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
        GlobalWorkerOptions.workerSrc = workerUrl;
        const data = new Uint8Array(await file.arrayBuffer());
        const loading = getDocument({ data, enableXfa: false });
        task = loading;
        const doc = await loading.promise;
        if (disposed) return;
        const page = await doc.getPage(1);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: 180 / base.width });
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context || disposed) return;
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        if (!disposed) setState({ status: "ready", pages: doc.numPages });
      } catch {
        if (!disposed) setState({ status: "error" });
      }
    })();
    return () => {
      disposed = true;
      void task?.destroy();
    };
  }, [file]);

  return (
    <figure className="fp-pdf">
      {state.status === "loading" && (
        <span
          className="skeleton fp-pdf-skeleton"
          role="status"
          aria-label="Carregando PDF"
        />
      )}
      {state.status === "error" ? (
        <p className="fp-note">Não foi possível gerar a miniatura do PDF.</p>
      ) : (
        <canvas
          ref={canvasRef}
          className="fp-pdf-canvas"
          hidden={state.status !== "ready"}
        />
      )}
      <figcaption>
        {state.status === "ready"
          ? `${state.pages} ${state.pages === 1 ? "página" : "páginas"} · `
          : ""}
        {describeFile(file).sizeLabel}
      </figcaption>
    </figure>
  );
}

type TextState =
  | { status: "loading" }
  | { status: "ready"; text: string }
  | { status: "error" };

function useFileText(file: File): TextState {
  const [state, setState] = useState<TextState>({ status: "loading" });
  useEffect(() => {
    let disposed = false;
    file
      .slice(0, 64 * 1024)
      .text()
      .then((text) => {
        if (!disposed) setState({ status: "ready", text });
      })
      .catch(() => {
        if (!disposed) setState({ status: "error" });
      });
    return () => {
      disposed = true;
    };
  }, [file]);
  return state;
}

function JsonPreview({ file }: { file: File }) {
  const state = useFileText(file);
  if (state.status === "loading")
    return (
      <span
        className="skeleton fp-line"
        role="status"
        aria-label="Lendo arquivo"
      />
    );
  if (state.status === "error")
    return <p className="fp-note">Não foi possível ler o arquivo.</p>;
  const summary = summarizeServiceAccount(state.text);
  if (!summary.ok)
    return (
      <p className="fp-note fp-note-danger" role="alert">
        {summary.message}
      </p>
    );
  return (
    <dl className="fp-fields" aria-label="Resumo seguro do arquivo">
      {summary.fields.map((field) => (
        <div key={field.label}>
          <dt>{field.label}</dt>
          <dd>{field.value}</dd>
        </div>
      ))}
      <p className="fp-note">A chave privada não é exibida.</p>
    </dl>
  );
}

function TextPreview({ file }: { file: File }) {
  const state = useFileText(file);
  if (state.status === "loading")
    return (
      <span
        className="skeleton fp-line"
        role="status"
        aria-label="Lendo arquivo"
      />
    );
  if (state.status === "error")
    return <p className="fp-note">Não foi possível ler o arquivo.</p>;
  const preview = textPreview(state.text);
  return (
    <pre className="fp-text">
      {preview.text}
      {preview.truncated ? "\n…" : ""}
    </pre>
  );
}
