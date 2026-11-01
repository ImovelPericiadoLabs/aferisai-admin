import { IntegrationIcon } from "./IntegrationIcon";

export function WebhookOnboardingCard({
  disabled,
  onStart,
}: {
  disabled: boolean;
  onStart: () => void;
}) {
  return (
    <div className="onb card">
      <span className="onb-badge" aria-hidden="true">
        <IntegrationIcon name="webhook" size={28} />
      </span>
      <h4>Conecte sua aplicação em 4 passos</h4>
      <p className="onb-lead">
        Receba um aviso assinado no seu servidor sempre que uma análise for
        concluída.
      </p>
      <ul className="onb-perks">
        <li>
          <IntegrationIcon name="shield" size={16} /> Eventos assinados
        </li>
        <li>
          <IntegrationIcon name="check" size={16} /> Teste antes de ativar
        </li>
        <li>
          <IntegrationIcon name="lock" size={16} /> Nenhuma análise ou cobrança
          no teste
        </li>
      </ul>
      <button
        className="btn btn-primary btn-lg onb-cta"
        type="button"
        disabled={disabled}
        onClick={onStart}
      >
        Configurar webhook
      </button>
      <small className="onb-foot">
        O cadastro só prepara a chave de assinatura. Nenhuma entrega real é
        ativada ainda.
      </small>
    </div>
  );
}
