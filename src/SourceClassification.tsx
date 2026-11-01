import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ApiError,
  classifyAnalysisOriginal,
  getLatestSourceDecision,
  listPendingSourceClassifications,
  openAnalysisOriginal,
  type PendingSourcePage,
  type SourceDecision,
  type SourceKind,
} from "./api";
import { message } from "./source-classification-labels";
import { SourceBenchHeader } from "./SourceBenchHeader";
import { SourceDecisionColumn } from "./SourceDecisionColumn";
import { SourceOriginalColumn } from "./SourceOriginalColumn";
import { SourceQueueView } from "./SourceQueueView";
import { useNow } from "./useNow";
import "./review.css";
import "./ops.css";

export function SourceClassification({
  csrf,
  canClassify,
  onUnauthorized,
  initialRequestId,
}: {
  csrf: string;
  canClassify: boolean;
  onUnauthorized: () => void;
  initialRequestId?: string;
}) {
  const [requestId, setRequestId] = useState(initialRequestId ?? "");
  const [activeId, setActiveId] = useState("");
  const [latest, setLatest] = useState<SourceDecision | null>(null);
  const [readReason, setReadReason] = useState("");
  const [sourceKind, setSourceKind] = useState<SourceKind>("unverified");
  const [decisionReason, setDecisionReason] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewType, setPreviewType] = useState("");
  const [page, setPage] = useState(1);
  const [hasRead, setHasRead] = useState(false);
  const [visualConfirmed, setVisualConfirmed] = useState(false);
  const [reviewStep, setReviewStep] = useState<"original" | "decision">(
    "original",
  );
  const decisionStepRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [queue, setQueue] = useState<PendingSourcePage["items"]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState("");
  const now = useNow();

  useEffect(() => {
    if (!canClassify) return;
    void listPendingSourceClassifications()
      .then((result) => {
        setQueue(result.items);
        setNextCursor(result.next_cursor);
      })
      .catch((cause: unknown) => {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else
          setQueueError(
            cause instanceof ApiError
              ? cause.detail
              : "Não foi possível carregar a fila. Atualize para tentar novamente.",
          );
      });
  }, [canClassify, onUnauthorized]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function loadPending(cursor?: string) {
    setQueueLoading(true);
    setQueueError("");
    try {
      const result = await listPendingSourceClassifications(cursor);
      setQueue((current) =>
        cursor ? [...current, ...result.items] : result.items,
      );
      setNextCursor(result.next_cursor);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setQueueError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível carregar a fila. Atualize para tentar novamente.",
        );
    } finally {
      setQueueLoading(false);
    }
  }

  async function loadById(id: string) {
    setRequestId(id);
    setBusy(true);
    setError("");
    setNotice("");
    setActiveId("");
    setPreviewUrl("");
    setHasRead(false);
    setVisualConfirmed(false);
    setReviewStep("original");
    try {
      const current = await getLatestSourceDecision(id);
      setActiveId(id);
      setLatest(current.decision);
      setSourceKind("unverified");
      setDecisionReason("");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  function load(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadById(requestId.trim());
  }

  async function openOriginal() {
    if (!activeId) return;
    setBusy(true);
    setError("");
    setNotice("");
    setHasRead(false);
    setVisualConfirmed(false);
    setPreviewUrl("");
    try {
      const blob = await openAnalysisOriginal(
        activeId,
        readReason.trim(),
        csrf,
      );
      setPreviewType(blob.type);
      setPreviewUrl(URL.createObjectURL(blob));
      setPage(1);
      setHasRead(true);
      setNotice(
        "Leitura registrada. Confira a natureza do original antes de decidir.",
      );
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  async function decide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !activeId ||
      !hasRead ||
      !visualConfirmed ||
      decisionReason.trim().length < 10
    )
      return;
    const previousId = latest?.id ?? null;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await classifyAnalysisOriginal(
        activeId,
        {
          source_kind: sourceKind,
          reason: decisionReason.trim(),
          supersedes_decision_id: previousId,
        },
        csrf,
      );
      setHasRead(false);
      setVisualConfirmed(false);
      setPreviewUrl("");
      setDecisionReason("");
      setSourceKind("unverified");
      setNotice(
        `Classificação ${result.id} registrada. Abra o original novamente para corrigir.`,
      );
      setQueue((current) =>
        current.filter((item) => item.request_id !== activeId),
      );
      try {
        const current = await getLatestSourceDecision(activeId);
        setLatest(current.decision);
      } catch {
        setError(
          "A decisão foi registrada, mas a atualização não carregou. Consulte a solicitação antes de agir novamente.",
        );
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        onUnauthorized();
      } else if (cause instanceof ApiError && cause.status !== 409) {
        setError(message(cause));
      } else {
        try {
          const current = await getLatestSourceDecision(activeId);
          setLatest(current.decision);
          if (current.decision?.id !== previousId) {
            setHasRead(false);
            setVisualConfirmed(false);
            setPreviewUrl("");
            setNotice(
              "A última classificação mudou. Confira a decisão e abra o original novamente antes de corrigir.",
            );
          } else setError(message(cause));
        } catch {
          setError(
            "Não foi possível verificar a última decisão. Consulte a solicitação antes de repetir.",
          );
        }
      }
    } finally {
      setBusy(false);
    }
  }

  if (!canClassify)
    return (
      <section className="page ops">
        <p className="alert alert-danger" role="alert">
          Seu papel não permite abrir ou classificar documentos.
        </p>
      </section>
    );

  if (!activeId)
    return (
      <SourceQueueView
        busy={busy}
        error={error}
        queue={queue}
        nextCursor={nextCursor}
        queueLoading={queueLoading}
        queueError={queueError}
        now={now}
        requestId={requestId}
        onRequestId={setRequestId}
        onLoadPending={(cursor) => void loadPending(cursor)}
        onLoadById={(id) => void loadById(id)}
        onLookup={load}
      />
    );

  return (
    <section
      className="page ops"
      aria-labelledby="src-bench-title"
      aria-busy={busy}
    >
      <SourceBenchHeader
        activeId={activeId}
        latest={latest}
        onBack={() => {
          setActiveId("");
          setPreviewUrl("");
          setHasRead(false);
          setVisualConfirmed(false);
          setError("");
          setNotice("");
        }}
      />

      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="alert alert-success" role="status">
          {notice}
        </p>
      )}

      <div
        className="ops-views ops-bench-steps"
        role="group"
        aria-label="Etapas da classificação"
      >
        <button
          type="button"
          className="ops-view"
          aria-pressed={reviewStep === "original"}
          onClick={() => setReviewStep("original")}
        >
          1 · Original
        </button>
        <button
          ref={decisionStepRef}
          type="button"
          className="ops-view"
          aria-pressed={reviewStep === "decision"}
          onClick={() => setReviewStep("decision")}
        >
          2 · Decisão
        </button>
      </div>

      <div className="ops-bench">
        <SourceOriginalColumn
          current={reviewStep === "original"}
          busy={busy}
          readReason={readReason}
          previewUrl={previewUrl}
          previewType={previewType}
          page={page}
          onReadReason={setReadReason}
          onOpenOriginal={() => void openOriginal()}
          onGoToDecision={() => {
            setReviewStep("decision");
            requestAnimationFrame(() => decisionStepRef.current?.focus());
          }}
          onPageChange={setPage}
        />

        <SourceDecisionColumn
          current={reviewStep === "decision"}
          latest={latest}
          busy={busy}
          sourceKind={sourceKind}
          decisionReason={decisionReason}
          hasRead={hasRead}
          visualConfirmed={visualConfirmed}
          onSourceKind={setSourceKind}
          onDecisionReason={setDecisionReason}
          onVisualConfirmed={setVisualConfirmed}
          onSubmit={(event) => void decide(event)}
        />
      </div>
    </section>
  );
}
