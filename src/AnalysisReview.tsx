import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ApiError,
  classifyAnalysisOriginal,
  decideAnalysisReview,
  getAnalysisReview,
  getLatestSourceDecision,
  listAnalysisAttention,
  listPendingReviews,
  listPendingSourceClassifications,
  listTeamAnalysisRequests,
  openAnalysisOriginal,
  type AttentionPage,
  type CitationVisualReview,
  type LatestSourceDecision,
  type PendingReviewPage,
  type PendingSourcePage,
  type RequestOperationPage,
  type SourceKind,
  type ReviewPacket,
} from "./api";
import { ReviewPage, type ReviewBox } from "./ReviewPage";
import {
  analysisWorkStatusLabel,
  itemLabel,
  statusLabel,
} from "./display-labels";
import "./review.css";

type Tab = "requests" | "classify" | "review" | "attention";

type CitationDraft = {
  box: [string, string, string, string];
  reason: string;
};

const flagLabels: Record<string, string> = {
  registry_identifier_unresolved: "Identificador registral não resolvido",
  owner_candidate_unresolved: "Pessoa titular não resolvida",
  ownership_chronology_unresolved: "Cronologia de titularidade pendente",
  burden_mention_requires_review: "Menção a ônus exige revisão",
  citation_not_confirmed: "Citação não confirmada pela camada de texto",
  criterion_scope_limited: "Escopo dos critérios limitado",
  timeline_unresolved: "Cronologia exige revisão",
  timeline_reference_unresolved: "Referência entre atos não resolvida",
  cancellation_requires_review: "Cancelamento exige revisão",
  image_evidence_requires_review: "Imagem exige conferência visual",
};

const citationLabels: Record<string, string> = {
  registration_number: "Número da matrícula",
  registry_office: "Cartório",
  municipality: "Município",
  owner: "Pessoa mencionada",
  penhora: "Penhora",
  hipoteca: "Hipoteca",
  timeline: "Trecho de ato",
  entry_label: "Rótulo do ato",
  reference_label: "Referência a outro ato",
};

const statusLabels: Record<string, string> = {
  text_found: "Texto localizado",
  text_missing: "Texto não localizado",
  no_text_layer: "Sem camada de texto",
  page_missing: "Página não localizada",
};

const docStateBadge: Record<string, string> = {
  available: "badge-green",
  expired: "badge-yellow",
  purged: "badge-gray",
};

const docStateLabel: Record<string, string> = {
  available: "Disponível",
  expired: "Expirado",
  purged: "Apagado",
};

function errorMessage(cause: unknown): string {
  if (cause instanceof ApiError) return cause.detail;
  return "Não foi possível concluir a solicitação. Tente novamente.";
}

function CitationFields({
  packet,
  drafts,
  onChange,
  selectedIndex,
  onSelect,
}: {
  packet: ReviewPacket;
  drafts: CitationDraft[];
  onChange: (index: number, next: CitationDraft) => void;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}) {
  return (
    <ol className="review-citations">
      {packet.citation_checks.map((citation, index) => (
        <li
          key={`${index}-${citation.kind}`}
          className={`review-citation${selectedIndex === index ? " is-selected" : ""}`}
        >
          <div className="review-citation-head">
            <span className="review-index">{index + 1}</span>
            <div>
              <strong>
                {citationLabels[citation.kind] ?? "Trecho citado"}
              </strong>
              <p>
                Página {citation.page} · {statusLabels[citation.status]}
              </p>
            </div>
          </div>
          <blockquote>{citation.value}</blockquote>
          <p className="review-help">
            Confira o trecho no original. Selecione esta citação e arraste a
            região na página; ajuste os valores abaixo se necessário. Explique o
            que identificou.
          </p>
          <button
            type="button"
            className="button"
            onClick={() => onSelect(index)}
          >
            {selectedIndex === index
              ? "Citação selecionada"
              : "Marcar no original"}
          </button>
          <div className="review-coordinates">
            {(["Esquerda", "Topo", "Direita", "Base"] as const).map(
              (label, coordinate) => (
                <label key={label}>
                  {label}
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    step="1"
                    value={drafts[index]?.box[coordinate] ?? ""}
                    onChange={(event) => {
                      const box: CitationDraft["box"] = [...drafts[index].box];
                      box[coordinate] = event.target.value;
                      onChange(index, { ...drafts[index], box });
                    }}
                  />
                </label>
              ),
            )}
          </div>
          <label className="review-label">
            Motivo desta conferência
            <textarea
              minLength={10}
              maxLength={500}
              value={drafts[index]?.reason ?? ""}
              onChange={(event) =>
                onChange(index, {
                  ...drafts[index],
                  reason: event.target.value,
                })
              }
              placeholder="Descreva o trecho conferido nesta página."
            />
          </label>
        </li>
      ))}
    </ol>
  );
}

