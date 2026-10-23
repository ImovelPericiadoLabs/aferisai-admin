import { decisionLabel } from "./display-labels";
import {
  historyView,
  shortId,
  shortSha,
  type ReviewVersion,
} from "./onr-review-model";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function OnrVersionHistory({
  items,
  currentSha,
}: {
  items: ReviewVersion[];
  currentSha: string | null;
}) {
  if (items.length === 0)
    return (
      <p className="onr-rv-muted" role="status">
        Nenhuma revisão registrada para esta tentativa.
      </p>
    );
  const view = historyView(items, currentSha ?? "");
  return (
    <>
      <ol className="onr-rv-versions" aria-label="Versões da revisão">
        {view.map((item) => (
          <li key={item.id} data-current={item.current ? "true" : undefined}>
            <div className="onr-rv-version-head">
              <strong>Versão {item.version}</strong>
              <span className="badge badge-neutral">
                {decisionLabel(item.decision)}
              </span>
              {item.current && <span className="badge badge-info">Atual</span>}
              <small>{dateTime.format(new Date(item.observed_at))}</small>
            </div>
            <p className="onr-rv-reason">{item.reason}</p>
            <div className="onr-rv-version-foot">
              <span>
                Listagem{" "}
                <code title={item.portal_orders_sha256}>
                  {shortSha(item.portal_orders_sha256)}
                </code>
              </span>
              {currentSha !== null && (
                <span
                  className={`badge ${item.sameListing ? "badge-success" : "badge-warning"}`}
                >
                  {item.sameListing
                    ? "Igual à listagem de agora"
                    : "A listagem mudou desde então"}
                </span>
              )}
              <span>Pessoa da equipe {shortId(item.actor_team_member_id)}</span>
              {item.previous_review_id && (
                <span>Corrige a versão anterior</span>
              )}
            </div>
          </li>
        ))}
      </ol>
      <p className="form-hint">
        O backend guarda apenas o resumo (SHA-256) de cada listagem, não a lista
        de protocolos da época. A comparação mostra se a listagem de agora é a
        mesma que sustentou cada versão.
      </p>
    </>
  );
}
