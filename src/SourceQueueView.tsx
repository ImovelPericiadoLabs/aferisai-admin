import { useMemo, type FormEvent } from "react";
import type { PendingSourcePage } from "./api";
import { FieldAction } from "./FieldAction";
import { OpsKpis } from "./OpsParts";
import { OpsTable, type OpsColumn } from "./OpsTable";
import { dateTime } from "./source-classification-labels";
import { expiryLabel, expiryTone, sourceKpis } from "./source-queue-model";

export function SourceQueueView({
  busy,
  error,
  queue,
  nextCursor,
  queueLoading,
  queueError,
  now,
  requestId,
  onRequestId,
  onLoadPending,
  onLoadById,
  onLookup,
}: {
  busy: boolean;
  error: string;
  queue: PendingSourcePage["items"];
  nextCursor: string | null;
  queueLoading: boolean;
  queueError: string;
  now: number;
  requestId: string;
  onRequestId: (value: string) => void;
  onLoadPending: (cursor?: string) => void;
  onLoadById: (id: string) => void;
  onLookup: (event: FormEvent<HTMLFormElement>) => void;
}) {
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
  return (
    <section className="page ops" aria-labelledby="src-title" aria-busy={busy}>
      <header className="ops-head">
        <div>
          <p className="ops-eyebrow">Análise de arquivo · antes da cobrança</p>
          <h1 className="page-title" id="src-title">
            Fila de fontes
          </h1>
          <p className="page-subtitle">
            Confira se o arquivo enviado é um documento registral. A declaração
            visual não comprova autenticidade nem cria cotação. Os que expiram
            primeiro vêm no topo.
          </p>
        </div>
        <div className="ops-head-actions">
          <button
            type="button"
            className="btn btn-secondary btn-md"
            disabled={queueLoading}
            onClick={() => onLoadPending()}
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
            onClick={() => onLoadPending()}
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
              onClick={() => onLoadById(item.request_id)}
            >
              Conferir
            </button>
          )}
          onOpen={(item) => onLoadById(item.request_id)}
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
            onClick={() => onLoadPending(nextCursor)}
          >
            {queueLoading ? "Carregando…" : "Carregar mais"}
          </button>
        )}
      </div>

      <details className="ops-lookup">
        <summary>Abrir por ID (para casos fora da fila)</summary>
        <form onSubmit={onLookup}>
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
              onChange={(event) => onRequestId(event.target.value)}
              placeholder="UUIDv7 da solicitação"
            />
          </FieldAction>
        </form>
      </details>
    </section>
  );
}
