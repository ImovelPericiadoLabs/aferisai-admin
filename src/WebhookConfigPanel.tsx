import type { ReactNode } from "react";
import type { WebhookEndpoint, WebhookTestResult } from "./api";
import { Checkbox } from "./controls";
import { webhookHost } from "./application-overview-model";

export function WebhookConfigPanel({
  endpoint,
  error,
  busy,
  hasSecret,
  configured,
  test,
  testResult,
  onConfiguredChange,
  onSendTest,
  onActivate,
  onClose,
}: {
  endpoint: WebhookEndpoint;
  error: string;
  busy: boolean;
  hasSecret: boolean;
  configured: boolean;
  test: WebhookTestResult | null;
  testResult: ReactNode;
  onConfiguredChange: (value: boolean) => void;
  onSendTest: () => void;
  onActivate: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="detail-panel-header">
        <div>
          <h2 className="rules-panel-title" id="webhook-drawer-title">
            Passos 2 a 4 · Assinatura, teste e ativação
          </h2>
          <p className="rules-panel-sub">{webhookHost(endpoint.url)}</p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          type="button"
          aria-label="Fechar"
          disabled={busy}
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <div className="detail-panel-body">
        {error && (
          <div className="alert alert-danger form-alert" role="alert">
            {error}
          </div>
        )}
        <section className="detail-panel-section">
          <h3 className="detail-panel-section-title">Assinatura</h3>
          {!hasSecret && (
            <p className="form-hint">
              A chave de assinatura não aparece de novo. Use a cópia salva no
              seu servidor para verificar o teste.
            </p>
          )}
          <Checkbox
            id="webhook-configured"
            label="Configurei a verificação da assinatura no meu servidor."
            checked={configured}
            onChange={onConfiguredChange}
          />
        </section>
        <section className="detail-panel-section">
          <h3 className="detail-panel-section-title">Teste</h3>
          <p className="form-hint">
            O teste usa um evento fictício assinado. Não cria análise nem
            cobrança.
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-md"
            disabled={busy || !configured}
            onClick={onSendTest}
          >
            {busy ? "Enviando…" : "Enviar teste assinado"}
          </button>
          {testResult}
        </section>
        <section className="detail-panel-section">
          <h3 className="detail-panel-section-title">Ativação</h3>
          <p className="form-hint">
            {test?.status === "delivered"
              ? "O destino confirmou o teste. Ative para receber eventos reais."
              : "A ativação libera depois de um teste recebido pelo destino."}
          </p>
        </section>
      </div>
      <div className="detail-panel-footer">
        <button
          type="button"
          className="btn btn-primary btn-md"
          disabled={busy || test?.status !== "delivered"}
          onClick={onActivate}
        >
          Ativar webhook
        </button>
        <button
          className="btn btn-ghost btn-md"
          type="button"
          disabled={busy}
          onClick={onClose}
        >
          Fechar
        </button>
      </div>
    </>
  );
}
