import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  createOnrPreviewReview,
  getOnrOrdersInspection,
  listOnrPreviewAttempts,
  type OnrPortalOrdersInspection,
  type OnrPreviewAttentionItem,
  type OnrPreviewReviewHistory,
} from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import { decisionLabel } from "./display-labels";
import { OnrPreviewDetail } from "./OnrPreviewDetail";
import { OnrPreviewQueue } from "./OnrPreviewQueue";
import { problem } from "./onr-preview-format";
import { loadHistory } from "./onr-preview-history";
import {
  latestReviewId,
  shortId,
  shortSha,
  type ReviewDecision,
} from "./onr-review-model";
import type { ToastKind } from "./useToast";
import "./onr-review.css";

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
        <OnrPreviewQueue
          items={items}
          selectedId={selected?.attempt_id ?? null}
          cursor={cursor}
          loading={loading}
          listError={listError}
          onRetry={() => void loadList()}
          onOpen={open}
          onMore={(next) => void loadList(next)}
        />

        <OnrPreviewDetail
          selected={selected}
          inspection={inspection}
          history={history}
          inspectError={inspectError}
          decision={decision}
          busy={busy}
          saveError={saveError}
          onBack={back}
          onInspect={(item) => void inspect(item)}
          onToast={onToast}
          onDecision={setDecision}
          onReview={() => setConfirming(true)}
        />
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
