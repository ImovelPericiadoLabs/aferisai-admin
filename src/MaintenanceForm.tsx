import type { MaintenanceMode } from "./api";
import { presetEnd, type MaintenanceDraft } from "./maintenance-model";
import { PRESETS } from "./site-maintenance-view";

export function MaintenanceForm({
  draft,
  set,
  problem,
  now,
  error,
  changeCount,
  busy,
  onSubmit,
  onDiscard,
}: {
  draft: MaintenanceDraft;
  set: <K extends keyof MaintenanceDraft>(
    key: K,
    value: MaintenanceDraft[K],
  ) => void;
  problem: string | null;
  now: number;
  error: string;
  changeCount: number;
  busy: boolean;
  onSubmit: () => void;
  onDiscard: () => void;
}) {
  return (
    <form
      className="maint-form"
      autoComplete="off"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <fieldset className="maint-section">
        <legend>Modo de acesso</legend>
        <div
          className="maint-choice"
          role="radiogroup"
          aria-label="Modo de acesso"
        >
          <label data-checked={draft.mode === "off"}>
            <input
              type="radio"
              name="maint-mode"
              checked={draft.mode === "off"}
              onChange={() => set("mode", "off" as MaintenanceMode)}
            />
            <span>
              <strong>Site disponível</strong>
              <small>Visitantes acessam normalmente.</small>
            </span>
          </label>
          <label data-checked={draft.mode === "restricted"} data-tone="info">
            <input
              type="radio"
              name="maint-mode"
              checked={draft.mode === "restricted"}
              onChange={() => set("mode", "restricted" as MaintenanceMode)}
            />
            <span>
              <strong>Em preparação</strong>
              <small>
                Site institucional no ar; consultas, pagamentos e login
                bloqueados.
              </small>
            </span>
          </label>
          <label data-checked={draft.mode === "full"} data-tone="warning">
            <input
              type="radio"
              name="maint-mode"
              checked={draft.mode === "full"}
              onChange={() => set("mode", "full" as MaintenanceMode)}
            />
            <span>
              <strong>Em manutenção</strong>
              <small>
                Visitantes veem a página de manutenção; a API pública responde
                indisponível.
              </small>
            </span>
          </label>
        </div>
      </fieldset>

      <fieldset className="maint-section" disabled={draft.mode === "off"}>
        <legend>Janela</legend>
        <div className="maint-dates">
          <div className="form-field">
            <label className="form-field-label" htmlFor="maint-start">
              Início
            </label>
            <input
              id="maint-start"
              className="input"
              type="datetime-local"
              value={draft.startsAt}
              aria-invalid={!!problem}
              onChange={(event) => set("startsAt", event.target.value)}
            />
            <span className="form-hint">
              Opcional. Vazio começa assim que você salvar.
            </span>
          </div>
          <div className="form-field">
            <label className="form-field-label" htmlFor="maint-end">
              Término
            </label>
            <input
              id="maint-end"
              className="input"
              type="datetime-local"
              value={draft.endsAt}
              aria-invalid={!!problem}
              aria-describedby={problem ? "maint-window-error" : undefined}
              onChange={(event) => set("endsAt", event.target.value)}
            />
            <span className="form-hint">
              Opcional. Vazio fica até você desligar.
            </span>
          </div>
        </div>
        <div className="maint-presets" role="group" aria-label="Duração rápida">
          <span>Duração a partir do início:</span>
          {PRESETS.map((preset) => (
            <button
              key={preset.minutes}
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() =>
                set("endsAt", presetEnd(draft.startsAt, preset.minutes, now))
              }
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={!draft.endsAt}
            onClick={() => set("endsAt", "")}
          >
            Sem término
          </button>
        </div>
        {problem && (
          <p id="maint-window-error" className="maint-error" role="alert">
            {problem}
          </p>
        )}
        {draft.mode === "off" && (
          <p className="form-hint">
            A janela só vale quando o modo não é "Disponível".
          </p>
        )}
      </fieldset>

      <fieldset className="maint-section">
        <legend>Mensagens</legend>
        <div className="form-field">
          <label className="form-field-label" htmlFor="maint-public">
            Mensagem para visitantes
          </label>
          <textarea
            id="maint-public"
            className="input"
            rows={2}
            maxLength={240}
            value={draft.publicMessage}
            placeholder="Estamos atualizando o serviço. Volte em breve."
            onChange={(event) => set("publicMessage", event.target.value)}
          />
          <span className="form-hint">
            Opcional · aparece na página de manutenção ·{" "}
            {draft.publicMessage.length}/240
          </span>
        </div>
        <div className="form-field">
          <label className="form-field-label" htmlFor="maint-note">
            Nota interna
          </label>
          <textarea
            id="maint-note"
            className="input"
            rows={3}
            maxLength={500}
            value={draft.note}
            onChange={(event) => set("note", event.target.value)}
          />
          <span className="form-hint">
            Opcional · visível somente à equipe · {draft.note.length}
            /500
          </span>
        </div>
      </fieldset>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="maint-actions">
        <span className="form-hint" role="status">
          {changeCount === 0
            ? "Nenhuma alteração para salvar."
            : `${changeCount} ${changeCount === 1 ? "alteração" : "alterações"} não salva${changeCount === 1 ? "" : "s"}.`}
        </span>
        <div>
          <button
            type="button"
            className="btn btn-secondary btn-md"
            disabled={changeCount === 0 || busy}
            onClick={onDiscard}
          >
            Descartar
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-md"
            disabled={changeCount === 0 || !!problem || busy}
          >
            Revisar e salvar
          </button>
        </div>
      </div>
    </form>
  );
}
