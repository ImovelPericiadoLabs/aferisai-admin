import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  listUncertainSubmissions,
  reconcileNoPurchase,
  reconcileProtocol,
} from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  DECISIONS,
  decisionError,
  reconciliationKpis,
  reconciliationTone,
  type Decision,
  type UncertainRow,
} from "./reconciliation-model";
import { AgeBadge, OpsKpis, RecordDrawer } from "./OpsParts";
import { OpsTable, type OpsColumn } from "./OpsTable";
import { RolePicker } from "./RolePicker";
import type { ToastKind } from "./useToast";
import { useNow } from "./useNow";
import "./ops.css";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const shortId = (id: string) => id.slice(-8);

export function RegistryReconciliation({
  csrf,
  onUnauthorized,
  onToast,
}: {
  csrf: string;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
}) {
  const [items, setItems] = useState<UncertainRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [selected, setSelected] = useState<UncertainRow | null>(null);
  const [decision, setDecision] = useState<Decision>("no_purchase");
  const [protocol, setProtocol] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const trigger = useRef<HTMLElement | null>(null);
  const now = useNow();

  const load = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      try {
        const page = await listUncertainSubmissions(cursor);
        setItems((current) =>
          cursor ? [...current, ...page.items] : page.items,
        );
        setNextCursor(page.next_cursor);
        setListError("");
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else
          setListError(
            cause instanceof ApiError
              ? cause.detail
              : "Não foi possível carregar a fila.",
          );
      } finally {
        setLoading(false);
      }
    },
    [onUnauthorized],
  );

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => a.attempted_at.localeCompare(b.attempted_at)),
    [items],
  );

  const columns: OpsColumn<UncertainRow>[] = useMemo(
    () => [
      {
        id: "operation",
        label: "Operação",
        locked: true,
        render: (item) => (
          <span className="ops-id">
            <strong>{shortId(item.operation_id)}</strong>
            <small>item {shortId(item.item_id)}</small>
          </span>
        ),
        text: (item) => item.operation_id,
      },
      {
        id: "provider",
        label: "Fornecedor",
        render: (item) => (
          <span className="badge badge-neutral">{item.provider}</span>
        ),
        text: (item) => item.provider,
      },
      {
        id: "attempted",
        label: "Tentada em",
        hideBelow: "tablet",
        render: (item) => dateTime.format(new Date(item.attempted_at)),
        text: (item) => item.attempted_at,
      },
      {
        id: "age",
        label: "Parada há",
        align: "end",
        render: (item) => (
          <AgeBadge
            iso={item.attempted_at}
            now={now}
            warnAfterHours={6}
            dangerAfterHours={24}
          />
        ),
        text: (item) => item.attempted_at,
      },
    ],
    [now],
  );

  function open(item: UncertainRow, element: HTMLElement) {
    trigger.current = element;
    setSelected(item);
    setDecision("no_purchase");
    setProtocol("");
    setSubmitted(false);
    setSaveError("");
  }

  const error = decisionError(decision, protocol);

  function review() {
    setSubmitted(true);
    if (error) return;
    setConfirming(true);
  }

  async function confirm(reason: string) {
    if (!selected) return;
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
      <header className="ops-head">
        <div>
          <p className="ops-eyebrow">Operação</p>
          <h1 className="page-title" id="rec-title">
            Conciliação
          </h1>
          <p className="page-subtitle">
            Envios ao fornecedor cujo resultado não pôde ser confirmado. Cada
            item pede uma decisão manual e auditada antes de qualquer nova
            tentativa. Os mais antigos aparecem primeiro.
          </p>
        </div>
        <div className="ops-head-actions">
          <button
            type="button"
            className="btn btn-secondary btn-md"
            disabled={loading}
            onClick={() => void load()}
          >
            Atualizar
          </button>
        </div>
      </header>

      <OpsKpis
        items={reconciliationKpis(items, now)}
        active={null}
        onPick={() => undefined}
      />

      {listError && (
        <div className="error-state" role="alert">
          <strong>Não foi possível carregar a fila</strong>
          <span>{listError}</span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => void load()}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {loading && items.length === 0 && !listError ? (
        <div
          className="rules-skeleton"
          role="status"
          aria-label="Carregando fila"
        >
          <span className="skeleton" />
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      ) : !listError && sorted.length === 0 ? (
        <div className="empty-state" role="status">
          <strong>Nenhum envio incerto no momento</strong>
          <span>
            Quando um envio ficar sem resposta clara, ele aparece aqui para
            decisão.
          </span>
        </div>
      ) : (
        <OpsTable
          label="Envios incertos"
          columns={columns}
          rows={sorted}
          rowKey={(item) => item.item_id}
          hidden={[]}
          density="comfortable"
          selectedKey={selected?.item_id ?? null}
          rowTone={(item) => reconciliationTone(item, now)}
          actions={(item) => (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={(event) => open(item, event.currentTarget)}
            >
              Decidir
            </button>
          )}
          onOpen={open}
          card={(item) => (
            <>
              <span className="ops-card-top">
                <strong>{shortId(item.operation_id)}</strong>
                <AgeBadge
                  iso={item.attempted_at}
                  now={now}
                  warnAfterHours={6}
                  dangerAfterHours={24}
                />
              </span>
              <span className="ops-card-badges">
                <span className="badge badge-neutral">{item.provider}</span>
              </span>
              <span className="ops-card-meta">
                Tentada em {dateTime.format(new Date(item.attempted_at))}
              </span>
            </>
          )}
        />
      )}

      <div className="ops-foot">
        <span>
          {sorted.length}{" "}
          {sorted.length === 1 ? "envio carregado" : "envios carregados"}
          <span className="ops-hint"> · J e K navegam, Enter abre</span>
        </span>
        {nextCursor && (
          <button
            type="button"
            className="btn btn-secondary btn-md"
            disabled={loading}
            onClick={() => void load(nextCursor)}
          >
            {loading ? "Carregando…" : "Carregar mais"}
          </button>
        )}
      </div>

      <RecordDrawer
        open={selected !== null}
        title={selected ? `Operação ${shortId(selected.operation_id)}` : ""}
        subtitle={
          selected
            ? `Tentada em ${dateTime.format(new Date(selected.attempted_at))}`
            : undefined
        }
        badges={
          selected && (
            <span className="badge badge-warning">Resultado incerto</span>
          )
        }
        onClose={() => !busy && setSelected(null)}
        returnFocus={() => trigger.current}
      >
        {selected && (
          <>
            <section className="detail-panel-section">
              <h3 className="detail-panel-section-title">O que aconteceu</h3>
              <p className="ops-lead">
                O envio ao fornecedor foi tentado, mas a resposta não permitiu
                concluir se a compra ocorreu. Nada é reenviado automaticamente:
                a decisão abaixo é a única forma de liberar o item.
              </p>
              <dl className="ops-facts">
                <div>
                  <dt>Operação</dt>
                  <dd>
                    <code>{selected.operation_id}</code>
                  </dd>
                </div>
                <div>
                  <dt>Item</dt>
                  <dd>
                    <code>{selected.item_id}</code>
                  </dd>
                </div>
                <div>
                  <dt>Fornecedor</dt>
                  <dd>{selected.provider}</dd>
                </div>
                <div>
                  <dt>Criado em</dt>
                  <dd>{dateTime.format(new Date(selected.created_at))}</dd>
                </div>
              </dl>
            </section>
            <section className="detail-panel-section">
              <h3 className="detail-panel-section-title">Decisão</h3>
              {saveError && (
                <p className="alert alert-danger" role="alert">
                  {saveError}
                </p>
              )}
              <RolePicker<Decision>
                label="O que você verificou"
                value={decision}
                options={DECISIONS}
                disabled={busy}
                onChange={(next) => {
                  setDecision(next);
                  setSubmitted(false);
                }}
              />
              {decision === "protocol_confirmed" && (
                <div className="form-field ops-field">
                  <label className="form-field-label" htmlFor="rec-protocol">
                    Protocolo confirmado
                  </label>
                  <input
                    id="rec-protocol"
                    className="input"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={160}
                    placeholder="Número do protocolo no portal"
                    value={protocol}
                    disabled={busy}
                    aria-invalid={submitted && error ? true : undefined}
                    onChange={(event) => setProtocol(event.target.value)}
                  />
                  {submitted && error && (
                    <span className="form-hint ops-error" role="alert">
                      {error}
                    </span>
                  )}
                </div>
              )}
              <div className="ops-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-md"
                  aria-haspopup="dialog"
                  disabled={busy}
                  onClick={review}
                >
                  Revisar e registrar
                </button>
              </div>
            </section>
          </>
        )}
      </RecordDrawer>

      <ConfirmDialog
        open={confirming && selected !== null}
        tone={decision === "no_purchase" ? "danger" : "primary"}
        title={
          decision === "no_purchase"
            ? "Registrar que não houve compra?"
            : "Confirmar o protocolo?"
        }
        description="A decisão é auditada e libera o item da fila. Ela não cria cobrança nem reenvia nada."
        details={
          selected
            ? [
                { label: "Operação", value: shortId(selected.operation_id) },
                {
                  label: "Decisão",
                  value:
                    DECISIONS.find((d) => d.value === decision)?.label ?? "",
                },
                ...(decision === "protocol_confirmed"
                  ? [{ label: "Protocolo", value: protocol.trim() }]
                  : []),
              ]
            : []
        }
        reason={{
          label: "Justificativa (sem dados pessoais)",
          min: 20,
          max: 2000,
        }}
        confirmLabel="Registrar decisão"
        busy={busy}
        onConfirm={(reason) => void confirm(reason)}
        onCancel={() => !busy && setConfirming(false)}
      />
    </section>
  );
}
