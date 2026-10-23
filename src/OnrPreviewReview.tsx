import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  createOnrPreviewReview,
  getOnrOrdersInspection,
  getOnrPreviewReviews,
  listOnrPreviewAttempts,
  type OnrPortalOrdersInspection,
  type OnrPreviewAttentionItem,
  type OnrPreviewReviewHistory,
} from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import { decisionLabel } from "./display-labels";
import { OnrInspection } from "./OnrInspection";
import { OnrVersionHistory } from "./OnrVersionHistory";
import {
  DECISION_OPTIONS,
  latestReviewId,
  shortId,
  shortSha,
  type ReviewDecision,
} from "./onr-review-model";
import { RolePicker } from "./RolePicker";
import type { ToastKind } from "./useToast";
import "./onr-review.css";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function problem(cause: unknown, fallback: string) {
  return cause instanceof ApiError ? cause.detail : fallback;
}

/** Reads every page of the (ascending) version history of one attempt. */
async function loadHistory(
  attemptId: string,
): Promise<OnrPreviewReviewHistory["items"]> {
  const all: OnrPreviewReviewHistory["items"] = [];
  let after = 0;
  for (let guard = 0; guard < 20; guard += 1) {
    const page = await getOnrPreviewReviews(attemptId, after);
    all.push(...page.items);
    if (page.next_version === null) break;
    after = page.next_version;
  }
  return all;
}

