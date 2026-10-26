import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  listAnalysisNoticeExceptions,
  reconcileAnalysisNotice,
  type AnalysisNoticeException,
} from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import { receiptReference } from "./notice-receipt";
import { OpsTable, type OpsColumn } from "./OpsTable";
import "./ops.css";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function AnalysisNotices({
  csrf,
  onUnauthorized,
}: {
  csrf: string;
  onUnauthorized: () => void;
}) {
  const [items, setItems] = useState<AnalysisNoticeException[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [selected, setSelected] = useState<AnalysisNoticeException | null>(
    null,
  );
  const [messageId, setMessageId] = useState("");
  const [recipientChecked, setRecipientChecked] = useState(false);
  const [requestChecked, setRequestChecked] = useState(false);
  const [attachmentChecked, setAttachmentChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(
    async (next?: string) => {
      setLoading(true);
      try {
        const page = await listAnalysisNoticeExceptions(next);
        setItems((current) =>
          next ? [...current, ...page.items] : page.items,
        );
        setCursor(page.next_cursor);
        setListError("");
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else
          setListError(
            cause instanceof ApiError
              ? cause.detail
              : "Não foi possível carregar os avisos.",
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

  const columns: OpsColumn<AnalysisNoticeException>[] = [
    {
      id: "request",
      label: "Pedido",
      locked: true,
      render: (item) => (
        <span className="ops-id">
          <strong>{item.request_id.slice(-8)}</strong>
          <small>
            {item.kind === "analysis_ready"
              ? "Análise pronta"
              : "Pagamento confirmado"}
          </small>
        </span>
      ),
      text: (item) => item.request_id,
    },
    {
      id: "status",
      label: "Tentativa",
      render: (item) => (
        <span className="badge badge-warning">
          {item.status === "unknown" ? "Resultado incerto" : "Envio iniciado"}
        </span>
      ),
      text: (item) => item.status,
    },
    {
      id: "provider",
      label: "ID no provedor",
      hideBelow: "tablet",
      render: (item) => (
        <code>{item.provider_message_id ?? "Não registrado"}</code>
      ),
      text: (item) => item.provider_message_id ?? "",
    },
    {
      id: "time",
      label: "Tentativa em",
      render: (item) =>
        dateTime.format(new Date(item.attempted_at ?? item.created_at)),
      text: (item) => item.attempted_at ?? item.created_at,
    },
  ];

  function open(item: AnalysisNoticeException) {
    if (item.channel !== "email") return;
    setSelected(item);
    setMessageId("");
    setRecipientChecked(false);
    setRequestChecked(false);
    setAttachmentChecked(false);
    setSaveError("");
    setSuccess("");
  }

  async function confirm(reason: string) {
    if (!selected || busy) return;
    setBusy(true);
    setSaveError("");
    try {
      const evidenceRef = await receiptReference(messageId);
      await reconcileAnalysisNotice(
        selected.notice_id,
        evidenceRef,
        reason,
        csrf,
      );
      setItems((current) =>
        current.filter((item) => item.notice_id !== selected.notice_id),
      );
      setSuccess(
        `Recebimento do pedido ${selected.request_id.slice(-8)} registrado, sem reenvio.`,
      );
      setSelected(null);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setSaveError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível registrar a prova.",
        );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Avisos de análise com envio incerto">
      <p className="page-subtitle">
        Confira a mensagem recebida fora do sistema antes de registrar a prova.
        A tentativa original continua no histórico e não será reenviada.
      </p>
      {success && (
        <p className="alert alert-success" role="status">
          {success}
        </p>
      )}
      {listError && (
        <div className="error-state" role="alert">
          <strong>Não foi possível carregar os avisos</strong>
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
        <p role="status">Carregando avisos…</p>
      ) : !listError && items.length === 0 ? (
        <div className="empty-state" role="status">
          <strong>Nenhum aviso exige conciliação</strong>
          <span>Tentativas futuras com resultado incerto aparecerão aqui.</span>
        </div>
      ) : (
        <OpsTable
          label="Avisos de análise para conciliar"
          columns={columns}
          rows={items}
          rowKey={(item) => item.notice_id}
          hidden={[]}
          density="comfortable"
          selectedKey={selected?.notice_id ?? null}
          onOpen={open}
          actions={(item) => (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={item.channel !== "email"}
              onClick={() => open(item)}
            >
              Conferir recebimento
            </button>
          )}
          card={(item) => (
            <>
              <strong>Pedido {item.request_id.slice(-8)}</strong>
              <span>
                {item.status === "unknown"
                  ? "Resultado incerto"
                  : "Envio iniciado"}{" "}
                · {item.channel === "email" ? "E-mail" : "WhatsApp"}
              </span>
            </>
          )}
        />
      )}
      <div className="ops-foot">
        <span>{items.length} avisos carregados</span>
        <span className="ops-actions">
          <button
            type="button"
            className="btn btn-secondary btn-md"
            disabled={loading}
            onClick={() => void load()}
          >
            Atualizar
          </button>
          {cursor && (
            <button
              type="button"
              className="btn btn-secondary btn-md"
              disabled={loading}
              onClick={() => void load(cursor)}
            >
              Carregar mais
            </button>
          )}
        </span>
      </div>
      <ConfirmDialog
        open={selected !== null}
        title="Registrar recebimento do e-mail"
        description="Esta decisão imutável remove a tentativa da fila de exceções. Confira o destinatário, o pedido e o PDF na caixa recebida antes de confirmar."
        details={
          selected
            ? [
                { label: "Pedido", value: selected.request_id },
                { label: "Tentativa", value: selected.notice_id },
                {
                  label: "ID no provedor",
                  value: selected.provider_message_id ?? "Não registrado",
                },
              ]
            : []
        }
        reason={{
          label: "Como você confirmou o recebimento?",
          min: 10,
          max: 500,
        }}
        confirmLabel="Registrar prova"
        busy={busy}
        confirmDisabled={
          !messageId.trim() ||
          !recipientChecked ||
          !requestChecked ||
          !attachmentChecked ||
          selected?.channel !== "email"
        }
        onConfirm={(reason) => void confirm(reason)}
        onCancel={() => setSelected(null)}
      >
        <div className="confirm-reason">
          <label className="form-field-label" htmlFor="notice-message-id">
            Message-ID na caixa recebida
          </label>
          <input
            id="notice-message-id"
            className="input"
            value={messageId}
            onChange={(event) => setMessageId(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            placeholder="<identificador@domínio>"
          />
          <span className="form-hint">
            O identificador é convertido em SHA-256 antes de ser enviado ao
            backend.
          </span>
        </div>
        <div className="confirm-reason">
          <label>
            <input
              type="checkbox"
              checked={recipientChecked}
              onChange={(event) => setRecipientChecked(event.target.checked)}
              disabled={busy}
            />{" "}
            Conferi o destinatário recebido
          </label>
          <label>
            <input
              type="checkbox"
              checked={requestChecked}
              onChange={(event) => setRequestChecked(event.target.checked)}
              disabled={busy}
            />{" "}
            Conferi o ID deste pedido no e-mail
          </label>
          <label>
            <input
              type="checkbox"
              checked={attachmentChecked}
              onChange={(event) => setAttachmentChecked(event.target.checked)}
              disabled={busy}
            />{" "}
            Conferi o PDF completo anexado
          </label>
        </div>
        {saveError && (
          <p className="error" role="alert">
            {saveError}
          </p>
        )}
      </ConfirmDialog>
    </section>
  );
}
