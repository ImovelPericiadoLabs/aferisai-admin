import { useEffect, useState, type FormEvent } from "react";
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
import { ReviewPage } from "./ReviewPage";
import "./review.css";

const sourceLabels: Record<SourceKind, string> = {
  registry_record: "Documento registral",
  third_party_report: "Relatório derivado",
  unverified: "Natureza não verificada",
};

function message(cause: unknown): string {
  return cause instanceof ApiError
    ? cause.detail
    : "Não foi possível confirmar a resposta da API. Consulte a última decisão antes de tentar novamente.";
}

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [queue, setQueue] = useState<PendingSourcePage["items"]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState("");

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
      <section className="review-card">
        <h1>Classificar fonte</h1>
        <p>Seu papel não permite abrir ou classificar documentos.</p>
      </section>
    );

  return (
    <div className="review-page" aria-busy={busy}>
      <header className="review-heading">
        <p className="eyebrow">Análise de arquivo · antes da cobrança</p>
        <h1>Classificar fonte</h1>
        <p>
          Confira se o arquivo enviado é um documento registral. Esta declaração
          visual não comprova autenticidade nem cria uma cotação.
        </p>
      </header>
      <section className="review-card" aria-labelledby="source-queue-title">
        <div className="review-queue-heading">
          <div>
            <h2 id="source-queue-title">Aguardando classificação</h2>
            <p className="review-help">
              Pedidos sem decisão e sem preparação financeira. A situação é
              conferida novamente ao abrir o original.
            </p>
          </div>
          <button
            className="button secondary"
            type="button"
            disabled={queueLoading}
            onClick={() => void loadPending()}
          >
            Atualizar
          </button>
        </div>
        {queueError && (
          <p className="review-alert" role="alert">
            {queueError}
          </p>
        )}
        {queue.length ? (
          <ul className="review-queue-list">
            {queue.map((item) => (
              <li key={item.request_id}>
                <div>
                  <strong>{item.request_id}</strong>
                  <span>
                    Enviado em{" "}
                    {new Date(item.created_at).toLocaleString("pt-BR")}
                    {" · "}expira em{" "}
                    {new Date(item.expires_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <button
                  className="button secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => void loadById(item.request_id)}
                >
                  Conferir
                </button>
              </li>
            ))}
          </ul>
        ) : (
          !queueLoading && (
            <p className="review-help">Nenhum pedido nesta página.</p>
          )
        )}
        {nextCursor && (
          <button
            className="button secondary"
            type="button"
            disabled={queueLoading}
            onClick={() => void loadPending(nextCursor)}
          >
            Carregar mais
          </button>
        )}
      </section>
      <form className="review-card review-lookup" onSubmit={load}>
        <label htmlFor="source-request-id">ID da solicitação</label>
        <div>
          <input
            id="source-request-id"
            type="text"
            required
            value={requestId}
            onChange={(event) => {
              setRequestId(event.target.value);
              setActiveId("");
              setPreviewUrl("");
              setHasRead(false);
              setVisualConfirmed(false);
            }}
            placeholder="UUIDv7 da solicitação de arquivo"
          />
          <button className="button primary" type="submit" disabled={busy}>
            {busy ? "Aguarde…" : "Consultar"}
          </button>
        </div>
        <small>Use o ID da solicitação, não o ID do trabalho de análise.</small>
      </form>
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
      {activeId && (
        <div className="review-layout">
          <div className="review-column">
            <section
              className="review-card"
              aria-labelledby="source-original-title"
            >
              <h2 id="source-original-title">Original</h2>
              <p className="review-help">
                A API registra o motivo antes de entregar o arquivo. Confira as
                páginas necessárias para identificar a natureza da fonte.
              </p>
              <label className="review-label">
                Motivo da leitura
                <textarea
                  minLength={10}
                  maxLength={500}
                  value={readReason}
                  onChange={(event) => setReadReason(event.target.value)}
                  placeholder="Explique por que precisa conferir o original."
                />
              </label>
              <button
                className="button secondary"
                type="button"
                disabled={busy || readReason.trim().length < 10}
                onClick={() => void openOriginal()}
              >
                {busy ? "Aguarde…" : "Abrir original auditado"}
              </button>
              {previewUrl && (
                <ReviewPage
                  key={previewUrl}
                  url={previewUrl}
                  mimeType={previewType}
                  page={page}
                  onPageChange={setPage}
                  selectedCitationPage={null}
                  box={null}
                  onBox={() => undefined}
                  helpText="Leia o original antes de registrar a natureza da fonte."
                />
              )}
            </section>
          </div>
          <div className="review-column">
            <section
              className="review-card"
              aria-labelledby="source-current-title"
            >
              <h2 id="source-current-title">Última classificação</h2>
              {latest ? (
                <dl className="source-current">
                  <div>
                    <dt>Natureza</dt>
                    <dd>{sourceLabels[latest.source_kind]}</dd>
                  </div>
                  <div>
                    <dt>Revisão</dt>
                    <dd>{latest.revision}</dd>
                  </div>
                  <div>
                    <dt>Registrada em</dt>
                    <dd>
                      {new Date(latest.created_at).toLocaleString("pt-BR")}
                    </dd>
                  </div>
                  <div>
                    <dt>Motivo</dt>
                    <dd>{latest.reason}</dd>
                  </div>
                </dl>
              ) : (
                <p className="review-help">
                  Ainda não existe decisão para este arquivo.
                </p>
              )}
            </section>
            <form className="review-card review-decision" onSubmit={decide}>
              <h2>
                {latest ? "Corrigir classificação" : "Registrar classificação"}
              </h2>
              <p className="review-help">
                {latest
                  ? "Uma correção cria nova revisão. Abra o original novamente antes de registrar."
                  : "Abra e confira o original antes de registrar a primeira decisão."}
              </p>
              <label className="review-label">
                Natureza do original
                <select
                  value={sourceKind}
                  onChange={(event) =>
                    setSourceKind(event.target.value as SourceKind)
                  }
                >
                  <option value="unverified">Não foi possível verificar</option>
                  <option value="third_party_report">Relatório derivado</option>
                  <option value="registry_record">Documento registral</option>
                </select>
              </label>
              <label className="review-label">
                Motivo da classificação
                <textarea
                  required
                  minLength={10}
                  maxLength={500}
                  value={decisionReason}
                  onChange={(event) => setDecisionReason(event.target.value)}
                  placeholder="Descreva o que foi observado no arquivo."
                />
              </label>
              <label className="source-confirmation">
                <input
                  type="checkbox"
                  checked={visualConfirmed}
                  disabled={!hasRead || busy}
                  onChange={(event) => setVisualConfirmed(event.target.checked)}
                />
                Conferi visualmente o original e as páginas relevantes para esta
                classificação.
              </label>
              <p className="review-help">
                Documento registral declarado é apenas um requisito para a
                futura cotação; a cobrança permanece indisponível.
              </p>
              <button
                className="button primary"
                type="submit"
                disabled={busy || !hasRead || !visualConfirmed}
              >
                {busy ? "Registrando…" : "Registrar decisão"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
