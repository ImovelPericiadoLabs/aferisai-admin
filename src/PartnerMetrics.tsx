import { useEffect, useState } from "react";
import {
  ApiError,
  getPartnerMetrics,
  type PartnerActivity,
  type PartnerApplication,
} from "./api";
import { deliveryRate, latencyLabel } from "./partner-finance-model";
import "./partner-finance.css";

const WINDOWS = [7, 30, 90] as const;
const number = new Intl.NumberFormat("pt-BR");

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="pf-kpi">
      <dt>{label}</dt>
      <dd>{value}</dd>
      <small>{hint}</small>
    </div>
  );
}

export function PartnerMetrics({
  applications,
  organizationName,
  onUnauthorized,
}: {
  applications: PartnerApplication[];
  organizationName: string;
  onUnauthorized: () => void;
}) {
  const [days, setDays] = useState<number>(30);
  const [applicationId, setApplicationId] = useState("");
  const [data, setData] = useState<PartnerActivity | null>(null);
  const [failed, setFailed] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    getPartnerMetrics(days, applicationId || undefined)
      .then((result) => {
        if (!live) return;
        setData(result);
        setFailed("");
      })
      .catch((cause: unknown) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else
          setFailed(
            cause instanceof ApiError
              ? cause.detail
              : "Não foi possível carregar as métricas.",
          );
      });
    return () => {
      live = false;
    };
  }, [days, applicationId, reload, onUnauthorized]);

  const rate = data
    ? deliveryRate(data.webhook_delivered, data.webhook_attempts)
    : null;

  return (
    <section className="pf" aria-labelledby="pf-metrics-title">
      <div className="pf-toolbar">
        <div>
          <h2 className="appws-section-title" id="pf-metrics-title">
            Métricas
          </h2>
          <p className="pf-note">
            Atividade de {organizationName} nos últimos {days} dias, sem dados
            pessoais.
          </p>
        </div>
        <div className="pf-toolbar">
          <select
            className="input"
            aria-label="Aplicação"
            value={applicationId}
            onChange={(event) => {
              setData(null);
              setApplicationId(event.target.value);
            }}
          >
            <option value="">Todas as aplicações</option>
            {applications.map((application) => (
              <option key={application.id} value={application.id}>
                {application.name}
              </option>
            ))}
          </select>
          <div className="seg" role="group" aria-label="Período">
            {WINDOWS.map((value) => (
              <button
                key={value}
                type="button"
                className="seg-item"
                aria-pressed={days === value}
                onClick={() => {
                  setData(null);
                  setDays(value);
                }}
              >
                {value} dias
              </button>
            ))}
          </div>
        </div>
      </div>

      {failed ? (
        <div className="alert alert-danger" role="alert">
          {failed}{" "}
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            onClick={() => {
              setFailed("");
              setReload((value) => value + 1);
            }}
          >
            Tentar novamente
          </button>
        </div>
      ) : !data ? (
        <div
          className="rules-skeleton"
          role="status"
          aria-label="Carregando métricas"
        >
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      ) : (
        <>
          <div className="pf-group">
            <h3>Análises</h3>
            <dl className="pf-kpis">
              <Kpi
                label="Análises enviadas"
                value={number.format(data.analysis_submissions)}
                hint="Criadas na janela"
              />
              <Kpi
                label="Análises concluídas"
                value={number.format(data.analysis_completions)}
                hint="Concluídas na janela"
              />
              <Kpi
                label="Pedidos registrais"
                value={number.format(data.registry_requests)}
                hint="Delegados criados; não são compras confirmadas"
              />
              <Kpi
                label="Conexões ativas"
                value={number.format(data.active_connections)}
                hint="Situação neste momento"
              />
            </dl>
          </div>
          <div className="pf-group">
            <h3>Entrega de webhooks</h3>
            <dl className="pf-kpis">
              <Kpi
                label="Tentativas"
                value={number.format(data.webhook_attempts)}
                hint="Inclui resultado incerto"
              />
              <Kpi
                label="Entregues"
                value={number.format(data.webhook_delivered)}
                hint={
                  rate === null ? "Sem tentativas" : `${rate}% das tentativas`
                }
              />
              <Kpi
                label="Latência mediana"
                value={latencyLabel(data.webhook_latency_p50_ms)}
                hint="Entregas confirmadas"
              />
              <Kpi
                label="Latência p95"
                value={latencyLabel(data.webhook_latency_p95_ms)}
                hint="Entregas confirmadas"
              />
            </dl>
          </div>
          <div className="pf-group">
            <h3>Cupons e links</h3>
            <dl className="pf-kpis">
              <Kpi
                label="Pagamentos com cupom"
                value={number.format(data.coupon_redemptions)}
                hint="Confirmados na janela"
              />
              <Kpi
                label="Pagamentos com link"
                value={number.format(data.link_redemptions)}
                hint="Confirmados na janela"
              />
            </dl>
            <p className="pf-note">
              A conversão de links ainda não aparece: o histórico de capturas
              não é armazenado.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
