import { useMemo, useState } from "react";
import { Switch } from "./controls";
import {
  events,
  gaps,
  metrics,
  modes,
  permissions,
  statusLabel,
  type CatalogStatus,
} from "./integration-catalog";
import { MetricsPreview } from "./MetricsPreview";
import { PermissionIcon } from "./PermissionIcon";
import "./integration-map.css";

const tabs = [
  { id: "modes", label: "Modos" },
  { id: "permissions", label: "Permissões" },
  { id: "events", label: "Eventos" },
  { id: "metrics", label: "Métricas" },
  { id: "gaps", label: "Lacunas" },
  { id: "preview", label: "Prévia de métricas" },
] as const;
type Tab = (typeof tabs)[number]["id"];

const tone = (status: CatalogStatus) =>
  status === "implemented"
    ? "badge-success"
    : status === "partial"
      ? "badge-warning"
      : "badge-info";

function Status({ status }: { status: CatalogStatus }) {
  return <span className={`badge ${tone(status)}`}>{statusLabel[status]}</span>;
}

export function IntegrationMap() {
  const [tab, setTab] = useState<Tab>("modes");
  const [proposals, setProposals] = useState(true);
  const keep = (status: CatalogStatus) => proposals || status !== "proposed";

  const counts = useMemo(
    () => ({
      permissions: permissions.filter((p) => p.status === "implemented").length,
      events: events.filter((e) => e.status === "implemented").length,
      modes: modes.filter((m) => m.status !== "proposed").length,
      gaps: gaps.length,
    }),
    [],
  );

  return (
    <section className="page imap" aria-labelledby="imap-title">
      <header className="page-header">
        <div>
          <h1 className="page-title" id="imap-title">
            Mapa de integrações
          </h1>
          <p className="page-subtitle">
            O que o backend permite hoje e o que ainda é proposta. Referência
            gerada da leitura do código; não vem da API.
          </p>
        </div>
      </header>

      <div className="imap-summary">
        <div>
          <strong>{counts.permissions}</strong>
          <span>permissões reais</span>
        </div>
        <div>
          <strong>{counts.modes}</strong>
          <span>modos em uso</span>
        </div>
        <div>
          <strong>{counts.events}</strong>
          <span>eventos reais</span>
        </div>
        <div>
          <strong>{counts.gaps}</strong>
          <span>lacunas conhecidas</span>
        </div>
        <Switch
          id="imap-proposals"
          label="Mostrar propostas"
          description="Itens que ainda não existem no backend."
          checked={proposals}
          onChange={(checked) => {
            setProposals(checked);
            if (!checked && tab === "preview") setTab("modes");
          }}
        />
      </div>

      <div className="seg-tabs" role="tablist" aria-label="Seções do mapa">
        {tabs
          .filter((item) => proposals || item.id !== "preview")
          .map((item) => (
            <button
              key={item.id}
              id={`imap-tab-${item.id}`}
              type="button"
              role="tab"
              className={`seg-tab${tab === item.id ? " active" : ""}`}
              aria-selected={tab === item.id}
              aria-controls="imap-panel"
              tabIndex={tab === item.id ? 0 : -1}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
      </div>

      <div id="imap-panel" role="tabpanel" aria-labelledby={`imap-tab-${tab}`}>
        {tab === "modes" && (
          <div className="imap-grid">
            {modes
              .filter((m) => keep(m.status))
              .map((mode) => (
                <article
                  key={mode.id}
                  className="imap-card card"
                  data-status={mode.status}
                >
                  <header>
                    <h2>{mode.name}</h2>
                    <Status status={mode.status} />
                  </header>
                  <dl>
                    <dt>Quem age</dt>
                    <dd>{mode.actor}</dd>
                    <dt>Autenticação</dt>
                    <dd>{mode.auth}</dd>
                    <dt>Permissões</dt>
                    <dd>{mode.permissions}</dd>
                  </dl>
                  <p>{mode.note}</p>
                  <code>{mode.source}</code>
                </article>
              ))}
          </div>
        )}

        {tab === "permissions" && (
          <div className="imap-perms">
            {permissions
              .filter((p) => keep(p.status))
              .map((permission) => (
                <article
                  key={permission.code}
                  className="imap-perm"
                  data-status={permission.status}
                >
                  <span className="imap-perm-icon">
                    <PermissionIcon code={permission.code} />
                  </span>
                  <div className="imap-perm-main">
                    <strong>{permission.title}</strong>
                    <code>{permission.code}</code>
                    <small>{permission.unlocks}</small>
                  </div>
                  <div className="imap-perm-tags">
                    <Status status={permission.status} />
                    {permission.grantedByDefault && (
                      <span className="badge badge-neutral">
                        Concedida por padrão
                      </span>
                    )}
                    {permission.sensitive && (
                      <span className="badge badge-danger">Dado sensível</span>
                    )}
                  </div>
                </article>
              ))}
          </div>
        )}

        {tab === "events" && (
          <div className="data-table-wrap">
            <table className="data-table" aria-label="Eventos">
              <thead>
                <tr>
                  <th scope="col">Evento</th>
                  <th scope="col">Direção</th>
                  <th scope="col">Situação</th>
                  <th scope="col">Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {events
                  .filter((e) => keep(e.status))
                  .map((event) => (
                    <tr key={event.name}>
                      <td data-label="Evento">
                        <code>{event.name}</code>
                      </td>
                      <td data-label="Direção">{event.direction}</td>
                      <td data-label="Situação">
                        <Status status={event.status} />
                      </td>
                      <td data-label="Detalhe">{event.note}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "metrics" && (
          <div className="data-table-wrap">
            <table className="data-table" aria-label="Métricas">
              <thead>
                <tr>
                  <th scope="col">Métrica</th>
                  <th scope="col">Situação</th>
                  <th scope="col">Quem vê</th>
                  <th scope="col">Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {metrics
                  .filter((m) => keep(m.status))
                  .map((metric) => (
                    <tr key={metric.name}>
                      <td data-label="Métrica">
                        <strong>{metric.name}</strong>
                      </td>
                      <td data-label="Situação">
                        <Status status={metric.status} />
                      </td>
                      <td data-label="Quem vê">{metric.scope}</td>
                      <td data-label="Detalhe">{metric.note}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "preview" && <MetricsPreview />}

        {tab === "gaps" && (
          <ul className="imap-gaps">
            {gaps.map((gap) => (
              <li key={gap.id} className="card">
                <strong>{gap.title}</strong>
                <p>{gap.effect}</p>
                <code>{gap.source}</code>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