export function OnrPreviewReview({
  csrf,
  onUnauthorized,
  onToast,
}: {
  csrf: string;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
}) {
  const [items, setItems] = useState<OnrPreviewAttentionItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [selected, setSelected] = useState<OnrPreviewAttentionItem | null>(
    null,
  );
  const [inspection, setInspection] =
    useState<OnrPortalOrdersInspection | null>(null);
  const [history, setHistory] = useState<
    OnrPreviewReviewHistory["items"] | null
  >(null);
  const [inspectError, setInspectError] = useState("");
  const [decision, setDecision] = useState<ReviewDecision>("inconclusive");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");

  const guard = useCallback(
    (cause: unknown) => {
      if (cause instanceof ApiError && cause.status === 401) {
        onUnauthorized();
        return true;
      }
      return false;
    },
    [onUnauthorized],
  );

  const loadList = useCallback(
    async (next?: string) => {
      setLoading(true);
      try {
        const page = await listOnrPreviewAttempts(next);
        setItems((current) =>
          next ? [...current, ...page.items] : page.items,
        );
        setCursor(page.next_cursor);
        setListError("");
      } catch (cause) {
        if (!guard(cause))
          setListError(problem(cause, "Não foi possível carregar a fila."));
      } finally {
        setLoading(false);
      }
    },
    [guard],
  );

  useEffect(() => {
    queueMicrotask(() => void loadList());
  }, [loadList]);

  const inspect = useCallback(
    async (item: OnrPreviewAttentionItem) => {
      setInspection(null);
      setHistory(null);
      setInspectError("");
      const [ins, hist] = await Promise.allSettled([
        getOnrOrdersInspection(item.attempt_id),
        loadHistory(item.attempt_id),
      ]);
      if (ins.status === "fulfilled") setInspection(ins.value);
      else if (!guard(ins.reason))
        setInspectError(
          problem(ins.reason, "Não foi possível ler a listagem do portal."),
        );
      if (hist.status === "fulfilled") setHistory(hist.value);
      else if (!guard(hist.reason)) setHistory([]);
    },
    [guard],
  );

  function open(item: OnrPreviewAttentionItem) {
    setSelected(item);
    setDecision("inconclusive");
    setSaveError("");
    void inspect(item);
  }

  function back() {
    setSelected(null);
    setInspection(null);
    setHistory(null);
    setInspectError("");
  }

  async function confirm(reason: string) {
    if (!selected || !inspection || history === null) return;
    setBusy(true);
    setSaveError("");
    try {
      await createOnrPreviewReview(
        selected.attempt_id,
        decision,
        reason,
        latestReviewId(history),
        inspection.listing_sha256,
        csrf,
      );
      setConfirming(false);
      onToast("Revisão registrada. A tentativa continua aberta.", "success");
      await Promise.all([inspect(selected), loadList()]);
    } catch (cause) {
      setConfirming(false);
      if (guard(cause)) return;
      const stale = cause instanceof ApiError && cause.status === 409;
      setSaveError(
        stale
          ? "A listagem do portal mudou ou outra revisão foi registrada. A inspeção foi recarregada; confira e decida de novo."
          : problem(cause, "Não foi possível registrar a revisão."),
      );
      if (stale) await inspect(selected);
    } finally {
      setBusy(false);
    }
  }

  const nextVersion =
    (history ? Math.max(0, ...history.map((h) => h.version)) : 0) + 1;

  return (
    <section className="page onr-rv" aria-labelledby="onr-rv-title">
      <header className="page-header">
        <div>
          <p className="onr-rv-eyebrow">Aquisição registral</p>
          <h1 className="page-title" id="onr-rv-title">
            Prévia ONR
          </h1>
          <p className="page-subtitle">
            Tentativas de prévia sem resultado certo. A equipe confere o portal
            e registra uma decisão auditada; isso não libera compra nem
            cobrança.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-md"
          disabled={loading}
          onClick={() => void loadList()}
        >
          Atualizar fila
        </button>
      </header>

      <div className={`onr-rv-grid${selected ? " has-selection" : ""}`}>
        <aside className="onr-rv-queue" aria-label="Fila de tentativas">
          {listError && (
            <div className="error-state" role="alert">
              <strong>Não foi possível carregar a fila</strong>
              <span>{listError}</span>
              <button
                className="btn btn-secondary btn-sm"
                type="button"
                onClick={() => void loadList()}
              >
                Tentar novamente
              </button>
            </div>
          )}
          {loading && items.length === 0 && !listError && (
            <div
              className="rules-skeleton"
              role="status"
              aria-label="Carregando fila"
            >
              <span className="skeleton" />
              <span className="skeleton" />
            </div>
          )}
          {!loading && items.length === 0 && !listError && (
            <div className="empty-state" role="status">
              <strong>Nenhuma prévia aguardando revisão</strong>
              <span>
                As tentativas incertas aparecem aqui assim que existirem.
              </span>
            </div>
          )}
          <ul className="onr-rv-cards">
            {items.map((item) => (
              <li key={item.attempt_id}>
                <button
                  type="button"
                  className="onr-rv-card"
                  aria-pressed={selected?.attempt_id === item.attempt_id}
                  onClick={() => open(item)}
                >
                  <span className="onr-rv-card-top">
                    <strong>
                      {dateTime.format(new Date(item.started_at))}
                    </strong>
                    <span
                      className={`badge ${item.latest_decision ? "badge-info" : "badge-warning"}`}
                    >
                      {item.latest_decision
                        ? decisionLabel(item.latest_decision)
                        : "Sem revisão"}
                    </span>
                  </span>
                  <span className="onr-rv-card-sub">
                    Tentativa <code>{shortId(item.attempt_id)}</code>
                    {item.review_version
                      ? ` · versão ${item.review_version}`
                      : ""}
                  </span>
                  <span className="onr-rv-card-sub">
                    Pedido <code>{shortId(item.operation_id)}</code>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {cursor && (
            <button
              type="button"
              className="btn btn-secondary btn-md"
              disabled={loading}
              onClick={() => void loadList(cursor)}
            >
              Carregar mais
            </button>
          )}
        </aside>

        <div className="onr-rv-detail">
          {!selected ? (
            <div className="empty-state" role="status">
              <strong>Escolha uma tentativa</strong>
              <span>
                Selecione na fila para ver a listagem do portal e as revisões
                anteriores.
              </span>
            </div>
          ) : (
            <>
              <div className="onr-rv-detail-head">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm onr-rv-back"
                  onClick={back}
                >
                  ← Voltar à fila
                </button>
                <h2 className="onr-rv-title">
                  Tentativa <code>{shortId(selected.attempt_id)}</code>
                </h2>
                <p className="onr-rv-muted">
                  Iniciada em {dateTime.format(new Date(selected.started_at))} ·
                  pedido <code>{selected.operation_id}</code>
                </p>
              </div>

              {inspectError && (
                <div className="error-state" role="alert">
                  <strong>Não foi possível ler o portal</strong>
                  <span>{inspectError}</span>
                  <button
                    className="btn btn-secondary btn-sm"
                    type="button"
                    onClick={() => void inspect(selected)}
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
              {!inspection && !inspectError && (
                <div
                  className="rules-skeleton"
                  role="status"
                  aria-label="Lendo o portal"
                >
                  <span className="skeleton" />
                  <span className="skeleton" />
                  <span className="skeleton" />
                </div>
              )}
              {inspection && (
                <OnrInspection
                  key={inspection.listing_sha256}
                  attemptId={selected.attempt_id}
                  inspection={inspection}
                  onStale={() => {
                    onToast(
                      "A listagem do portal mudou. A inspeção foi recarregada.",
                      "error",
                    );
                    void inspect(selected);
                  }}
                  onCopy={(text) => {
                    void navigator.clipboard?.writeText(text).then(
                      () => onToast("SHA-256 copiado.", "success"),
                      () => onToast("Não foi possível copiar.", "error"),
                    );
                  }}
                />
              )}

              <section
                className="onr-rv-block"
                aria-labelledby="onr-history-title"
              >
                <h3 className="onr-rv-title" id="onr-history-title">
                  Versões da revisão
                </h3>
                {history === null ? (
                  <div
                    className="rules-skeleton"
                    role="status"
                    aria-label="Carregando versões"
                  >
                    <span className="skeleton" />
                  </div>
                ) : (
                  <OnrVersionHistory
                    items={history}
                    currentSha={inspection?.listing_sha256 ?? null}
                  />
                )}
              </section>

              {inspection && history !== null && (
                <section
                  className="onr-rv-block"
                  aria-labelledby="onr-decide-title"
                >
                  <h3 className="onr-rv-title" id="onr-decide-title">
                    {history.length
                      ? "Corrigir a decisão"
                      : "Registrar a decisão"}
                  </h3>
                  {saveError && (
                    <p className="alert alert-danger" role="alert">
                      {saveError}
                    </p>
                  )}
                  <RolePicker<ReviewDecision>
                    label="O que você viu no portal"
                    value={decision}
                    options={DECISION_OPTIONS}
                    disabled={busy}
                    onChange={setDecision}
                  />
                  <div className="onr-rv-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-md"
                      aria-haspopup="dialog"
                      disabled={busy}
                      onClick={() => setConfirming(true)}
                    >
                      Revisar e registrar
                    </button>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirming && selected !== null && inspection !== null}
        title={`Registrar versão ${nextVersion}?`}
        description="A decisão é imutável e fica na trilha de auditoria. Ela não reabre a prévia, não libera compra e não gera cobrança."
        details={
          selected && inspection
            ? [
                { label: "Tentativa", value: shortId(selected.attempt_id) },
                { label: "Decisão", value: decisionLabel(decision) },
                {
                  label: "Listagem",
                  value: shortSha(inspection.listing_sha256),
                },
              ]
            : []
        }
        reason={{
          label: "Justificativa (sem dados pessoais do pedido)",
          min: 20,
          max: 2000,
        }}
        confirmLabel="Registrar revisão"
        busy={busy}
        onConfirm={(reason) => void confirm(reason)}
        onCancel={() => !busy && setConfirming(false)}
      />
    </section>
  );
}
