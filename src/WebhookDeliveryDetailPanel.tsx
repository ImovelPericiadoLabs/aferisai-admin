import type { RefObject } from "react";
import { createPortal } from "react-dom";
import { CodeBlock } from "./CodeBlock";
import { deliveryLabel, deliveryTone, eventLabel } from "./delivery-labels";
import { canResend } from "./webhook-settings-model";
import { dateLabel } from "./webhook-deliveries-model";
import type { WebhookDelivery } from "./api";

export function WebhookDeliveryDetailPanel({
  open,
  panelRef,
  selected,
  loading,
  error,
  notice,
  busy,
  resendAllowed,
  csrfToken,
  onClose,
  onResend,
}: {
  open: boolean;
  panelRef: RefObject<HTMLElement | null>;
  selected: WebhookDelivery | null;
  loading: boolean;
  error: string;
  notice: string;
  busy: boolean;
  resendAllowed: boolean;
  csrfToken?: string;
  onClose: () => void;
  onResend: () => void;
}) {
  return createPortal(
    <>
      {open && <div className="detail-panel-overlay" onClick={onClose} />}
      <aside
        ref={panelRef}
        className={`detail-panel${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-detail-title"
        aria-hidden={!open}
      >
        {open && (
          <>
            <div className="detail-panel-header">
              <div>
                <h2 className="rules-panel-title" id="delivery-detail-title">
                  {selected
                    ? eventLabel(selected.event_type)
                    : "Detalhe da entrega"}
                </h2>
                {selected && (
                  <div className="rules-panel-badges">
                    <span className={`badge ${deliveryTone(selected.status)}`}>
                      {deliveryLabel(selected.status)}
                    </span>
                  </div>
                )}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                aria-label="Fechar detalhe"
                onClick={onClose}
              >
                ✕
              </button>
            </div>
            <div className="detail-panel-body">
              {loading ? (
                <div
                  className="rules-skeleton"
                  role="status"
                  aria-label="Carregando detalhe"
                >
                  <span className="skeleton" />
                  <span className="skeleton" />
                </div>
              ) : error ? (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              ) : (
                selected && (
                  <>
                    <section className="detail-panel-section">
                      <h3 className="detail-panel-section-title">Resultado</h3>
                      <dl className="detail-panel-field">
                        <dt>Destino</dt>
                        <dd>{selected.endpoint_url}</dd>
                        <dt>Resposta</dt>
                        <dd>
                          {selected.http_status
                            ? `HTTP ${selected.http_status}`
                            : "Sem resposta confirmada"}
                        </dd>
                        <dt>Duração</dt>
                        <dd>
                          {selected.duration_ms == null
                            ? "Não medida"
                            : `${selected.duration_ms} ms`}
                        </dd>
                        <dt>Horário</dt>
                        <dd>
                          {dateLabel(
                            selected.attempted_at || selected.created_at,
                          )}
                        </dd>
                        <dt>Tipo</dt>
                        <dd>
                          {selected.is_test ? "Teste assinado" : "Evento real"}
                        </dd>
                        <dt>Identificador</dt>
                        <dd>
                          <code>{selected.id}</code>
                        </dd>
                      </dl>
                    </section>
                    {selected.is_test && selected.test_payload && (
                      <section className="detail-panel-section">
                        <h3 className="detail-panel-section-title">
                          Corpo fictício enviado
                          {selected.simulated_event_type
                            ? ` (${eventLabel(selected.simulated_event_type)})`
                            : ""}
                        </h3>
                        <CodeBlock
                          language="json"
                          label="Corpo fictício"
                          code={JSON.stringify(selected.test_payload, null, 2)}
                          maxHeight={280}
                        />
                      </section>
                    )}
                    {notice && (
                      <div className="alert alert-success" role="status">
                        {notice}
                      </div>
                    )}
                    {resendAllowed && csrfToken && canResend(selected) && (
                      <section className="detail-panel-section">
                        <h3 className="detail-panel-section-title">
                          Reenviar evento
                        </h3>
                        <p className="form-hint">
                          Máximo de três decisões por evento. Um resultado
                          incerto pode ter chegado ao receptor: deduplique pelo
                          identificador do evento.
                        </p>
                        <button
                          type="button"
                          className="btn btn-secondary btn-md"
                          disabled={busy}
                          onClick={() => onResend()}
                        >
                          Reenviar evento
                        </button>
                      </section>
                    )}
                    <p className="form-hint">
                      O detalhe técnico não expõe a chave de assinatura nem
                      dados pessoais do evento.
                    </p>
                  </>
                )
              )}
            </div>
          </>
        )}
      </aside>
    </>,
    document.body,
  );
}
