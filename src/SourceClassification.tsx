import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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
import { FieldAction } from "./FieldAction";
import { OpsKpis } from "./OpsParts";
import { OpsTable, type OpsColumn } from "./OpsTable";
import { ReviewPage } from "./ReviewPage";
import { RolePicker } from "./RolePicker";
import {
  SOURCE_OPTIONS,
  expiryLabel,
  expiryTone,
  sourceKpis,
} from "./source-queue-model";
import { useNow } from "./useNow";
import "./review.css";
import "./ops.css";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

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

  const sortedQueue = useMemo(
    () => [...queue].sort((a, b) => a.expires_at.localeCompare(b.expires_at)),
    [queue],
  );

  const columns: OpsColumn<PendingSourcePage["items"][number]>[] = useMemo(
    () => [
      {
        id: "request",
        label: "Pedido",
        locked: true,
        render: (item) => (
          <span className="ops-id">
            <strong>{item.request_id.slice(-8)}</strong>
            <small>enviado {dateTime.format(new Date(item.created_at))}</small>
          </span>
        ),
        text: (item) => item.request_id,
      },
      {
        id: "expires",
        label: "Expira em",
        align: "end",
        render: (item) => (
          <span
            className="ops-age"
            data-tone={
              expiryTone(item, now) === "danger"
                ? "danger"
                : expiryTone(item, now) === "warn"
                  ? "warn"
                  : "ok"
            }
          >
            {expiryLabel(item.expires_at, now)}
          </span>
        ),
        text: (item) => item.expires_at,
      },
    ],
    [now],
  );

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
      <section
        className="page ops"
        aria-labelledby="src-title"
        aria-busy={busy}
      >
        <header className="ops-head">
          <div>
            <p className="ops-eyebrow">
              Análise de arquivo · antes da cobrança
            </p>
            <h1 className="page-title" id="src-title">
              Fila de fontes
            </h1>
            <p className="page-subtitle">
              Confira se o arquivo enviado é um documento registral. A
              declaração visual não comprova autenticidade nem cria cotação. Os
              que expiram primeiro vêm no topo.
            </p>
          </div>
          <div className="ops-head-actions">
            <button
              type="button"
              className="btn btn-secondary btn-md"
              disabled={queueLoading}
              onClick={() => void loadPending()}
            >
              Atualizar
            </button>
          </div>
        </header>

        <OpsKpis
          items={sourceKpis(queue, now)}
          active={null}
          onPick={() => undefined}
        />

        {error && (
          <p className="alert alert-danger" role="alert">
            {error}
          </p>
        )}
        {queueError && (
          <div className="error-state" role="alert">
            <strong>Não foi possível carregar a fila</strong>
            <span>{queueError}</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void loadPending()}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {queue.length > 0 ? (
          <OpsTable
            label="Aguardando classificação"
            columns={columns}
            rows={sortedQueue}
            rowKey={(item) => item.request_id}
            hidden={[]}
            density="comfortable"
            selectedKey={null}
            rowTone={(item) => expiryTone(item, now)}
            actions={(item) => (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={busy}
                onClick={() => void loadById(item.request_id)}
              >
                Conferir
              </button>
            )}
            onOpen={(item) => void loadById(item.request_id)}
            card={(item) => (
              <>
                <span className="ops-card-top">
                  <strong>{item.request_id.slice(-8)}</strong>
                  <span
                    className="ops-age"
                    data-tone={
                      expiryTone(item, now) === "danger"
                        ? "danger"
                        : expiryTone(item, now) === "warn"
                          ? "warn"
                          : "ok"
                    }
                  >
                    expira em {expiryLabel(item.expires_at, now)}
                  </span>
                </span>
                <span className="ops-card-meta">
                  Enviado em {dateTime.format(new Date(item.created_at))}
                </span>
              </>
            )}
          />
        ) : (
          !queueLoading &&
          !queueError && (
            <div className="empty-state" role="status">
              <strong>Nenhum arquivo aguardando classificação</strong>
              <span>
                Pedidos sem decisão e sem preparação financeira aparecem aqui. A
                situação é conferida de novo ao abrir o original.
              </span>
            </div>
          )
        )}

        <div className="ops-foot">
          <span>
            {queue.length}{" "}
            {queue.length === 1 ? "pedido carregado" : "pedidos carregados"}
            <span className="ops-hint"> · J e K navegam, Enter abre</span>
          </span>
          {nextCursor && (
            <button
              type="button"
              className="btn btn-secondary btn-md"
              disabled={queueLoading}
              onClick={() => void loadPending(nextCursor)}
            >
              {queueLoading ? "Carregando…" : "Carregar mais"}
            </button>
          )}
        </div>

        <details className="ops-lookup">
          <summary>Abrir por ID (para casos fora da fila)</summary>
          <form onSubmit={load}>
            <FieldAction
              id="source-request-id"
              label="ID da solicitação"
              hint="Use o ID da solicitação de arquivo, não o do trabalho de análise."
              action={
                <button
                  className="btn btn-primary btn-md"
                  type="submit"
                  disabled={busy || !requestId.trim()}
                >
                  {busy ? "Aguarde…" : "Consultar"}
                </button>
              }
            >
              <input
                id="source-request-id"
                className="input"
                type="text"
                required
                autoComplete="off"
                spellCheck={false}
                value={requestId}
                onChange={(event) => setRequestId(event.target.value)}
                placeholder="UUIDv7 da solicitação"
              />
            </FieldAction>
          </form>
        </details>
      </section>
    );

  return (
    <section
      className="page ops"
      aria-labelledby="src-bench-title"
      aria-busy={busy}
    >
      <header className="ops-head">
        <div>
          <button
            type="button"
            className="btn btn-ghost btn-sm ops-back"
            onClick={() => {
              setActiveId("");
              setPreviewUrl("");
              setHasRead(false);
              setVisualConfirmed(false);
              setError("");
              setNotice("");
            }}
          >
            ← Voltar à fila
          </button>
          <h1 className="page-title" id="src-bench-title">
            Pedido <code>{activeId.slice(-8)}</code>
          </h1>
          <p className="page-subtitle">
            Abra o original, confira a natureza do documento e registre a
            decisão. A leitura fica auditada com o motivo.
          </p>
        </div>
        <div className="ops-head-actions">
          {latest ? (
            <span className="badge badge-info">
              {sourceLabels[latest.source_kind]} · revisão {latest.revision}
            </span>
          ) : (
            <span className="badge badge-warning">Sem decisão</span>
          )}
        </div>
      </header>

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
        <div
          className="ops-bench-col"
          data-current={reviewStep === "original" ? "true" : undefined}
        >
          <section
            className="ops-block"
            aria-labelledby="source-original-title"
          >
            <h2 className="ops-block-title" id="source-original-title">
              Original
            </h2>
            <p className="ops-lead">
              A API registra o motivo antes de entregar o arquivo. Confira as
              páginas necessárias para identificar a natureza da fonte.
            </p>
            <div className="form-field">
              <label className="form-field-label" htmlFor="source-read-reason">
                Motivo da leitura
              </label>
              <textarea
                id="source-read-reason"
                className="input"
                minLength={10}
                maxLength={500}
                value={readReason}
                onChange={(event) => setReadReason(event.target.value)}
                placeholder="Explique por que precisa conferir o original."
              />
              <span className="form-hint">
                {readReason.trim().length}/500 (mínimo 10)
              </span>
            </div>
            <div className="ops-actions">
              <button
                className="btn btn-secondary btn-md"
                type="button"
                disabled={busy || readReason.trim().length < 10}
                onClick={() => void openOriginal()}
              >
                {busy ? "Aguarde…" : "Abrir original auditado"}
              </button>
              <button
                className="btn btn-ghost btn-md ops-bench-next"
                type="button"
                onClick={() => {
                  setReviewStep("decision");
                  requestAnimationFrame(() => decisionStepRef.current?.focus());
                }}
              >
                Ir para a decisão →
              </button>
            </div>
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

        <div
          className="ops-bench-col"
          data-current={reviewStep === "decision" ? "true" : undefined}
        >
          <section className="ops-block" aria-labelledby="source-current-title">
            <h2 className="ops-block-title" id="source-current-title">
              Última classificação
            </h2>
            {latest ? (
              <dl className="ops-facts">
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
                  <dd>{dateTime.format(new Date(latest.created_at))}</dd>
                </div>
                <div>
                  <dt>Motivo</dt>
                  <dd>{latest.reason}</dd>
                </div>
              </dl>
            ) : (
              <p className="ops-lead">
                Ainda não existe decisão para este arquivo.
              </p>
            )}
          </section>

          <form className="ops-block" onSubmit={decide}>
            <h2 className="ops-block-title">
              {latest ? "Corrigir classificação" : "Registrar classificação"}
            </h2>
            <p className="ops-lead">
              {latest
                ? "Uma correção cria nova revisão. Abra o original novamente antes de registrar."
                : "Abra e confira o original antes de registrar a primeira decisão."}
            </p>
            <RolePicker<SourceKind>
              label="Natureza do original"
              value={sourceKind}
              options={SOURCE_OPTIONS}
              disabled={busy}
              onChange={setSourceKind}
            />
            <div className="form-field ops-field">
              <label
                className="form-field-label"
                htmlFor="source-decision-reason"
              >
                Motivo da classificação
              </label>
              <textarea
                id="source-decision-reason"
                className="input"
                required
                minLength={10}
                maxLength={500}
                value={decisionReason}
                onChange={(event) => setDecisionReason(event.target.value)}
                placeholder="Descreva o que foi observado no arquivo."
              />
              <span className="form-hint">
                {decisionReason.trim().length}/500 (mínimo 10)
              </span>
            </div>
            <label className="ops-check">
              <input
                type="checkbox"
                checked={visualConfirmed}
                disabled={!hasRead || busy}
                onChange={(event) => setVisualConfirmed(event.target.checked)}
              />
              Conferi visualmente o original e as páginas relevantes para esta
              classificação.
            </label>
            <p className="ops-lead">
              Documento registral declarado é só um requisito da futura cotação;
              a cobrança continua indisponível.
            </p>
            <div className="ops-actions">
              <button
                className="btn btn-primary btn-md"
                type="submit"
                disabled={
                  busy ||
                  !hasRead ||
                  !visualConfirmed ||
                  decisionReason.trim().length < 10
                }
              >
                {busy ? "Registrando…" : "Registrar decisão"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
