import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  listApplicationAuditEvents,
  type ApplicationAuditItem,
} from "./api";
import {
  actorLabel,
  auditSourceLabel,
  auditTitle,
  auditTone,
  countAudit,
  filterAudit,
  statusChange,
  type AuditFilter,
} from "./audit-model";
import { applicationPermissionLabel } from "./display-labels";
import { relativeTime } from "./integration-insights-model";
import "./application-audit.css";

const filters: { value: AuditFilter; label: string }[] = [
  { value: "all", label: "Tudo" },
  { value: "permission", label: auditSourceLabel.permission },
  { value: "credential", label: auditSourceLabel.credential },
  { value: "webhook", label: auditSourceLabel.webhook },
];

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

/** Immutable trail of permission, credential and webhook changes (team only). */
export function ApplicationAudit({
  applicationId,
  onUnauthorized,
}: {
  applicationId: string;
  onUnauthorized: () => void;
}) {
  const [items, setItems] = useState<ApplicationAuditItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<AuditFilter>("all");
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(
    async (cursor?: string) => {
      try {
        const page = await listApplicationAuditEvents(applicationId, cursor);
        setItems((current) =>
          cursor ? [...current, ...page.items] : page.items,
        );
        setNextCursor(page.next_cursor);
        setNow(Date.now());
        setFailed(false);
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setFailed(true);
      } finally {
        setLoading(false);
        setBusy(false);
      }
    },
    [applicationId, onUnauthorized],
  );

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const counts = useMemo(() => countAudit(items), [items]);
  const visible = useMemo(() => filterAudit(items, filter), [items, filter]);

  return (
    <section className="cred" aria-labelledby="audit-title">
      <header className="cred-head">
        <div>
          <h3 className="appws-section-title" id="audit-title">
            Auditoria
          </h3>
          <p className="form-hint">
            Quem alterou permissões, credenciais e o webhook, quando e por quê.
            Os registros não podem ser editados e não mostram segredos nem a URL
            do webhook.
          </p>
        </div>
        <button
          className="btn btn-ghost btn-md"
          type="button"
          disabled={loading || busy}
          onClick={() => {
            setLoading(true);
            void load();
          }}
        >
          Atualizar
        </button>
      </header>

      <div className="seg" role="group" aria-label="Filtrar por recurso">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            className="seg-item"
            aria-pressed={filter === item.value}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
            <span className="seg-count">{counts[item.value]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rules-skeleton" role="status" aria-label="Carregando">
          <span className="skeleton" />
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      ) : failed ? (
        <div className="alert alert-danger" role="alert">
          Não foi possível carregar a auditoria.{" "}
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            onClick={() => {
              setLoading(true);
              void load();
            }}
          >
            Tentar novamente
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state" role="status">
          <strong>
            {items.length === 0
              ? "Nenhuma alteração registrada"
              : "Nenhum registro neste filtro"}
          </strong>
          <span>
            Eventos anteriores à trilha de auditoria não são inferidos.
          </span>
        </div>
      ) : (
        <ol className="audit-list" aria-label="Alterações registradas">
          {visible.map((item) => {
            const change = statusChange(item);
            return (
              <li key={item.id} data-tone={auditTone(item)}>
                <span className="audit-dot" aria-hidden="true" />
                <div className="audit-body">
                  <div className="audit-line">
                    <strong>
                      {auditTitle(item, applicationPermissionLabel)}
                    </strong>
                    <span className="badge badge-neutral">
                      {auditSourceLabel[item.source]}
                    </span>
                  </div>
                  <small>
                    {actorLabel(item)} ·{" "}
                    <time dateTime={item.created_at}>
                      {dateTime.format(new Date(item.created_at))}
                    </time>{" "}
                    · {relativeTime(item.created_at, now)}
                    {change ? ` · ${change}` : ""}
                  </small>
                  <p
                    className={
                      item.reason ? "audit-reason" : "audit-reason is-empty"
                    }
                  >
                    {item.reason ?? "Sem motivo informado"}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {nextCursor && (
        <button
          type="button"
          className="btn btn-secondary btn-md cred-more"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void load(nextCursor);
          }}
        >
          Carregar mais
        </button>
      )}
    </section>
  );
}
