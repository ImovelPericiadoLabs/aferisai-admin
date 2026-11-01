import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ApiError,
  classifyAnalysisOriginal,
  getLatestSourceDecision,
  listPendingSourceClassifications,
  openAnalysisOriginal,
  type LatestSourceDecision,
  type PendingSourcePage,
  type SourceKind,
} from "./api";
import { errorMessage } from "./analysis-review-labels";

/** "Classificar fonte" tab: pending requests plus the classification form. */
export function useSourceClassification(
  csrf: string,
  canReview: boolean,
  onUnauthorized: () => void,
) {
  const [sources, setSources] = useState<PendingSourcePage | null>(null);
  const [sourcesBusy, setSourcesBusy] = useState(false);
  const [sourcesError, setSourcesError] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [latestSourceDecision, setLatestSourceDecision] =
    useState<LatestSourceDecision | null>(null);
  const [sourceOriginalReason, setSourceOriginalReason] = useState("");
  const [sourceOriginalUrl, setSourceOriginalUrl] = useState("");
  const [sourceOriginalType, setSourceOriginalType] = useState("");
  const [sourceKindForm, setSourceKindForm] =
    useState<SourceKind>("unverified");
  const [sourceReasonForm, setSourceReasonForm] = useState("");
  const [classifyBusy, setClassifyBusy] = useState(false);
  const [classifyError, setClassifyError] = useState("");
  const [classifyDone, setClassifyDone] = useState("");

  const sourceOriginalUrlRef = useRef(sourceOriginalUrl);
  sourceOriginalUrlRef.current = sourceOriginalUrl;

  useEffect(() => {
    return () => {
      if (sourceOriginalUrlRef.current)
        URL.revokeObjectURL(sourceOriginalUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!canReview) return;
    void listPendingSourceClassifications()
      .then(setSources)
      .catch((cause: unknown) => {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setSourcesError(errorMessage(cause));
      });
  }, [canReview, onUnauthorized]);

  function loadMoreSources(cursor: string) {
    setSourcesBusy(true);
    void listPendingSourceClassifications(cursor)
      .then((page) =>
        setSources((prev) =>
          prev
            ? {
                items: [...prev.items, ...page.items],
                next_cursor: page.next_cursor,
              }
            : page,
        ),
      )
      .catch((cause: unknown) => {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setSourcesError(errorMessage(cause));
      })
      .finally(() => setSourcesBusy(false));
  }

  async function selectSource(requestId: string) {
    setSelectedSourceId(requestId);
    setLatestSourceDecision(null);
    setSourceOriginalReason("");
    if (sourceOriginalUrl) URL.revokeObjectURL(sourceOriginalUrl);
    setSourceOriginalUrl("");
    setSourceOriginalType("");
    setSourceKindForm("unverified");
    setSourceReasonForm("");
    setClassifyError("");
    setClassifyDone("");
    try {
      const decision = await getLatestSourceDecision(requestId);
      setLatestSourceDecision(decision);
      if (decision.decision) {
        setSourceKindForm(decision.decision.source_kind);
        setSourceReasonForm("");
      }
    } catch {
      // non-critical; proceed without latest decision
    }
  }

  async function openSourceOriginal() {
    if (!selectedSourceId) return;
    setClassifyBusy(true);
    setClassifyError("");
    try {
      const blob = await openAnalysisOriginal(
        selectedSourceId,
        sourceOriginalReason,
        csrf,
      );
      setSourceOriginalType(blob.type);
      if (sourceOriginalUrl) URL.revokeObjectURL(sourceOriginalUrl);
      setSourceOriginalUrl(URL.createObjectURL(blob));
      const decision = await getLatestSourceDecision(selectedSourceId);
      setLatestSourceDecision(decision);
      if (decision.decision) setSourceKindForm(decision.decision.source_kind);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setClassifyError(errorMessage(cause));
    } finally {
      setClassifyBusy(false);
    }
  }

  async function submitClassify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSourceId) return;
    setClassifyBusy(true);
    setClassifyError("");
    setClassifyDone("");
    try {
      await classifyAnalysisOriginal(
        selectedSourceId,
        {
          source_kind: sourceKindForm,
          reason: sourceReasonForm.trim(),
          supersedes_decision_id: latestSourceDecision?.decision?.id ?? null,
        },
        csrf,
      );
      setClassifyDone("Classificação registrada.");
      const updated = await listPendingSourceClassifications();
      setSources(updated);
      setSelectedSourceId(null);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setClassifyError(errorMessage(cause));
    } finally {
      setClassifyBusy(false);
    }
  }

  return {
    sources,
    sourcesBusy,
    sourcesError,
    selectedSourceId,
    setSelectedSourceId,
    latestSourceDecision,
    sourceOriginalReason,
    setSourceOriginalReason,
    sourceOriginalUrl,
    sourceOriginalType,
    sourceKindForm,
    setSourceKindForm,
    sourceReasonForm,
    setSourceReasonForm,
    classifyBusy,
    classifyError,
    classifyDone,
    loadMoreSources,
    selectSource,
    openSourceOriginal,
    submitClassify,
  };
}

export type SourceClassification = ReturnType<typeof useSourceClassification>;
