import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ApiError,
  decideAnalysisReview,
  getAnalysisReview,
  listPendingReviews,
  openAnalysisOriginal,
  type PendingReviewPage,
  type ReviewPacket,
  type SourceKind,
} from "./api";
import { errorMessage } from "./analysis-review-labels";
import {
  buildCitationReviews,
  emptyDrafts,
  type CitationDraft,
} from "./analysis-review-model";

type Args = {
  csrf: string;
  canReview: boolean;
  onUnauthorized: () => void;
};

/** "Revisar análise" tab: review queue, loaded packet and the decision flow. */
export function useAnalysisReviewWork({
  csrf,
  canReview,
  onUnauthorized,
  initialWorkId,
}: Args & { initialWorkId?: string }) {
  const [workId, setWorkId] = useState(initialWorkId ?? "");
  const [packet, setPacket] = useState<ReviewPacket | null>(null);
  const [drafts, setDrafts] = useState<CitationDraft[]>([]);
  const [confirmedFlags, setConfirmedFlags] = useState<string[]>([]);
  const [originalReason, setOriginalReason] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewType, setPreviewType] = useState("");
  const [previewPage, setPreviewPage] = useState(1);
  const [selectedCitationIndex, setSelectedCitationIndex] = useState<
    number | null
  >(null);
  const [reviewStep, setReviewStep] = useState<"original" | "decision">(
    "original",
  );
  const originalStepRef = useRef<HTMLButtonElement>(null);
  const decisionStepRef = useRef<HTMLButtonElement>(null);
  const [outcome, setOutcome] = useState<"approved" | "inconclusive">(
    "inconclusive",
  );
  const [sourceKind, setSourceKind] = useState<SourceKind>("unverified");
  const [decisionReason, setDecisionReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [queue, setQueue] = useState<PendingReviewPage | null>(null);
  const [queueError, setQueueError] = useState("");
  const [queueBusy, setQueueBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!canReview) return;
    void listPendingReviews()
      .then(setQueue)
      .catch((cause: unknown) => {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setQueueError(errorMessage(cause));
      });
  }, [canReview, onUnauthorized]);

  async function loadQueue(cursor?: string) {
    setQueueBusy(true);
    setQueueError("");
    try {
      setQueue(await listPendingReviews(cursor));
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setQueueError(errorMessage(cause));
    } finally {
      setQueueBusy(false);
    }
  }

  async function loadById(id: string) {
    setBusy(true);
    setError("");
    setNotice("");
    setPacket(null);
    setPreviewUrl("");
    setPreviewPage(1);
    setSelectedCitationIndex(null);
    setReviewStep("original");
    try {
      const result = await getAnalysisReview(id);
      setPacket(result);
      setDrafts(emptyDrafts(result));
      setConfirmedFlags([]);
      setOutcome("inconclusive");
      setSourceKind("unverified");
      setDecisionReason("");
    } catch (cause) {
      if (cause instanceof ApiError) {
        if (cause.status === 401) onUnauthorized();
        else if (cause.status === 404)
          setError("Pedido ou trabalho não encontrado.");
        else if (cause.status === 409)
          setError("Análise ou pagamento indisponível para revisão.");
        else if (cause.status === 410)
          setError("Pacote expirado; solicitar novo trabalho.");
        else setError(cause.detail);
      } else {
        setError("Não foi possível consultar a API agora.");
      }
    } finally {
      setBusy(false);
    }
  }

  function load(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadById(workId.trim());
  }

  async function openOriginal() {
    if (!packet) return;
    setBusy(true);
    setError("");
    try {
      const blob = await openAnalysisOriginal(
        packet.request_id,
        originalReason,
        csrf,
      );
      setPreviewType(blob.type);
      setPreviewUrl(URL.createObjectURL(blob));
      setPreviewPage(1);
      setSelectedCitationIndex(null);
      setNotice("Leitura auditada. Confira o original antes de decidir.");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function decide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!packet) return;
    setError("");
    setNotice("");
    if (decisionReason.trim().length < 10) {
      setError("Descreva o motivo da decisão com pelo menos 10 caracteres.");
      return;
    }
    const reviews =
      outcome === "approved" ? buildCitationReviews(packet, drafts) : [];
    if (
      outcome === "approved" &&
      (sourceKind !== "registry_record" ||
        packet.flags.length !== confirmedFlags.length) &&
      !reviews
    ) {
      setError(
        "Para aprovar: confirme todas as flags e preencha todas as citações.",
      );
      return;
    }
    if (outcome === "approved" && reviews === null) {
      setError(
        "Preencha todas as citações com coordenadas válidas e motivo (mínimo 10 chars).",
      );
      return;
    }
    setBusy(true);
    try {
      await decideAnalysisReview(
        packet.work_id,
        {
          outcome,
          source_kind: sourceKind,
          reason: decisionReason.trim(),
          acknowledged_flags: outcome === "approved" ? confirmedFlags : [],
          citation_reviews: reviews ?? [],
          supersedes_decision_id: packet.latest_decision_id,
        },
        csrf,
      );
      setNotice(
        outcome === "approved"
          ? "Aprovação registrada."
          : "Decisão inconclusiva registrada.",
      );
      setPacket(null);
      setWorkId("");
      void loadQueue();
    } catch (cause) {
      if (cause instanceof ApiError) {
        if (cause.status === 401) onUnauthorized();
        else if (cause.status === 409) {
          try {
            const updated = await getAnalysisReview(packet.work_id);
            setPacket(updated);
            setError(
              "O estado foi atualizado. Confira a última decisão antes de agir novamente.",
            );
          } catch {
            setError(
              "Não foi possível confirmar o resultado. Consulte o trabalho antes de repetir a decisão.",
            );
          }
        } else setError(cause.detail);
      } else setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return {
    workId,
    setWorkId,
    packet,
    drafts,
    setDrafts,
    confirmedFlags,
    setConfirmedFlags,
    originalReason,
    setOriginalReason,
    previewUrl,
    previewType,
    previewPage,
    setPreviewPage,
    selectedCitationIndex,
    setSelectedCitationIndex,
    reviewStep,
    setReviewStep,
    originalStepRef,
    decisionStepRef,
    outcome,
    setOutcome,
    sourceKind,
    setSourceKind,
    decisionReason,
    setDecisionReason,
    busy,
    error,
    notice,
    queue,
    queueError,
    queueBusy,
    loadQueue,
    loadById,
    load,
    openOriginal,
    decide,
  };
}

export type AnalysisReviewWork = ReturnType<typeof useAnalysisReviewWork>;
