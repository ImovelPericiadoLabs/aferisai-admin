import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  listUncertainSubmissions,
  readSupplierEvidence,
  reconcileNoPurchase,
  reconcileProtocol,
  type SupplierEvidence,
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
import { SupplierResponseTree } from "./SupplierResponseTree";
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
  isAdmin,
  onUnauthorized,
  onToast,
}: {
  csrf: string;
  isAdmin: boolean;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
}) {
  const [items, setItems] = useState<UncertainRow[]>([]);
  const [scope, setScope] = useState<"active" | "refunded">("active");
  const [batchMode, setBatchMode] = useState(false);
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [batchConfirming, setBatchConfirming] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchResults, setBatchResults] = useState<string[]>([]);
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
  const [evidence, setEvidence] = useState<SupplierEvidence | null>(null);
  const [evidenceReason, setEvidenceReason] = useState(
    "Conferência de compra incerta",
  );
  const [evidenceError, setEvidenceError] = useState("");
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  const selectedId = useRef<string | null>(null);
  const now = useNow();

  const load = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      try {
        const page = await listUncertainSubmissions(cursor, scope);
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
    [onUnauthorized, scope],
  );

  function changeScope(next: "active" | "refunded") {
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

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [load]);

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
    const completed: string[] = [];
    const failures: string[] = [];
    for (const row of batchRows) {
      try {
        await reconcileNoPurchase(row.item_id, reason, csrf);
        completed.push(row.item_id);
      } catch (cause) {
        failures.push(
          `${shortId(row.item_id)}: ${cause instanceof ApiError ? cause.detail : "falha de conexão"}`,
        );
        if (cause instanceof ApiError && cause.status === 401) {
          onUnauthorized();
          break;
        }
      }
    }
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
        label: "Situação",
        align: "end",
        render: (item) =>
          item.reconciliation_status === "refunded_record" ? (
            <span className="badge badge-neutral">Cliente reembolsado</span>
          ) : (
            <AgeBadge
              iso={item.attempted_at}
              now={now}
              warnAfterHours={6}
              dangerAfterHours={24}
            />
          ),
        text: (item) =>
          item.reconciliation_status === "refunded_record"
            ? "Cliente reembolsado"
            : item.attempted_at,
      },
    ],
    [now],
  );

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
      <header className="ops-head">
        <div>
          <p className="ops-eyebrow">Operação</p>
          <h1 className="page-title" id="rec-title">
            Conciliação
          </h1>
          <p className="page-subtitle">
            {scope === "active"
              ? "Envios ao fornecedor cujo resultado não pôde ser confirmado. Cada item pede decisão auditada antes de qualquer nova tentativa."
              : "Pedidos reembolsados ficam aqui como registro técnico. O cliente não tem pagamento ou compra pendente; eventual custo do fornecedor é apurado separadamente."}
          </p>
        </div>
        <div className="ops-head-actions">
          {isAdmin && scope === "active" && (
            <button
              type="button"
              className="btn btn-secondary btn-md"
              aria-pressed={batchMode}
              onClick={() => {
                setBatchMode((current) => !current);
                setBatchIds([]);
                setBatchResults([]);
              }}
            >
              {batchMode ? "Fechar lote" : "Conciliar em lote"}
            </button>
          )}
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

      <div className="rules-toolbar">
        <div
          className="rules-tabs"
          role="group"
          aria-label="Situação da conciliação"
        >
          <button
            type="button"
            className="rules-tab"
            aria-pressed={scope === "active"}
            onClick={() => changeScope("active")}
          >
            Em atendimento
          </button>
          <button
            type="button"
            className="rules-tab"
            aria-pressed={scope === "refunded"}
            onClick={() => changeScope("refunded")}
          >
            Reembolsados
          </button>
        </div>
      </div>

      {batchMode && isAdmin && scope === "active" && (
        <section className="rec-batch" aria-label="Conciliação em lote">
          <h2>Selecionar envios sem compra</h2>
          <p>
            Marque somente os envios que você conferiu individualmente no portal
            do fornecedor. Cada decisão é auditada e pode liberar uma nova
            tentativa automática para o pedido ativo.
          </p>
          <div className="rec-batch-list">
            {sorted
              .filter((row) => row.reconciliation_status === "action_required")
              .map((row) => (
                <label key={row.item_id} className="rec-batch-row">
                  <input
                    type="checkbox"
                    checked={batchIds.includes(row.item_id)}
                    disabled={batchBusy}
                    onChange={() => toggleBatch(row.item_id)}
                  />
                  <span>
                    <strong>{shortId(row.operation_id)}</strong> · item{" "}
                    {shortId(row.item_id)} · {row.provider}
                  </span>
                </label>
              ))}
          </div>
          <button
            type="button"
            className="btn btn-primary btn-md"
            disabled={batchRows.length === 0 || batchBusy}
            onClick={() => setBatchConfirming(true)}
          >
            Revisar {batchRows.length} selecionado(s)
          </button>
          {batchResults.length > 0 && (
            <div className="alert alert-danger" role="alert">
              <strong>Alguns envios permaneceram na fila:</strong>
              <ul>
                {batchResults.map((result) => (
                  <li key={result}>{result}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <OpsKpis
        items={reconciliationKpis(items, now, scope)}
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
          <strong>
            {scope === "active"
              ? "Nenhum envio incerto em atendimento"
              : "Nenhum registro de pedido reembolsado"}
          </strong>
          <span>
            {scope === "active"
              ? "Quando um envio ficar sem resposta clara, ele aparece aqui para decisão."
              : "Tentativas incertas de pedidos reembolsados aparecem aqui apenas para consulta."}
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
              className={`btn ${item.reconciliation_status === "refunded_record" ? "btn-secondary" : "btn-primary"} btn-sm`}
              onClick={(event) => open(item, event.currentTarget)}
            >
              {item.reconciliation_status === "refunded_record"
                ? "Consultar"
                : "Decidir"}
            </button>
          )}
          onOpen={open}
          card={(item) => (
            <>
              <span className="ops-card-top">
                <strong>{shortId(item.operation_id)}</strong>
                {item.reconciliation_status === "action_required" && (
                  <AgeBadge
                    iso={item.attempted_at}
                    now={now}
                    warnAfterHours={6}
                    dangerAfterHours={24}
                  />
                )}
              </span>
              <span className="ops-card-badges">
                <span className="badge badge-neutral">{item.provider}</span>
                {item.customer_refunded && (
                  <span className="badge badge-neutral">
                    Encerrado para o cliente
                  </span>
                )}
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
          {scope === "refunded"
            ? sorted.length === 1
              ? "registro"
              : "registros"
            : sorted.length === 1
              ? "envio carregado"
              : "envios carregados"}
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
            <span
              className={`badge ${selected.customer_refunded ? "badge-neutral" : "badge-warning"}`}
            >
              {selected.customer_refunded
                ? "Reembolsado · registro técnico"
                : "Resultado incerto"}
            </span>
          )
        }
        onClose={() => {
          if (busy) return;
          selectedId.current = null;
          setSelected(null);
        }}
        returnFocus={() => trigger.current}
      >
        {selected && (
          <>
            <section className="detail-panel-section">
              <h3 className="detail-panel-section-title">O que aconteceu</h3>
              <p className="ops-lead">
                O envio ao fornecedor foi tentado, mas a resposta não permitiu
                concluir se a compra ocorreu. Nada é reenviado automaticamente:
                {selected.customer_refunded
                  ? " o cliente já foi reembolsado. Este registro não admite decisão de compra nem nova cobrança. Uma eventual despesa do fornecedor é tratada separadamente."
                  : " a decisão abaixo é a única forma de liberar o item."}
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
            {isAdmin && (
              <section className="detail-panel-section">
                <h3 className="detail-panel-section-title">
                  Resposta do fornecedor
                </h3>
                <p className="ops-lead">
                  A leitura é restrita ao administrador e fica auditada. A
                  consulta da lista de pedidos não reenvia a compra.
                </p>
                <div className="form-field ops-field">
                  <label
                    className="form-field-label"
                    htmlFor="rec-evidence-reason"
                  >
                    Motivo do acesso
                  </label>
                  <input
                    id="rec-evidence-reason"
                    className="input"
                    value={evidenceReason}
                    maxLength={500}
                    onChange={(event) => setEvidenceReason(event.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-md"
                  disabled={
                    evidenceLoading || evidenceReason.trim().length < 10
                  }
                  onClick={() => void loadEvidence()}
                >
                  {evidenceLoading ? "Consultando…" : "Ver resposta e pedidos"}
                </button>
                {evidenceError && (
                  <p className="alert alert-danger" role="alert">
                    {evidenceError}
                  </p>
                )}
                {evidence && (
                  <div className="ops-evidence-stack">
                    <h4>Resposta da tentativa</h4>
                    {evidence.response.captured &&
                    evidence.response.response_text !== null ? (
                      <>
                        <p className="ops-hint">
                          HTTP {evidence.response.http_status ?? "—"} ·{" "}
                          {evidence.response.content_type ??
                            "tipo desconhecido"}{" "}
                          · SHA-256 {evidence.response.response_sha256 ?? "—"}
                        </p>
                        <SupplierResponseTree
                          text={evidence.response.response_text}
                        />
                      </>
                    ) : (
                      <p className="ops-hint">
                        A versão que executou esta tentativa não guardou o corpo
                        da resposta. Não é possível reconstruí-lo agora.
                      </p>
                    )}
                    <h4>Lista atual da InfoSimples</h4>
                    {evidence.order_list.status === "checked" ? (
                      <>
                        <p className="ops-hint">
                          Consultada em{" "}
                          {evidence.order_list.checked_at
                            ? dateTime.format(
                                new Date(evidence.order_list.checked_at),
                              )
                            : "agora"}
                          . {evidence.order_list.listed_count} pedidos na
                          primeira página; mais recente em{" "}
                          {evidence.order_list.newest_date ??
                            "data indisponível"}
                          .
                        </p>
                        {evidence.order_list.matching_orders.length ? (
                          <table className="ops-evidence-table">
                            <thead>
                              <tr>
                                <th>Protocolo</th>
                                <th>Data</th>
                              </tr>
                            </thead>
                            <tbody>
                              {evidence.order_list.matching_orders.map(
                                (order) => (
                                  <tr key={order.protocol}>
                                    <td>{order.protocol}</td>
                                    <td>{order.date}</td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        ) : (
                          <p className="ops-hint">
                            Nenhum pedido correspondente apareceu nesta página.
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="ops-hint">
                        Lista:{" "}
                        {evidence.order_list.status === "account_changed"
                          ? "a conta ativa mudou"
                          : evidence.order_list.status === "unavailable"
                            ? "fornecedor indisponível"
                            : "não se aplica"}
                        .
                      </p>
                    )}
                    <p className="ops-hint">{evidence.order_list.limit_note}</p>
                  </div>
                )}
              </section>
            )}
            {selected.reconciliation_status === "action_required" && (
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
            )}
          </>
        )}
      </RecordDrawer>

      <ConfirmDialog
        open={
          confirming && selected?.reconciliation_status === "action_required"
        }
        tone={decision === "no_purchase" ? "danger" : "primary"}
        title={
          decision === "no_purchase"
            ? "Registrar que não houve compra?"
            : "Confirmar o protocolo?"
        }
        description={
          decision === "no_purchase"
            ? "A decisão é auditada e pode liberar nova tentativa automática de aquisição para este pedido ativo. Confirme no portal que não houve compra."
            : "A decisão é auditada e vincula o protocolo confirmado a este pedido ativo."
        }
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

      <ConfirmDialog
        open={batchConfirming && batchRows.length > 0}
        tone="danger"
        title={`Registrar sem compra em ${batchRows.length} envios?`}
        description="Confirme que verificou cada envio selecionado no portal. Cada item será revalidado e auditado separadamente; os pedidos ainda ativos podem voltar à fila de aquisição. Falhas ficam visíveis para correção."
        details={batchRows.map((row) => ({
          label: shortId(row.item_id),
          value: `${shortId(row.operation_id)} · ${row.provider}`,
        }))}
        reason={{
          label: "Justificativa da conferência (sem dados pessoais)",
          min: 20,
          max: 2000,
        }}
        confirmLabel="Registrar lote"
        busy={batchBusy}
        onConfirm={(reason) => void confirmBatch(reason)}
        onCancel={() => !batchBusy && setBatchConfirming(false)}
      />
    </section>
  );
}
