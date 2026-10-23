import { webhookHost } from "./application-overview-model";
import { IntegrationIcon } from "./IntegrationIcon";

const captions = {
  active: "Recebendo eventos",
  draft: "Em configuração",
  suspended: "Entregas suspensas",
  none: "Ainda não configurado",
} as const;

const STEPS = ["Endereço", "Assinatura", "Teste", "Ativar"] as const;

/**
 * Where signed events travel, with the setup progress laid on the line between
 * the two ends. `step` is the current step (0–3) or 4 when everything is done.
 */
export function WebhookFlow({
  state,
  url,
  step,
}: {
  state: keyof typeof captions;
  url: string | null;
  step: 0 | 1 | 2 | 3 | 4;
}) {
  const progress = step === 0 ? 0 : step >= 4 ? 100 : ((step - 0.5) / 4) * 100;
  return (
    <section
      className="wf card"
      data-state={state}
      aria-label="Fluxo e progresso do webhook"
    >
      <div className="wf-node">
        <span className="wf-icon">
          <IntegrationIcon name="activity" size={22} />
        </span>
        <strong>AferisAI</strong>
        <small>Evento assinado</small>
      </div>
      <div
        className="wf-track"
        style={{ ["--wf-progress" as string]: `${progress}%` }}
      >
        <div className="wf-rail" aria-hidden="true">
          <span className="wf-fill" />
          <i />
          <i />
          <i />
        </div>
        <ol className="wf-steps" aria-label="Etapas de configuração">
          {STEPS.map((label, index) => {
            const status =
              step > index ? "done" : step === index ? "current" : "pending";
            return (
              <li
                key={label}
                data-status={status}
                aria-current={status === "current" ? "step" : undefined}
              >
                <span className="wf-mark" aria-hidden="true">
                  {status === "done" ? (
                    <IntegrationIcon name="check" size={14} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="wf-step-label">{label}</span>
                <span className="sr-only">
                  {status === "done"
                    ? " (concluída)"
                    : status === "current"
                      ? " (etapa atual)"
                      : " (pendente)"}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="wf-node">
        <span className="wf-icon">
          <IntegrationIcon name="server" size={22} />
        </span>
        <strong>{url ? webhookHost(url) : "Seu servidor"}</strong>
        <small>{captions[state]}</small>
      </div>
    </section>
  );
}
