import type { FormEvent } from "react";
import type { SourceDecision, SourceKind } from "./api";
import { RolePicker } from "./RolePicker";
import { dateTime, sourceLabels } from "./source-classification-labels";
import { SOURCE_OPTIONS } from "./source-queue-model";

export function SourceDecisionColumn({
  current,
  latest,
  busy,
  sourceKind,
  decisionReason,
  hasRead,
  visualConfirmed,
  onSourceKind,
  onDecisionReason,
  onVisualConfirmed,
  onSubmit,
}: {
  current: boolean;
  latest: SourceDecision | null;
  busy: boolean;
  sourceKind: SourceKind;
  decisionReason: string;
  hasRead: boolean;
  visualConfirmed: boolean;
  onSourceKind: (kind: SourceKind) => void;
  onDecisionReason: (value: string) => void;
  onVisualConfirmed: (value: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="ops-bench-col" data-current={current ? "true" : undefined}>
      <section className="ops-block" aria-labelledby="source-current-title">
        <h2 className="ops-block-title" id="source-current-title">
          Última classificação
        </h2>
        {latest ? (
          <dl className="ops-facts">
            <div>
              <dt>Natureza</dt>
              <dd>{sourceLabels[latest.source_kind]}</dd>
            </div>
            <div>
              <dt>Revisão</dt>
              <dd>{latest.revision}</dd>
            </div>
            <div>
              <dt>Registrada em</dt>
              <dd>{dateTime.format(new Date(latest.created_at))}</dd>
            </div>
            <div>
              <dt>Motivo</dt>
              <dd>{latest.reason}</dd>
            </div>
          </dl>
        ) : (
          <p className="ops-lead">
            Ainda não existe decisão para este arquivo.
          </p>
        )}
      </section>

      <form className="ops-block" onSubmit={onSubmit}>
        <h2 className="ops-block-title">
          {latest ? "Corrigir classificação" : "Registrar classificação"}
        </h2>
        <p className="ops-lead">
          {latest
            ? "Uma correção cria nova revisão. Abra o original novamente antes de registrar."
            : "Abra e confira o original antes de registrar a primeira decisão."}
        </p>
        <RolePicker<SourceKind>
          label="Natureza do original"
          value={sourceKind}
          options={SOURCE_OPTIONS}
          disabled={busy}
          onChange={onSourceKind}
        />
        <div className="form-field ops-field">
          <label className="form-field-label" htmlFor="source-decision-reason">
            Motivo da classificação
          </label>
          <textarea
            id="source-decision-reason"
            className="input"
            required
            minLength={10}
            maxLength={500}
            value={decisionReason}
            onChange={(event) => onDecisionReason(event.target.value)}
            placeholder="Descreva o que foi observado no arquivo."
          />
          <span className="form-hint">
            {decisionReason.trim().length}/500 (mínimo 10)
          </span>
        </div>
        <label className="ops-check">
          <input
            type="checkbox"
            checked={visualConfirmed}
            disabled={!hasRead || busy}
            onChange={(event) => onVisualConfirmed(event.target.checked)}
          />
          Conferi visualmente o original e as páginas relevantes para esta
          classificação.
        </label>
        <p className="ops-lead">
          Documento registral declarado é só um requisito da futura cotação; a
          cobrança continua indisponível.
        </p>
        <div className="ops-actions">
          <button
            className="btn btn-primary btn-md"
            type="submit"
            disabled={
              busy ||
              !hasRead ||
              !visualConfirmed ||
              decisionReason.trim().length < 10
            }
          >
            {busy ? "Registrando…" : "Registrar decisão"}
          </button>
        </div>
      </form>
    </div>
  );
}