function Findings({ packet }: { packet: ReviewPacket }) {
  const { findings } = packet;
  const listed = [
    ...findings.registry_identifiers.registration_numbers.map(
      (item) => `Matrícula: ${item.value} · p. ${item.page}`,
    ),
    ...findings.registry_identifiers.registry_offices.map(
      (item) => `Cartório: ${item.value} · p. ${item.page}`,
    ),
    ...findings.registry_identifiers.municipalities.map(
      (item) => `Município: ${item.value} · p. ${item.page}`,
    ),
    ...findings.persons_mentioned.map(
      (item) => `Pessoa mencionada: ${item.name} · p. ${item.page}`,
    ),
    ...findings.burdens_mentioned.penhora.map(
      (item) => `Menção a penhora: ${item.excerpt} · p. ${item.page}`,
    ),
    ...findings.burdens_mentioned.hipoteca.map(
      (item) => `Menção a hipoteca: ${item.excerpt} · p. ${item.page}`,
    ),
    ...findings.acts_cited.map(
      (item) =>
        `Ato ${item.entry_label ?? "sem rótulo"}: ${item.excerpt} · p. ${item.page}`,
    ),
  ];
  return (
    <section className="review-card" aria-labelledby="review-findings-title">
      <h2 id="review-findings-title">Achados para conferência</h2>
      <p className="review-help">
        Estes itens são extrações técnicas. Confirme cada afirmação no original
        antes de aprovar o conjunto.
      </p>
      {listed.length ? (
        <ul className="review-findings">
          {listed.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>Nenhum achado factual foi extraído.</p>
      )}
    </section>
  );
}

export function AnalysisReview({
  csrf,
  canReview,
  onUnauthorized,
  initialWorkId,
}: {
  csrf: string;
  canReview: boolean;
  onUnauthorized: () => void;
  initialWorkId?: string;
}) {
  const [activeTab, setActiveTab] = useState<Tab>(
    initialWorkId ? "review" : "requests",
  );

  // Tab 1: Pedidos
  const [requests, setRequests] = useState<RequestOperationPage | null>(null);
  const [requestsBusy, setRequestsBusy] = useState(false);
  const [requestsError, setRequestsError] = useState("");

  // Tab 2: Classificar fonte
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

  // Tab 3: Revisar análise
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

  // Tab 4: Atenção
  const [attention, setAttention] = useState<AttentionPage | null>(null);
  const [attentionError, setAttentionError] = useState("");
  const [attentionBusy, setAttentionBusy] = useState(false);

  const sourceOriginalUrlRef = useRef(sourceOriginalUrl);
  sourceOriginalUrlRef.current = sourceOriginalUrl;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (sourceOriginalUrlRef.current)
        URL.revokeObjectURL(sourceOriginalUrlRef.current);
    };
  }, []);

  // Tab 1: load on mount
  useEffect(() => {
    void listTeamAnalysisRequests()
      .then(setRequests)
      .catch((cause: unknown) => {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setRequestsError(errorMessage(cause));
      });
  }, [onUnauthorized]);

  // Tab 2 + 3 + 4: load when canReview
  useEffect(() => {
    if (!canReview) return;
    void listPendingSourceClassifications()
      .then(setSources)
      .catch((cause: unknown) => {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setSourcesError(errorMessage(cause));
      });
    void listPendingReviews()
      .then(setQueue)
      .catch((cause: unknown) => {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setQueueError(errorMessage(cause));
      });
    void listAnalysisAttention()
      .then(setAttention)
      .catch((cause: unknown) => {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setAttentionError(errorMessage(cause));
      });
  }, [canReview, onUnauthorized]);

  // Tab 3: auto-load if initialWorkId
  useEffect(() => {
    if (initialWorkId) void loadById(initialWorkId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMoreRequests() {
    if (!requests?.next_cursor) return;
    setRequestsBusy(true);
    setRequestsError("");
    try {
      const page = await listTeamAnalysisRequests(requests.next_cursor);
      setRequests((prev) =>
        prev
          ? {
              items: [...prev.items, ...page.items],
              next_cursor: page.next_cursor,
            }
          : page,
      );
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setRequestsError(errorMessage(cause));
    } finally {
      setRequestsBusy(false);
    }
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

  async function loadAttention(cursor?: string) {
    setAttentionBusy(true);
    setAttentionError("");
    try {
      setAttention(await listAnalysisAttention(cursor));
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setAttentionError(errorMessage(cause));
    } finally {
      setAttentionBusy(false);
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
      setDrafts(
        result.citation_checks.map(() => ({
          box: ["", "", "", ""],
          reason: "",
        })),
      );
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

  function citationReviews(): CitationVisualReview[] | null {
    if (!packet) return null;
    const reviews = drafts.map((draft, index) => {
      const box = draft.box.map(Number) as CitationVisualReview["box"];
      if (
        draft.box.some((value) => value.trim() === "") ||
        box.some(
          (value) => !Number.isInteger(value) || value < 0 || value > 1000,
        ) ||
        box[0] >= box[2] ||
        box[1] >= box[3] ||
        (box[0] === 0 && box[1] === 0 && box[2] === 1000 && box[3] === 1000) ||
        draft.reason.trim().length < 10
      )
        return null;
      return {
        citation_index: index,
        page: packet.citation_checks[index].page,
        box,
        reason: draft.reason.trim(),
      };
    });
    return reviews.every((item) => item !== null)
      ? (reviews as CitationVisualReview[])
      : null;
  }

  function selectedBox(): ReviewBox | null {
    if (selectedCitationIndex === null) return null;
    const values = drafts[selectedCitationIndex]?.box;
    if (!values || values.some((value) => value.trim() === "")) return null;
    const numbers = values.map(Number);
    return numbers.every(Number.isFinite)
      ? (numbers as [number, number, number, number])
      : null;
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
    const reviews = outcome === "approved" ? citationReviews() : [];
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

  return (
    <div className="review-page page-fade-in">
      <header className="review-heading">
        <p className="eyebrow">Análises</p>
        <h1>Análises</h1>
      </header>
      <nav className="tabs" role="tablist" aria-label="Abas de análise">
        <button
          role="tab"
          aria-selected={activeTab === "requests"}
          className={`tab${activeTab === "requests" ? " active" : ""}`}
          onClick={() => setActiveTab("requests")}
        >
          Pedidos
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "classify"}
          className={`tab${activeTab === "classify" ? " active" : ""}`}
          onClick={() => setActiveTab("classify")}
        >
          Classificar fonte
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "review"}
          className={`tab${activeTab === "review" ? " active" : ""}`}
          onClick={() => setActiveTab("review")}
        >
          Revisar análise
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "attention"}
          className={`tab${activeTab === "attention" ? " active" : ""}`}
          onClick={() => setActiveTab("attention")}
        >
          Atenção
        </button>
      </nav>

      {/* ── Tab 1: Pedidos ── */}
      {activeTab === "requests" && (
        <section className="review-card" aria-labelledby="tab-requests-title">
          <h2 id="tab-requests-title">Pedidos de análise</h2>
          {requestsError && (
            <p role="alert" className="review-alert">
              {requestsError}
            </p>
          )}
          {!requests && !requestsError && (
            <div
              className="skeleton-rows"
              role="status"
              aria-label="Carregando"
            >
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: "2rem" }} />
              ))}
            </div>
          )}
          {requests && (
            <>
              {requests.items.length === 0 ? (
                <p className="review-help">Nenhum pedido registrado.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Páginas</th>
                      <th>Documento</th>
                      <th>Pagamento</th>
                      <th>Trabalho</th>
                      <th>Criado em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.items.map((item) => (
                      <tr key={item.request_id}>
                        <td>
                          <code>{item.request_id.slice(0, 8)}</code>
                        </td>
                        <td>{item.page_count}</td>
                        <td>
                          <span
                            className={`pill ${docStateBadge[item.document_state] ?? "badge-gray"}`}
                          >
                            {docStateLabel[item.document_state] ??
                              statusLabel(item.document_state)}
                          </span>
                        </td>
                        <td>
                          {item.payment_status ? (
                            <span className="pill badge-gray">
                              {statusLabel(item.payment_status)}
                            </span>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td>
                          {item.work_status ? (
                            <span className="pill badge-blue">
                              {analysisWorkStatusLabel(item.work_status)}
                            </span>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td>
                          {new Date(item.created_at).toLocaleString("pt-BR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {requests.next_cursor && (
                <button
                  type="button"
                  className="button"
                  disabled={requestsBusy}
                  onClick={() => void loadMoreRequests()}
                >
                  Mais
                </button>
              )}
            </>
          )}
        </section>
      )}

      {/* ── Tab 2: Classificar fonte ── */}
      {activeTab === "classify" && (
        <section className="review-card" aria-labelledby="tab-classify-title">
          <h2 id="tab-classify-title">Classificar fonte</h2>
          {!canReview ? (
            <p className="review-help">
              Seu papel não permite classificar fontes.
            </p>
          ) : (
            <>
              {sourcesError && (
                <p role="alert" className="review-alert">
                  {sourcesError}
                </p>
              )}
              {classifyDone && (
                <p role="status" className="review-notice">
                  {classifyDone}
                </p>
              )}
              {!sources && !sourcesError && (
                <div
                  className="skeleton-rows"
                  role="status"
                  aria-label="Carregando"
                >
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="skeleton"
                      style={{ height: "2rem" }}
                    />
                  ))}
                </div>
              )}
              {sources && !selectedSourceId && (
                <>
                  {sources.items.length === 0 ? (
                    <p className="review-help">
                      Nenhum pedido aguardando classificação.
                    </p>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Criado em</th>
                          <th>Expira em</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sources.items.map((item) => (
                          <tr
                            key={item.request_id}
                            className="clickable-row"
                            onClick={() => void selectSource(item.request_id)}
                          >
                            <td>
                              <code>{item.request_id.slice(0, 8)}</code>
                            </td>
                            <td>
                              {new Date(item.created_at).toLocaleString(
                                "pt-BR",
                              )}
                            </td>
                            <td>
                              {new Date(item.expires_at).toLocaleString(
                                "pt-BR",
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {sources.next_cursor && (
                    <button
                      type="button"
                      className="button"
                      disabled={sourcesBusy}
                      onClick={() => {
                        setSourcesBusy(true);
                        void listPendingSourceClassifications(
                          sources.next_cursor ?? undefined,
                        )
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
                            if (
                              cause instanceof ApiError &&
                              cause.status === 401
                            )
                              onUnauthorized();
                            else setSourcesError(errorMessage(cause));
                          })
                          .finally(() => setSourcesBusy(false));
                      }}
                    >
                      Mais
                    </button>
                  )}
                </>
              )}
              {selectedSourceId && (
                <div className="review-classify-panel">
                  <button
                    type="button"
                    className="button"
                    onClick={() => setSelectedSourceId(null)}
                  >
                    ← Voltar
                  </button>
                  <p>
                    Pedido <code>{selectedSourceId.slice(0, 8)}</code>
                  </p>
                  {latestSourceDecision?.decision && (
                    <div className="review-existing-decision">
                      <strong>Classificação atual:</strong>{" "}
                      {itemLabel(latestSourceDecision.decision.source_kind)} —{" "}
                      {latestSourceDecision.decision.reason}
                    </div>
                  )}
                  {!sourceOriginalUrl && (
                    <>
                      <label className="review-label">
                        Motivo da leitura (mínimo 10 caracteres)
                        <textarea
                          minLength={10}
                          maxLength={500}
                          value={sourceOriginalReason}
                          onChange={(event) =>
                            setSourceOriginalReason(event.target.value)
                          }
                          placeholder="Ex.: verificar natureza do documento antes de classificar."
                        />
                      </label>
                      <button
                        type="button"
                        className="button secondary"
                        disabled={
                          classifyBusy ||
                          sourceOriginalReason.trim().length < 10
                        }
                        onClick={() => void openSourceOriginal()}
                      >
                        Abrir original
                      </button>
                    </>
                  )}
                  {sourceOriginalUrl && (
                    <a
                      href={sourceOriginalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button"
                      type={sourceOriginalType || undefined}
                    >
                      Ver original aberto
                    </a>
                  )}
                  {classifyError && (
                    <p role="alert" className="review-alert">
                      {classifyError}
                    </p>
                  )}
                  <form
                    className="form"
                    onSubmit={(event) => void submitClassify(event)}
                  >
                    <label htmlFor="classify-kind">Natureza do original</label>
                    <select
                      id="classify-kind"
                      value={sourceKindForm}
                      onChange={(event) =>
                        setSourceKindForm(event.target.value as SourceKind)
                      }
                    >
                      <option value="unverified">Não verificada</option>
                      <option value="third_party_report">
                        Relatório derivado
                      </option>
                      <option value="registry_record">
                        Documento registral
                      </option>
                    </select>
                    <label htmlFor="classify-reason">
                      Justificativa (mínimo 10 caracteres)
                    </label>
                    <textarea
                      id="classify-reason"
                      minLength={10}
                      maxLength={500}
                      value={sourceReasonForm}
                      onChange={(event) =>
                        setSourceReasonForm(event.target.value)
                      }
                      required
                    />
                    {latestSourceDecision?.decision && (
                      <p className="review-help">
                        Corrigindo decisão{" "}
                        <code>
                          {latestSourceDecision.decision.id.slice(0, 8)}
                        </code>
                      </p>
                    )}
                    <button
                      type="submit"
                      className="button primary"
                      disabled={
                        classifyBusy || sourceReasonForm.trim().length < 10
                      }
                    >
                      Classificar
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* ── Tab 3: Revisar análise ── */}
      {activeTab === "review" && (
        <>
          {!canReview ? (
            <section className="review-card">
              <h2>Revisar análise</h2>
              <p className="review-help">
                Seu papel não permite abrir documentos ou decidir análises.
              </p>
            </section>
          ) : (
            <>
              <section
                className="review-card"
                aria-labelledby="review-queue-title"
              >
                <div className="review-queue-heading">
                  <div>
                    <h2 id="review-queue-title">Aguardando revisão</h2>
                    <p className="review-help">
                      Trabalhos pagos e vigentes sem decisão da equipe.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="button"
                    disabled={queueBusy}
                    onClick={() => void loadQueue()}
                  >
                    Atualizar
                  </button>
                </div>
                {queueError && (
                  <p role="alert" className="review-alert">
                    {queueError}
                  </p>
                )}
                {!queue && !queueError && (
                  <div
                    className="skeleton-rows"
                    role="status"
                    aria-label="Carregando fila"
                  >
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.6rem 0",
                        }}
                      >
                        <div
                          style={{ display: "grid", gap: "0.4rem", flex: 1 }}
                        >
                          <div
                            className="skeleton"
                            style={{ height: "0.9rem", width: "65%" }}
                          />
                          <div
                            className="skeleton"
                            style={{ height: "0.75rem", width: "45%" }}
                          />
                        </div>
                        <div
                          className="skeleton"
                          style={{
                            height: "36px",
                            width: "80px",
                            borderRadius: "8px",
                            flexShrink: 0,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
                {queue &&
                  (queue.items.length ? (
                    <ul className="review-queue-list">
                      {queue.items.map((item) => (
                        <li key={item.work_id}>
                          <div>
                            <strong>Trabalho {item.work_id.slice(0, 8)}</strong>
                            <span>
                              Pedido {item.request_id.slice(0, 8)} · Concluído
                              em{" "}
                              {new Date(item.completed_at).toLocaleString(
                                "pt-BR",
                              )}
                            </span>
                            <span>
                              Expira em{" "}
                              {new Date(item.expires_at).toLocaleString(
                                "pt-BR",
                              )}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="button"
                            disabled={busy}
                            onClick={() => {
                              setWorkId(item.work_id);
                              void loadById(item.work_id);
                            }}
                          >
                            Conferir
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="review-help">Nenhum trabalho nesta página.</p>
                  ))}
                {queue?.next_cursor && (
                  <button
                    type="button"
                    className="button"
                    disabled={queueBusy}
                    onClick={() =>
                      void loadQueue(queue.next_cursor ?? undefined)
                    }
                  >
                    Próxima página
                  </button>
                )}
              </section>
              <details className="advanced-lookup">
                <summary>Abrir por ID (para casos fora da fila)</summary>
                <form className="review-card review-lookup" onSubmit={load}>
                  <label htmlFor="review-work-id">ID do trabalho</label>
                  <div>
                    <input
                      id="review-work-id"
                      type="text"
                      required
                      value={workId}
                      onChange={(event) => setWorkId(event.target.value)}
                      placeholder="UUIDv7 do trabalho concluído"
                    />
                    <button
                      className="button primary"
                      disabled={busy}
                      type="submit"
                    >
                      Consultar
                    </button>
                  </div>
                  <small>Também é possível abrir um trabalho pelo ID.</small>
                </form>
              </details>
              {error && (
                <p className="review-alert" role="alert">
                  {error}
                </p>
              )}
              {notice && (
                <p className="review-notice" role="status">
                  {notice}
                </p>
              )}
              {packet && (
                <>
                  <section
                    className="review-card review-summary"
                    aria-label="Estado da revisão"
                  >
                    <div>
                      <span>Solicitação</span>
                      <strong>{packet.request_id}</strong>
                    </div>
                    <div>
                      <span>Resultado técnico expira</span>
                      <strong>
                        {new Date(packet.expires_at).toLocaleString("pt-BR")}
                      </strong>
                    </div>
                    <div>
                      <span>Última decisão</span>
                      <strong>
                        {packet.latest_outcome === "approved"
                          ? "Aprovada"
                          : packet.latest_outcome === "inconclusive"
                            ? "Inconclusiva"
                            : "Aguardando revisão"}
                      </strong>
                    </div>
                  </section>
                  <div
                    className="review-mobile-steps"
                    aria-label="Etapas da revisão"
                  >
                    <button
                      ref={originalStepRef}
                      type="button"
                      aria-pressed={reviewStep === "original"}
                      className={reviewStep === "original" ? "is-active" : ""}
                      onClick={() => setReviewStep("original")}
                    >
                      <span>1</span> Original
                    </button>
                    <button
                      ref={decisionStepRef}
                      type="button"
                      aria-pressed={reviewStep === "decision"}
                      className={reviewStep === "decision" ? "is-active" : ""}
                      onClick={() => setReviewStep("decision")}
                    >
                      <span>2</span> Decisão
                    </button>
                  </div>
                  <div className="review-layout">
                    <div
                      className={`review-column review-step-original${reviewStep === "original" ? " is-current" : ""}`}
                    >
                      <section
                        className="review-card"
                        aria-labelledby="review-original-title"
                      >
                        <h2 id="review-original-title">Original</h2>
                        <p className="review-help">
                          A abertura registra seu motivo antes de liberar o
                          arquivo.
                        </p>
                        <label className="review-label">
                          Motivo da leitura
                          <textarea
                            minLength={10}
                            maxLength={500}
                            value={originalReason}
                            onChange={(event) =>
                              setOriginalReason(event.target.value)
                            }
                            placeholder="Ex.: conferir as citações da análise preliminar."
                          />
                        </label>
                        <button
                          className="button secondary"
                          type="button"
                          disabled={busy || originalReason.trim().length < 10}
                          onClick={openOriginal}
                        >
                          Abrir original auditado
                        </button>
                        {previewUrl && (
                          <ReviewPage
                            key={previewUrl}
                            url={previewUrl}
                            mimeType={previewType}
                            page={previewPage}
                            onPageChange={setPreviewPage}
                            selectedCitationPage={
                              selectedCitationIndex === null
                                ? null
                                : (packet.citation_checks[selectedCitationIndex]
                                    ?.page ?? null)
                            }
                            box={selectedBox()}
                            onBox={(box) => {
                              if (selectedCitationIndex === null) return;
                              setDrafts((current) =>
                                current.map((draft, index) =>
                                  index === selectedCitationIndex
                                    ? {
                                        ...draft,
                                        box: box.map(
                                          String,
                                        ) as CitationDraft["box"],
                                      }
                                    : draft,
                                ),
                              );
                            }}
                          />
                        )}
                      </section>
                      <Findings packet={packet} />
                      <button
                        className="review-step-next"
                        type="button"
                        onClick={() => {
                          setReviewStep("decision");
                          requestAnimationFrame(() =>
                            decisionStepRef.current?.focus(),
                          );
                        }}
                      >
                        Ir para decisão <span aria-hidden="true">→</span>
                      </button>
                    </div>
                    <form
                      className={`review-card review-decision review-step-decision${reviewStep === "decision" ? " is-current" : ""}`}
                      onSubmit={decide}
                    >
                      <h2>Decisão</h2>
                      <p className="review-help">
                        Cada decisão é imutável. Uma correção cria uma nova
                        revisão e informa a última decisão automaticamente.
                      </p>
                      <fieldset>
                        <legend>Resultado da conferência</legend>
                        <label>
                          <input
                            type="radio"
                            name="outcome"
                            checked={outcome === "inconclusive"}
                            onChange={() => setOutcome("inconclusive")}
                          />{" "}
                          Inconclusivo
                        </label>
                        <label>
                          <input
                            type="radio"
                            name="outcome"
                            checked={outcome === "approved"}
                            onChange={() => setOutcome("approved")}
                          />{" "}
                          Aprovar pacote factual
                        </label>
                      </fieldset>
                      <label className="review-label">
                        Natureza do original
                        <select
                          value={sourceKind}
                          onChange={(event) =>
                            setSourceKind(event.target.value as SourceKind)
                          }
                        >
                          <option value="unverified">Não verificada</option>
                          <option value="third_party_report">
                            Relatório derivado
                          </option>
                          <option value="registry_record">
                            Documento registral
                          </option>
                        </select>
                      </label>
                      {outcome === "approved" && (
                        <fieldset>
                          <legend>Flags técnicas confirmadas</legend>
                          {packet.flags.map((flag) => (
                            <label key={flag}>
                              <input
                                type="checkbox"
                                checked={confirmedFlags.includes(flag)}
                                onChange={(event) =>
                                  setConfirmedFlags((current) =>
                                    event.target.checked
                                      ? [...current, flag]
                                      : current.filter(
                                          (value) => value !== flag,
                                        ),
                                  )
                                }
                              />
                              {flagLabels[flag] ?? flag}
                            </label>
                          ))}
                        </fieldset>
                      )}
                      <h3>Citações</h3>
                      <CitationFields
                        packet={packet}
                        drafts={drafts}
                        onChange={(index, next) =>
                          setDrafts((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? next : item,
                            ),
                          )
                        }
                        selectedIndex={selectedCitationIndex}
                        onSelect={(index) => {
                          setSelectedCitationIndex(index);
                          setPreviewPage(packet.citation_checks[index].page);
                          setReviewStep("original");
                          if (window.matchMedia("(max-width: 640px)").matches)
                            requestAnimationFrame(() =>
                              originalStepRef.current?.focus(),
                            );
                        }}
                      />
                      <label className="review-label">
                        Motivo da decisão
                        <textarea
                          required
                          minLength={10}
                          maxLength={500}
                          value={decisionReason}
                          onChange={(event) =>
                            setDecisionReason(event.target.value)
                          }
                          placeholder="Explique a conclusão da conferência."
                        />
                      </label>
                      <button
                        className="button primary"
                        disabled={busy}
                        type="submit"
                      >
                        Registrar decisão
                      </button>
                    </form>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* ── Tab 4: Atenção ── */}
      {activeTab === "attention" && (
        <section className="review-card" aria-labelledby="attention-title">
          <div className="review-queue-heading">
            <div>
              <h2 id="attention-title">Exigem atenção</h2>
              <p className="review-help">
                Falhas, resultado externo incerto, suspensão financeira ou
                revisão desatualizada. A lista não reinicia trabalhos.
              </p>
            </div>
            {canReview && (
              <button
                type="button"
                className="button"
                disabled={attentionBusy}
                onClick={() => void loadAttention()}
              >
                Atualizar
              </button>
            )}
          </div>
          {!canReview ? (
            <p className="review-help">
              Seu papel não permite visualizar esta lista.
            </p>
          ) : (
            <>
              {attentionError && (
                <p role="alert" className="review-alert">
                  {attentionError}
                </p>
              )}
              {attention &&
                (attention.items.length ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Trabalho</th>
                        <th>Pedido</th>
                        <th>Status</th>
                        <th>Código de erro</th>
                        <th>Finalizado em</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attention.items.map((item) => {
                        const statusClass =
                          item.status === "failed"
                            ? "badge-red"
                            : item.status === "unknown"
                              ? "badge-yellow"
                              : item.status === "suspended"
                                ? "badge-gray"
                                : "badge-blue";
                        const statusText =
                          item.status === "failed"
                            ? "Falhou"
                            : item.status === "unknown"
                              ? "Incerto"
                              : item.status === "suspended"
                                ? "Suspenso"
                                : "Concluído";
                        return (
                          <tr key={item.work_id}>
                            <td>
                              <code>{item.work_id.slice(0, 8)}</code>
                            </td>
                            <td>
                              <code>{item.request_id.slice(0, 8)}</code>
                            </td>
                            <td>
                              <span className={`pill ${statusClass}`}>
                                {statusText}
                              </span>
                            </td>
                            <td>
                              <code>{item.error_code ?? "—"}</code>
                            </td>
                            <td>
                              {item.finished_at
                                ? new Date(item.finished_at).toLocaleString(
                                    "pt-BR",
                                  )
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="review-help">Nenhum trabalho nesta página.</p>
                ))}
              {attention?.next_cursor && (
                <button
                  type="button"
                  className="button"
                  disabled={attentionBusy}
                  onClick={() =>
                    void loadAttention(attention.next_cursor ?? undefined)
                  }
                >
                  Próxima página
                </button>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
