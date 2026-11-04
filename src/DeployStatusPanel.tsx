import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  getDeployStatus,
  type DeployJob,
  type DeploySnapshot,
} from "./api";
import { date } from "./operations-format";
import "./deploy-status-panel.css";

const stateLabel: Record<DeployJob["state"], string> = {
  idle: "Ocioso",
  queued: "Na fila",
  running: "Executando",
  succeeded: "Concluído",
  failed: "Falhou",
  superseded: "Substituído",
};

function commitLabel(commit?: string) {
  return commit ? commit.slice(0, 12) : "—";
}

function DeployState({ state }: { state: DeployJob["state"] }) {
  return (
    <span className={`deploy-state deploy-state-${state}`}>
      <span aria-hidden="true" className="deploy-state-dot" />
      {stateLabel[state]}
    </span>
  );
}

function DeployRow({ job }: { job: DeployJob }) {
  return (
    <li className="deploy-history-row">
      <DeployState state={job.state} />
      <code title={job.commit}>{commitLabel(job.commit)}</code>
      <span>{job.message || "Sem mensagem"}</span>
      <time dateTime={job.started_at}>
        {job.started_at ? date(job.started_at) : "—"}
      </time>
    </li>
  );
}

export function DeployStatusPanel({
  onUnauthorized,
}: {
  onUnauthorized: () => void;
}) {
  const [snapshot, setSnapshot] = useState<DeploySnapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let live = true;
    const read = () => {
      setRefreshing(true);
      void getDeployStatus()
        .then((value) => {
          if (!live) return;
          setSnapshot(value);
          setError("");
          setLoading(false);
          setRefreshing(false);
        })
        .catch((cause: unknown) => {
          if (!live) return;
          if (cause instanceof ApiError && cause.status === 401)
            onUnauthorized();
          setError(
            cause instanceof ApiError
              ? cause.detail
              : "Não foi possível consultar o estado dos deploys.",
          );
          setLoading(false);
          setRefreshing(false);
        });
    };
    read();
    const timer = window.setInterval(read, 5_000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [revision, onUnauthorized]);

  const current = snapshot?.current;
  return (
    <section className="deploy-panel" aria-labelledby="deploy-status-title">
      <div className="deploy-panel-heading">
        <div>
          <p className="deploy-eyebrow">ENTREGA CONTÍNUA</p>
          <h2 id="deploy-status-title">Deploys e disponibilidade</h2>
          <p>
            Leitura segura do estado publicado. Atualiza automaticamente a cada
            5 segundos.
          </p>
        </div>
        <button
          className="btn btn-secondary btn-md"
          type="button"
          onClick={reload}
          disabled={refreshing}
        >
          {refreshing ? "Atualizando…" : "Atualizar"}
        </button>
      </div>
      {error && (
        <div className="deploy-alert" role="alert">
          <span>{error}</span>
          <button type="button" onClick={reload}>
            Tentar novamente
          </button>
        </div>
      )}
      {loading && !snapshot ? (
        <div
          className="deploy-skeleton"
          aria-busy="true"
          aria-label="Carregando status do deploy"
        >
          <span />
          <span />
          <span />
        </div>
      ) : snapshot ? (
        <>
          <div className="deploy-current" aria-label="Deploy atual">
            <div>
              <span className="deploy-label">ESTADO ATUAL</span>
              <strong>
                <DeployState state={current?.state || "idle"} />
              </strong>
              <p>{current?.message || "Nenhum deploy em execução"}</p>
            </div>
            <div className="deploy-current-meta">
              <span>Commit</span>
              <code title={current?.commit}>
                {commitLabel(current?.commit)}
              </code>
              <small>
                {current?.started_at
                  ? `Iniciado ${date(current.started_at)}`
                  : "Sem execução ativa"}
              </small>
            </div>
          </div>
          <div className="deploy-last-line">
            <span>
              Último resultado:{" "}
              <strong>
                {snapshot.last
                  ? stateLabel[snapshot.last.state]
                  : "sem histórico"}
              </strong>
              {snapshot.last?.commit
                ? ` · ${commitLabel(snapshot.last.commit)}`
                : ""}
            </span>
            <small>Verificado {date(snapshot.checked_at)}</small>
          </div>
          <div className="deploy-history">
            <div className="deploy-history-heading">
              <h3>Histórico recente</h3>
              <span>{snapshot.history.length} registros</span>
            </div>
            {snapshot.history.length ? (
              <ul>
                {snapshot.history.slice(0, 8).map((job) => (
                  <DeployRow
                    key={job.job_id || `${job.commit}-${job.started_at}`}
                    job={job}
                  />
                ))}
              </ul>
            ) : (
              <p className="deploy-empty">
                Ainda não há histórico de deploy disponível.
              </p>
            )}
          </div>
        </>
      ) : null}
      <p className="deploy-safety-note">
        Somente administradores ativos podem consultar este painel. O webhook e
        os logs continuam privados.
      </p>
    </section>
  );
}
