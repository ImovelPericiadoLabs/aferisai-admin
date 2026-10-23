import { useEffect, useRef, useState } from "react";
import { ApiError } from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import { FileDropzone } from "./FileDropzone";
import { describeFile, formatBytes, type FileRule } from "./file-rules";
import { clampZoom, computeCrop, fitWithin } from "./image-model";

type Props = {
  label: string;
  currentSrc: string | null;
  rule: FileRule;
  shape: "circle" | "square";
  canEdit: boolean;
  onUpload: (
    file: Blob,
    onProgress: (fraction: number) => void,
  ) => Promise<void>;
  onRemove?: () => Promise<void>;
  onUnauthorized?: () => void;
};

const FRAME = 240;
const MAX_SIDE = 1024;

function useObjectUrl(blob: Blob | null): string | null {
  const [state, setState] = useState<{ blob: Blob; url: string } | null>(null);
  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setState({ blob, url });
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  return state && state.blob === blob ? state.url : null;
}

function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export function ImageUploader({
  label,
  currentSrc,
  rule,
  shape,
  canEdit,
  onUpload,
  onRemove,
  onUnauthorized,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [framed, setFramed] = useState<Blob | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">(
    "idle",
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [askRemove, setAskRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const best = framed ?? file;
  const previewUrl = useObjectUrl(best);
  const originalUrl = useObjectUrl(file);

  useEffect(() => {
    if (!adjusting || !originalUrl) return;
    const image = new Image();
    let live = true;
    image.onload = () => {
      if (!live) return;
      imageRef.current = image;
      draw();
    };
    image.src = originalUrl;
    return () => {
      live = false;
      imageRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjusting, originalUrl]);

  useEffect(() => {
    if (adjusting) draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, offsetX, offsetY, adjusting]);

  function draw() {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!image || !canvas || !context) return;
    const { sx, sy, size } = computeCrop({
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      zoom,
      offsetX,
      offsetY,
    });
    context.clearRect(0, 0, FRAME, FRAME);
    context.drawImage(image, sx, sy, size, size, 0, 0, FRAME, FRAME);
  }

  function reset(next: File | null) {
    setFile(next);
    setFramed(null);
    setAdjusting(false);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setStatus("idle");
    setProgress(0);
    setError("");
  }

  async function applyFraming() {
    const image = imageRef.current;
    if (!image) return;
    const { sx, sy, size } = computeCrop({
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      zoom,
      offsetX,
      offsetY,
    });
    const side = fitWithin(size, size, MAX_SIDE).width;
    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(image, sx, sy, size, size, 0, 0, side, side);
    let blob = await toBlob(canvas, "image/png");
    if (blob && blob.size > rule.maxBytes)
      blob = await toBlob(canvas, "image/jpeg", 0.9);
    if (!blob || blob.size > rule.maxBytes) {
      setError(
        `A imagem ajustada passou de ${formatBytes(rule.maxBytes)}. Reduza o zoom ou escolha outra imagem.`,
      );
      return;
    }
    setError("");
    setFramed(blob);
    setAdjusting(false);
  }

  async function send() {
    if (!best) return;
    setStatus("uploading");
    setProgress(0);
    setError("");
    try {
      await onUpload(best, setProgress);
      setProgress(1);
      setStatus("done");
      window.setTimeout(() => reset(null), 1600);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized?.();
      setError(
        cause instanceof ApiError
          ? cause.detail
          : "Não foi possível enviar a imagem. Tente novamente.",
      );
      setStatus("error");
    }
  }

  async function remove() {
    if (!onRemove) return;
    setRemoving(true);
    try {
      await onRemove();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized?.();
      else
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível remover a imagem.",
        );
    } finally {
      setRemoving(false);
      setAskRemove(false);
    }
  }

  const info = best
    ? describeFile({
        name: file?.name ?? "imagem",
        size: best.size,
        type: best.type,
      })
    : null;

  return (
    <div className="iu">
      <div className="iu-current">
        <span className={`iu-avatar iu-${shape}`}>
          {currentSrc ? (
            <img src={currentSrc} alt={`${label} atual`} />
          ) : (
            <span className="iu-empty">Sem imagem</span>
          )}
        </span>
        {canEdit && currentSrc && onRemove && (
          <button
            className="btn btn-ghost btn-sm btn-ghost-danger"
            type="button"
            disabled={removing || status === "uploading"}
            onClick={() => setAskRemove(true)}
          >
            Remover imagem
          </button>
        )}
      </div>

      {canEdit && (
        <div className="iu-flow">
          <FileDropzone
            id="image-uploader-file"
            label={`Enviar ${label.toLowerCase()}`}
            rule={rule}
            file={file}
            status={status}
            progress={progress}
            errorMessage={error}
            onFile={(next) =>
              next === file && next ? void send() : reset(next)
            }
            hint="PNG ou JPEG"
          />

          {best && previewUrl && (
            <div className="iu-previews" aria-label="Como vai aparecer">
              <p className="form-hint">
                Como vai aparecer
                {info ? ` · ${info.sizeLabel}` : ""}
                {framed ? " · enquadramento aplicado" : ""}
              </p>
              <div className="iu-row">
                <span className={`iu-avatar iu-circle iu-lg`}>
                  <img src={previewUrl} alt="Prévia circular" />
                </span>
                <span className={`iu-avatar iu-square iu-lg`}>
                  <img src={previewUrl} alt="Prévia quadrada" />
                </span>
                <span className="iu-avatar iu-square iu-lg iu-dark">
                  <img src={previewUrl} alt="Prévia em fundo escuro" />
                </span>
              </div>
            </div>
          )}

          {adjusting && (
            <div className="iu-editor">
              <canvas
                ref={canvasRef}
                width={FRAME}
                height={FRAME}
                className={`iu-canvas iu-${shape}`}
                aria-label="Enquadramento da imagem"
              />
              <div className="iu-sliders">
                <label className="form-field-label" htmlFor="iu-zoom">
                  Zoom ({zoom.toFixed(1)}×)
                </label>
                <input
                  id="iu-zoom"
                  type="range"
                  min="1"
                  max="4"
                  step="0.1"
                  value={zoom}
                  onChange={(event) =>
                    setZoom(clampZoom(Number(event.target.value)))
                  }
                />
                <label className="form-field-label" htmlFor="iu-x">
                  Posição horizontal
                </label>
                <input
                  id="iu-x"
                  type="range"
                  min="-1"
                  max="1"
                  step="0.05"
                  value={offsetX}
                  onChange={(event) => setOffsetX(Number(event.target.value))}
                />
                <label className="form-field-label" htmlFor="iu-y">
                  Posição vertical
                </label>
                <input
                  id="iu-y"
                  type="range"
                  min="-1"
                  max="1"
                  step="0.05"
                  value={offsetY}
                  onChange={(event) => setOffsetY(Number(event.target.value))}
                />
                <div className="iu-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    type="button"
                    onClick={() => void applyFraming()}
                  >
                    Aplicar ajuste
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={() => setAdjusting(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {file && !adjusting && status !== "done" && (
            <div className="iu-actions">
              <button
                className="btn btn-primary btn-md"
                type="button"
                disabled={status === "uploading"}
                onClick={() => void send()}
              >
                {status === "uploading" ? "Enviando…" : "Enviar imagem"}
              </button>
              <button
                className="btn btn-secondary btn-md"
                type="button"
                disabled={status === "uploading"}
                onClick={() => setAdjusting(true)}
              >
                Ajustar enquadramento
              </button>
              {framed && (
                <button
                  className="btn btn-ghost btn-md"
                  type="button"
                  disabled={status === "uploading"}
                  onClick={() => setFramed(null)}
                >
                  Desfazer ajuste
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={askRemove}
        tone="danger"
        title="Remover esta imagem?"
        description="A imagem deixa de aparecer. Você pode enviar outra depois."
        confirmLabel="Remover imagem"
        busy={removing}
        onConfirm={() => void remove()}
        onCancel={() => setAskRemove(false)}
      />
    </div>
  );
}
