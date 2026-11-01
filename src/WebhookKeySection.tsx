import type { WebhookEndpoint, WebhookTestResult } from "./api";
import { relativeTime } from "./integration-insights-model";
import type { keyStage } from "./webhook-settings-model";

export function WebhookKeySection({
  endpoint,
  stage,
  keyTest,
  busy,
  onPrepare,
  onTest,
  onActivate,
}: {
  endpoint: WebhookEndpoint;
  stage: ReturnType<typeof keyStage>;
  keyTest: WebhookTestResult | null;
  busy: boolean;
  onPrepare: () => void;
  onTest: () => void;
  onActivate: () => void;
}) {
  return (
    <div className="wh-block">
      <h5>
        Chave de assinatura{" "}
        <span className="badge badge-neutral">
          versão {endpoint.key_version ?? 1}
        </span>
      </h5>
      {stage === "none" && (
        <>
          <p className="form-hint">
            Gire a chave sem derrubar o receptor: prepare a nova, cadastre-a no
            servidor, teste e só então ative. Os eventos reais continuam
            assinados pela chave atual até a ativação.
          </p>
          <div>
            <button
              type="button"
              className="btn btn-secondary btn-md"
              disabled={busy}
              onClick={() => onPrepare()}
            >
              Preparar nova chave
            </button>
          </div>
        </>
      )}
      {stage !== "none" && (
        <>
          <p className="form-hint">
            Nova chave (versão {endpoint.pending_key_version}) preparada
            {endpoint.pending_key_prepared_at
              ? ` ${relativeTime(endpoint.pending_key_prepared_at)}`
              : ""}
            . O teste usa só a chave nova e envia o cabeçalho
            X-Aferis-Key-Version.
          </p>
          {keyTest && (
            <div
              className={`alert ${keyTest.status === "delivered" ? "alert-success" : "alert-warning"}`}
              role="status"
            >
              {keyTest.status === "delivered"
                ? "O destino aceitou o teste com a chave nova."
                : "O teste não foi confirmado. Confira o receptor e tente de novo."}
            </div>
          )}
          <div className="wh-actions">
            <button
              type="button"
              className="btn btn-secondary btn-md"
              disabled={busy}
              onClick={() => onTest()}
            >
              {busy ? "Enviando…" : "Testar nova chave"}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-md"
              disabled={busy || stage !== "tested"}
              onClick={() => onActivate()}
            >
              Ativar nova chave
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-md"
              disabled={busy}
              onClick={() => onPrepare()}
            >
              Gerar outra
            </button>
          </div>
          {stage === "prepared" && (
            <small className="form-hint">
              A ativação libera depois de um teste confirmado.
            </small>
          )}
        </>
      )}
    </div>
  );
}
