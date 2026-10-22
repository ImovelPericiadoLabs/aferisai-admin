import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export type ReviewBox = [number, number, number, number];

type Drag = { startX: number; startY: number; endX: number; endY: number };

function normalizeBox(drag: Drag, rect: DOMRect): ReviewBox | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const x1 = Math.max(
    0,
    Math.min(1000, Math.round(((drag.startX - rect.left) / rect.width) * 1000)),
  );
  const y1 = Math.max(
    0,
    Math.min(1000, Math.round(((drag.startY - rect.top) / rect.height) * 1000)),
  );
  const x2 = Math.max(
    0,
    Math.min(1000, Math.round(((drag.endX - rect.left) / rect.width) * 1000)),
  );
  const y2 = Math.max(
    0,
    Math.min(1000, Math.round(((drag.endY - rect.top) / rect.height) * 1000)),
  );
  const box: ReviewBox = [
    Math.min(x1, x2),
    Math.min(y1, y2),
    Math.max(x1, x2),
    Math.max(y1, y2),
  ];
  if (box[2] - box[0] < 5 || box[3] - box[1] < 5) return null;
  if (box[0] === 0 && box[1] === 0 && box[2] === 1000 && box[3] === 1000)
    return null;
  return box;
}

export function ReviewPage({
  url,
  mimeType,
  page,
  onPageChange,
  selectedCitationPage,
  box,
  onBox,
  helpText = "Selecione uma citação e arraste sobre a página para marcar o trecho conferido.",
}: {
  url: string;
  mimeType: string;
  page: number;
  onPageChange: (page: number) => void;
  selectedCitationPage: number | null;
  box: ReviewBox | null;
  onBox: (box: ReviewBox) => void;
  helpText?: string;
}) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const [renderedPage, setRenderedPage] = useState(0);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState<Drag | null>(null);
  const [dragBox, setDragBox] = useState<ReviewBox | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const isPdf = mimeType === "application/pdf";
  const markable =
    selectedCitationPage === page &&
    !error &&
    (!isPdf || renderedPage === page);

  useEffect(() => {
    if (!isPdf) return;
    let disposed = false;
    let task: PDFDocumentLoadingTask | null = null;
    void import("pdfjs-dist")
      .then(async ({ getDocument, GlobalWorkerOptions }) => {
        if (disposed) return;
        GlobalWorkerOptions.workerSrc = workerUrl;
        task = getDocument({ url, enableXfa: false });
        const document = await task.promise;
        if (disposed) return;
        setPdf(document);
        setPageCount(document.numPages);
      })
      .catch(() => {
        if (!disposed) setError("Não foi possível renderizar o PDF.");
      });
    return () => {
      disposed = true;
      void task?.destroy();
    };
  }, [url, isPdf]);

  useEffect(() => {
    if (!pdf || !isPdf || page > pageCount) return;
    let disposed = false;
    let renderTask: ReturnType<
      Awaited<ReturnType<typeof pdf.getPage>>["render"]
    > | null = null;
    void pdf
      .getPage(page)
      .then(async (pdfPage) => {
        if (disposed) return;
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;
        const original = pdfPage.getViewport({ scale: 1 });
        const viewport = pdfPage.getViewport({
          scale: Math.min(1.6, 1000 / original.width),
        });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.ceil(viewport.width * ratio);
        canvas.height = Math.ceil(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        renderTask = pdfPage.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
        });
        await renderTask.promise;
        if (!disposed) setRenderedPage(page);
      })
      .catch(() => {
        if (!disposed) setError("Não foi possível renderizar esta página.");
      });
    return () => {
      disposed = true;
      renderTask?.cancel();
    };
  }, [pdf, isPdf, page, pageCount]);

  function point(event: PointerEvent<HTMLDivElement>): [number, number] {
    return [event.clientX, event.clientY];
  }

  function start(event: PointerEvent<HTMLDivElement>) {
    if (!markable) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const [x, y] = point(event);
    setDrag({ startX: x, startY: y, endX: x, endY: y });
    setDragBox(null);
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const [endX, endY] = point(event);
    const next = { ...drag, endX, endY };
    setDrag(next);
    const rect = surfaceRef.current?.getBoundingClientRect();
    setDragBox(rect ? normalizeBox(next, rect) : null);
  }

  function finish(event: PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const rect = surfaceRef.current?.getBoundingClientRect();
    const [endX, endY] = point(event);
    const selected = rect && normalizeBox({ ...drag, endX, endY }, rect);
    setDrag(null);
    setDragBox(null);
    if (selected) onBox(selected);
  }

  const visibleBox = drag ? dragBox : box;

  return (
    <div className="review-page-viewer">
      {isPdf && (
        <div className="review-page-controls">
          <button
            type="button"
            className="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Anterior
          </button>
          <span>
            Página {page} de {pageCount}
          </span>
          <button
            type="button"
            className="button"
            disabled={!pdf || page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            Próxima
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="review-alert">
          {error}
        </p>
      )}
      {isPdf && pdf && page > pageCount && (
        <p role="alert" className="review-alert">
          A página indicada não existe no original.
        </p>
      )}
      <div className="review-preview">
        <div ref={surfaceRef} className="review-page-surface">
          {isPdf ? (
            <canvas ref={canvasRef} aria-label={`Página ${page} do original`} />
          ) : (
            <img src={url} alt="Original enviado para conferência" />
          )}
          <div
            className={`review-page-overlay${markable ? " is-marking" : ""}`}
            aria-label={
              markable ? `Marcar citação na página ${page}` : undefined
            }
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={finish}
            onPointerCancel={() => setDrag(null)}
          >
            {visibleBox && markable && (
              <div
                className="review-page-box"
                style={{
                  left: `${visibleBox[0] / 10}%`,
                  top: `${visibleBox[1] / 10}%`,
                  width: `${(visibleBox[2] - visibleBox[0]) / 10}%`,
                  height: `${(visibleBox[3] - visibleBox[1]) / 10}%`,
                }}
              />
            )}
          </div>
        </div>
      </div>
      <p className="review-help">{helpText}</p>
    </div>
  );
}
