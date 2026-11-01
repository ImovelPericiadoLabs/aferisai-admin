import { RolePicker } from "./RolePicker";
import { OFFICIAL_ORIGIN, WORKER_EXAMPLE } from "./onr-endpoint-model";
import { InlinePanel, Metrics, SettingCard } from "./SupplierUi";
import { MODES, type Mode } from "./supplier-editor-model";
import type { OnrConnection } from "./useOnrConnection";

export function SupplierConnectionTab({ conn }: { conn: OnrConnection }) {
  const {
    endpoint,
    mode,
    setMode,
    origin,
    setOrigin,
    key,
    setKey,
    replaceKey,
    setReplaceKey,
    loading,
    busy,
    error,
    submitted,
    setSubmitted,
    connectionOpen,
    setConnectionOpen,
    keyConfigured,
    view,
    check,
    changed,
    restoring,
    load,
    review,
  } = conn;
  return (
    <>
      <SettingCard
        title="Conexão com o portal"
        help="Define por onde as consultas desta conta chegam ao RI Digital. A troca vale para execuções iniciadas depois de salvar; compras com resultado incerto continuam indo para conciliação, sem reenvio automático."
        badge={
          view && (
            <span className={`badge badge-${view.tone}`}>{view.title}</span>
          )
        }
        actions={
          <>
            <button
              type="button"
              className="btn btn-ghost btn-md"
              disabled={loading || busy}
              onClick={() => void load()}
            >
              {loading ? "Atualizando…" : "Atualizar"}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-md"
              aria-haspopup="dialog"
              disabled={!endpoint}
              onClick={() => {
                setSubmitted(false);
                setConnectionOpen(true);
              }}
            >
              Alterar conexão
            </button>
          </>
        }
      >
        {error && !connectionOpen && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        {loading && !endpoint ? (
          <div
            className="sup-ed-skeleton"
            role="status"
            aria-label="Carregando conexão"
          >
            <span className="skeleton" />
            <span className="skeleton" />
          </div>
        ) : endpoint && view ? (
          <>
            <Metrics
              items={[
                { label: "Origem", value: view.title },
                { label: "Chave do proxy", value: view.key },
                { label: "Versão", value: endpoint.version },
              ]}
            />
            <p className="sup-muted sup-clip">
              Endereço <code>{endpoint.origin}</code>
            </p>
          </>
        ) : null}
      </SettingCard>
      <InlinePanel
        open={connectionOpen && endpoint !== null}
        title="Alterar conexão"
        onClose={() => !busy && setConnectionOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost btn-md"
              disabled={busy}
              onClick={() => setConnectionOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="onr-connection-form"
              className="btn btn-primary btn-md"
              disabled={busy || !changed}
            >
              {restoring ? "Revisar restauração" : "Revisar e salvar"}
            </button>
          </>
        }
      >
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        {endpoint && (
          <form
            id="onr-connection-form"
            noValidate
            autoComplete="off"
            className="sup-form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              review();
            }}
          >
            <div className="sup-span">
              <RolePicker<Mode>
                label="Origem das consultas"
                value={mode}
                options={MODES}
                disabled={busy}
                onChange={(next) => {
                  setMode(next);
                  setSubmitted(false);
                }}
              />
            </div>
            {mode === "proxy" ? (
              <>
                <div className="form-field sup-span">
                  <label className="form-field-label" htmlFor="onr-origin">
                    URL raiz do Worker
                  </label>
                  <input
                    id="onr-origin"
                    className="input"
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={255}
                    placeholder={WORKER_EXAMPLE}
                    value={origin}
                    disabled={busy}
                    aria-invalid={
                      submitted && check.errors.origin ? true : undefined
                    }
                    onChange={(event) => setOrigin(event.target.value)}
                  />
                  {submitted && check.errors.origin ? (
                    <span className="form-hint sup-error" role="alert">
                      {check.errors.origin}
                    </span>
                  ) : (
                    <span className="form-hint">
                      HTTPS em um Worker sec-devchamps.workers.dev, sem caminho.
                    </span>
                  )}
                </div>
                <div className="form-field sup-span">
                  <label className="form-field-label" htmlFor="onr-key">
                    Chave do Worker
                  </label>
                  {keyConfigured && !replaceKey ? (
                    <div className="sup-ed-keep">
                      <span>
                        <span aria-hidden="true">●●●●●●●●●●●●</span> Guardada no
                        cofre
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={busy}
                        onClick={() => setReplaceKey(true)}
                      >
                        Trocar chave
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        id="onr-key"
                        className="input"
                        type="password"
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={256}
                        value={key}
                        disabled={busy}
                        aria-invalid={
                          submitted && check.errors.key ? true : undefined
                        }
                        onChange={(event) => setKey(event.target.value)}
                      />
                      {submitted && check.errors.key ? (
                        <span className="form-hint sup-error" role="alert">
                          {check.errors.key}
                        </span>
                      ) : (
                        <span className="form-hint">
                          Enviada uma vez, cifrada e nunca mostrada de novo.
                        </span>
                      )}
                      {keyConfigured && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm sup-ed-link"
                          disabled={busy}
                          onClick={() => {
                            setReplaceKey(false);
                            setKey("");
                          }}
                        >
                          Manter a chave atual
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : endpoint.mode === "proxy" ? (
              <p className="alert alert-warning sup-span">
                Voltar para <code>{OFFICIAL_ORIGIN}</code> remove a chave do
                proxy do cofre.
              </p>
            ) : (
              <p className="sup-muted sup-span">
                Esta conta já consulta o portal original.
              </p>
            )}
          </form>
        )}
      </InlinePanel>
    </>
  );
}
