import { useMemo, useRef, useState } from "react";
import {
  ApiError,
  readSupplierEvidence,
  reconcileNoPurchase,
  reconcileProtocol,
  type SupplierEvidence,
} from "./api";
import {
  decisionError,
  reconciliationKpis,
  type Decision,
  type UncertainRow,
} from "./reconciliation-model";
import { OpsKpis, RecordDrawer } from "./OpsParts";
import { ReconciliationBatchPanel } from "./ReconciliationBatchPanel";
import { ReconciliationDecision } from "./ReconciliationDecision";
import { ReconciliationDialogs } from "./ReconciliationDialogs";
import { ReconciliationEvidencePanel } from "./ReconciliationEvidencePanel";
import {
  ReconciliationFacts,
  ReconciliationStatusBadge,
} from "./ReconciliationFacts";
import { ReconciliationHeader } from "./ReconciliationHeader";
import { reconcileNoPurchaseBatch } from "./reconciliation-batch";
import { useReconciliationQueue } from "./useReconciliationQueue";
import { ReconciliationList } from "./ReconciliationList";
import {
  dateTime,
  shortId,
  type ReconciliationScope,
} from "./reconciliation-format";
import type { ToastKind } from "./useToast";
import { useNow } from "./useNow";
import "./ops.css";

