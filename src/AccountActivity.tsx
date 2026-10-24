import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  listSupplierAccountEvents,
  type SupplierAccountActivity,
} from "./api";
import { activityLabel, diffEntries, fieldLabel } from "./account-model";
import { SettingCard } from "./SupplierUi";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function AccountActivity({
  accountId,
  onUnauthorized,
}: {
  accountId: string;
  onUnauthorized: () => void;
}) {
  const [items, setItems] = useState<SupplierAccountActivity[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (next?: string | null) => {
      setLoading(true);
      try {
        const page = await listSupplierAccountEvents(accountId, next);
        setItems((current) =>
          next ? [...current, ...page.items] : page.items,
        );
        setCursor(page.next_cursor);
        setError("");
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else
          setError(
            cause instanceof ApiError
              ? cause.detail
              : "Não foi possível carregar a atividade.",
          );
      } finally {
        setLoading(false);
      }
    },
    [accountId, onUnauthorized],
  );

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  return (
    <SettingCard
      title="Atividade da conta"
      help="Quem mudou o quê nesta conta: ativação, conexão, tarifas e condições. Mostra estado e valores comerciais, nunca credenciais."
      actions={
        <button
          type="button"
          className="btn btn-ghost btn-md"
          disabled={loading}
          onClick={() => void load()}
        >
          Atualizar
        </button>
      }
    >
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {loading && items.length === 0 && !error && (
        <p className="sup-muted" role="status">
          Consultando…
        </p>
      )}
      {!loading && items.length === 0 && !error && (
        <p className="sup-muted">
          Nenhuma atividade registrada para esta conta.
        </p>
      )}
      <ol className="sup-activity">
        {items.map((item) => {
          const changes = diffEntries(item.before, item.after);
          return (
            <li key={item.id}>
              <span className="sup-dot" data-state="ok" aria-hidden="true" />
              <div>
                <div className="sup-activity-head">
                  <strong>{activityLabel(item.action)}</strong>
                  <small className="sup-muted">
                    {dateTime.format(new Date(item.occurred_at))} · pessoa{" "}
                    {item.actor_team_member_id.slice(0, 8)}
                  </small>
                </div>
                {item.reason && (
                  <p className="sup-activity-reason">{item.reason}</p>
                )}
                {changes.length > 0 && (
                  <ul className="sup-activity-changes">
                    {changes.map((change) => (
                      <li key={change.key}>
                        <span className="sup-muted">
                          {fieldLabel(change.key)}
                        </span>
                        <span>
                          {change.from} <b aria-hidden="true">→</b> {change.to}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {cursor && (
        <button
          type="button"
          className="btn btn-secondary btn-md"
          disabled={loading}
          onClick={() => void load(cursor)}
        >
          {loading ? "Carregando…" : "Carregar mais"}
        </button>
      )}
    </SettingCard>
  );
}
