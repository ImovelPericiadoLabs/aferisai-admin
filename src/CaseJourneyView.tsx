import type { PaymentExceptionCase } from "./api";
import { JourneyRail } from "./JourneyRail";
import { railOf } from "./rail-model";
import {
  causeOf,
  isMyTurn,
  turnOf,
  type DocState,
  type Journey,
} from "./case-journey-model";
import { dueState, type nextAction } from "./exception-model";
import { dateTime } from "./exception-panel-model";
import type { Page } from "./team-nav-model";
import "./case-journey.css";

type Role = Parameters<typeof nextAction>[1];

export type CaseNavigation = {
  /** Opens a screen of the operation. */
  openPage?: (page: Page) => void;
  /** Opens the original of a document in Fontes. */
  openSource?: (requestId: string) => void;
  /** Opens the analysis of a document in Análises. */
  openAnalysis?: (workId: string) => void;
};

const DOC_TONE: Record<DocState, string> = {
  delivered: "badge-success",
  waiting: "badge-info",
  problem: "badge-danger",
};

const ANALYSIS_TONE = {
  done: "badge-success",
  running: "badge-info",
  problem: "badge-danger",
  none: "badge-neutral",
} as const;

/** Who has to act now, what they have to do, until when and where to follow it. */
export function CaseTurn({
  item,
  role,
  memberId,
  person,
  now,
}: {
  item: PaymentExceptionCase;
  role: Role;
  memberId: string;
  person: (id: string | null) => string;
  now: number;
}) {
  const turn = turnOf(item, person);
  const mine = isMyTurn(item, role, memberId);
  const due = dueState(item.due_at, now);
  const tone = turn.done ? "done" : mine ? "mine" : "other";
  const pill = turn.done
    ? "Concluído"
    : mine
      ? "Sua vez"
      : `Vez do ${turn.role === "Gestor" ? "gestor" : "financeiro"}`;
  return (
    <section
      className="cj-turn"
      data-tone={tone}
      aria-labelledby="cj-turn-title"
    >
      <div className="cj-turn-head">
        <h3 id="cj-turn-title">{turn.what}</h3>
        <span className="cj-badge">{pill}</span>
      </div>
      <dl className="cj-facts">
        {turn.role && (
          <div>
            <dt>Quem</dt>
            <dd>
              {turn.role}
              {" · "}
              {turn.person ?? "ninguém assumiu ainda"}
            </dd>
          </div>
        )}
        {!turn.done && (
          <div>
            <dt>Prazo</dt>
            <dd>
              <span className={`badge badge-${due.tone}`}>{due.label}</span>
              <small>até {dateTime.format(new Date(item.due_at))}</small>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

/** What happened, in words, with the supplier involved and the technical code kept for support. */
export function CaseCause({
  item,
  nav,
}: {
  item: PaymentExceptionCase;
  nav: CaseNavigation;
}) {
  const cause = causeOf(item.reason_code);
  return (
    <section className="detail-panel-section">
      <h3 className="detail-panel-section-title">O que aconteceu</h3>
      <p className="cj-cause">{cause.title}</p>
      <p className="cj-cause-meta">
        {cause.supplier ? `Fornecedor: ${cause.supplier} · ` : ""}
        Aberto em {dateTime.format(new Date(item.opened_at))}
      </p>
      {cause.uncertain && (
        <div className="alert alert-warning" role="note">
          O resultado no fornecedor não é conhecido. Confira em{" "}
          <strong>Conciliação</strong> antes de tentar de novo, para não comprar
          duas vezes.{" "}
          {nav.openPage && (
            <button
              type="button"
              className="cj-link"
              onClick={() => nav.openPage?.("reconciliation")}
            >
              Abrir Conciliação
            </button>
          )}
        </div>
      )}
      <details className="cj-tech">
        <summary>Detalhes técnicos</summary>
        <p>
          Para o suporte: <code>{cause.code}</code>
        </p>
      </details>
    </section>
  );
}

/** The whole purchase: how many documents, where each one stands and the stages it goes through. */
export function CaseOverview({
  journey,
  canOpen,
  nav,
}: {
  journey: Journey;
  canOpen: boolean;
  nav: CaseNavigation;
}) {
  return (
    <section className="detail-panel-section">
      <JourneyRail steps={railOf(journey)} />
      {journey.kind === "registry" && (
        <ul className="cj-docs" aria-label="Documentos da compra">
          {journey.documents.map((doc) => {
            const error = doc.errorCode ? causeOf(doc.errorCode) : null;
            return (
              <li key={doc.ordinal}>
                <div className="cj-doc-head">
                  <strong>{doc.title}</strong>
                  <span className={`badge ${DOC_TONE[doc.delivery.state]}`}>
                    {doc.delivery.label}
                  </span>
                  <span
                    className={`badge ${ANALYSIS_TONE[doc.analysis.state]}`}
                  >
                    {doc.analysis.label}
                  </span>
                </div>
                {doc.errorCode && (
                  <small className="cj-doc-error">
                    Motivo:{" "}
                    {error && error.title !== "Causa ainda sem descrição"
                      ? error.title
                      : doc.errorCode}
                  </small>
                )}
                {canOpen && (doc.requestId || doc.workId) && (
                  <div className="cj-doc-actions">
                    {doc.requestId && nav.openSource && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() =>
                          nav.openSource?.(doc.requestId as string)
                        }
                      >
                        Abrir fonte
                      </button>
                    )}
                    {doc.workId && nav.openAnalysis && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => nav.openAnalysis?.(doc.workId as string)}
                      >
                        Abrir análise
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