export function RegistryReconciliation({
  csrf,
  isAdmin,
  onUnauthorized,
  onToast,
}: {
  csrf: string;
  isAdmin: boolean;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
}) {
  const [scope, setScope] = useState<ReconciliationScope>("active");
  const [batchMode, setBatchMode] = useState(false);
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [batchConfirming, setBatchConfirming] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchResults, setBatchResults] = useState<string[]>([]);
  const [selected, setSelected] = useState<UncertainRow | null>(null);
  const [decision, setDecision] = useState<Decision>("no_purchase");
  const [protocol, setProtocol] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [evidence, setEvidence] = useState<SupplierEvidence | null>(null);
  const [evidenceReason, setEvidenceReason] = useState(
    "Conferência de compra incerta",
  );
  const [evidenceError, setEvidenceError] = useState("");
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  const selectedId = useRef<string | null>(null);
  const now = useNow();

  const {
    items,
    setItems,
    nextCursor,
    setNextCursor,
    loading,
    setLoading,
    listError,
    load,
  } = useReconciliationQueue(scope, onUnauthorized);

  function changeScope(next: ReconciliationScope) {
    if (next === scope) return;
    setItems([]);
    setNextCursor(null);
    setLoading(true);
    setSelected(null);
    setBatchMode(false);
    setBatchIds([]);
    setBatchResults([]);
    setScope(next);
  }

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => a.attempted_at.localeCompare(b.attempted_at)),
    [items],
  );
  const batchRows = sorted.filter(
    (row) =>
      batchIds.includes(row.item_id) &&
      row.reconciliation_status === "action_required",
  );

  function toggleBatch(itemId: string) {
    if (batchIds.includes(itemId)) {
      setBatchIds(batchIds.filter((id) => id !== itemId));
    } else if (batchIds.length >= 20) {
      onToast("Selecione no máximo 20 envios por lote.", "error");
    } else {
      setBatchIds([...batchIds, itemId]);
    }
  }

  async function confirmBatch(reason: string) {
    if (!isAdmin || scope !== "active" || batchRows.length === 0) return;
    setBatchBusy(true);
    const { completed, failures } = await reconcileNoPurchaseBatch(
      batchRows,
      reason,
      csrf,
      onUnauthorized,
    );
    setItems((current) =>
      current.filter((row) => !completed.includes(row.item_id)),
    );
    setBatchIds(
      failures.length
        ? batchRows
            .filter((row) => !completed.includes(row.item_id))
            .map((row) => row.item_id)
        : [],
    );
    setBatchResults(failures);
    setBatchConfirming(false);
    setBatchBusy(false);
    if (completed.length)
      onToast(
        `${completed.length} envio(s) conciliado(s) individualmente.`,
        "success",
      );
    if (!failures.length) setBatchMode(false);
  }

  function open(item: UncertainRow, element: HTMLElement) {
    selectedId.current = item.item_id;
    trigger.current = element;
    setSelected(item);
    setDecision("no_purchase");
    setProtocol("");
    setSubmitted(false);
    setSaveError("");
    setEvidence(null);
    setEvidenceError("");
  }

  async function loadEvidence() {
    if (!selected || evidenceLoading || evidenceReason.trim().length < 10)
      return;
    const itemId = selected.item_id;
    setEvidenceLoading(true);
    setEvidenceError("");
    try {
      const result = await readSupplierEvidence(
        itemId,
        evidenceReason.trim(),
        csrf,
      );
      if (selectedId.current === itemId) setEvidence(result);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else if (selectedId.current === itemId)
        setEvidenceError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível consultar a evidência.",
        );
    } finally {
      setEvidenceLoading(false);
    }
  }

  const error = decisionError(decision, protocol);

  function review() {
    if (selected?.reconciliation_status !== "action_required") return;
    setSubmitted(true);
    if (error) return;
    setConfirming(true);
  }

  async function confirm(reason: string) {
    if (!selected || selected.reconciliation_status !== "action_required")
      return;
    setBusy(true);
    setSaveError("");
    try {
      if (decision === "no_purchase")
        await reconcileNoPurchase(selected.item_id, reason, csrf);
      else
        await reconcileProtocol(
          selected.item_id,
          protocol.trim(),
          reason,
          csrf,
        );
      setItems((current) =>
        current.filter((row) => row.item_id !== selected.item_id),
      );
      setConfirming(false);
      setSelected(null);
      onToast("Decisão registrada. O item saiu da fila.", "success");
    } catch (cause) {
      setConfirming(false);
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setSaveError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível registrar a decisão.",
        );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page ops" aria-labelledby="rec-title">
      <ReconciliationHeader
        scope={scope}
        isAdmin={isAdmin}
        batchMode={batchMode}
        loading={loading}
        onToggleBatch={() => {
          setBatchMode((current) => !current);
          setBatchIds([]);
          setBatchResults([]);
        }}
        onRefresh={() => void load()}
        onChangeScope={changeScope}
      />

      {batchMode && isAdmin && scope === "active" && (
        <ReconciliationBatchPanel
          rows={sorted.filter(
            (row) => row.reconciliation_status === "action_required",
          )}
          batchIds={batchIds}
          batchBusy={batchBusy}
          selectedCount={batchRows.length}
          batchResults={batchResults}
          onToggle={toggleBatch}
          onReview={() => setBatchConfirming(true)}
        />
      )}

      <OpsKpis
        items={reconciliationKpis(items, now, scope)}
        active={null}
        onPick={() => undefined}
      />

      <ReconciliationList
        listError={listError}
        loading={loading}
        itemCount={items.length}
        rows={sorted}
        scope={scope}
        nextCursor={nextCursor}
        selectedKey={selected?.item_id ?? null}
        now={now}
        onLoad={(cursor) => void load(cursor)}
        onOpen={open}
      />

      <RecordDrawer
        open={selected !== null}
        title={selected ? `Operação ${shortId(selected.operation_id)}` : ""}
        subtitle={
          selected
            ? `Tentada em ${dateTime.format(new Date(selected.attempted_at))}`
            : undefined
        }
        badges={selected && <ReconciliationStatusBadge selected={selected} />}
        onClose={() => {
          if (busy) return;
          selectedId.current = null;
          setSelected(null);
        }}
        returnFocus={() => trigger.current}
      >
        {selected && (
          <>
            <ReconciliationFacts selected={selected} />
            {isAdmin && (
              <ReconciliationEvidencePanel
                reason={evidenceReason}
                loading={evidenceLoading}
                error={evidenceError}
                evidence={evidence}
                onReasonChange={setEvidenceReason}
                onLoad={() => void loadEvidence()}
              />
            )}
            {selected.reconciliation_status === "action_required" && (
              <ReconciliationDecision
                decision={decision}
                protocol={protocol}
                submitted={submitted}
                error={error}
                saveError={saveError}
                busy={busy}
                onDecision={(next) => {
                  setDecision(next);
                  setSubmitted(false);
                }}
                onProtocol={setProtocol}
                onReview={review}
              />
            )}
          </>
        )}
      </RecordDrawer>

      <ReconciliationDialogs
        selected={selected}
        decision={decision}
        protocol={protocol}
        confirming={
          confirming && selected?.reconciliation_status === "action_required"
        }
        busy={busy}
        batchRows={batchRows}
        batchConfirming={batchConfirming && batchRows.length > 0}
        batchBusy={batchBusy}
        onConfirm={(reason) => void confirm(reason)}
        onCancel={() => !busy && setConfirming(false)}
        onConfirmBatch={(reason) => void confirmBatch(reason)}
        onCancelBatch={() => !batchBusy && setBatchConfirming(false)}
      />
    </section>
  );
}
