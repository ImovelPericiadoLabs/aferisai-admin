import { useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  createAnalysisProviderAccount,
  listAnalysisProviderAccounts,
  suspendAnalysisProviderAccount,
  updateAnalysisProviderLimits,
  type AnalysisProviderAccount,
  type AnalysisProviderKind,
  type AnalysisProviderLimits,
} from "./api";
import "./analysis-providers.css";

const kindLabels: Record<AnalysisProviderKind, string> = {
  vertex_service_account: "Gemini · conta de serviço",
  gemini_api_key: "Gemini · chave de API",
  openai_api_key: "OpenAI · chave de API",
  openai_compatible: "API compatível com OpenAI",
};

const poolExamples: Record<AnalysisProviderKind, string> = {
  vertex_service_account: "gcp:ID_DO_PROJETO",
  gemini_api_key: "gcp:ID_DO_PROJETO",
  openai_api_key: "openai:CONTA",
  openai_compatible: "custom:SERVICO",
};

const initialLimits: AnalysisProviderLimits = {
  max_concurrent: 1,
  daily_limit: 100,
  rpm: 10,
  tpm: 10000,
  daily_cost_cents: 1000,
  priority: 100,
};

function accountLimits(
  account: AnalysisProviderAccount,
): AnalysisProviderLimits {
  const { max_concurrent, daily_limit, rpm, tpm, daily_cost_cents, priority } =
    account;
  return { max_concurrent, daily_limit, rpm, tpm, daily_cost_cents, priority };
}

function errorText(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.status === 404 || cause.status === 501)
      return "A gestão de provedores ainda não está disponível nesta API.";
    return cause.detail;
  }
  return "Não foi possível consultar a API. Tente novamente.";
}

function LimitFields({
  value,
  onChange,
}: {
  value: AnalysisProviderLimits;
  onChange: (value: AnalysisProviderLimits) => void;
}) {
  const fields: {
    key: keyof AnalysisProviderLimits;
    label: string;
    min: number;
  }[] = [
    { key: "max_concurrent", label: "Chamadas simultâneas", min: 1 },
    { key: "daily_limit", label: "Chamadas por dia UTC", min: 1 },
    { key: "rpm", label: "Requisições por minuto", min: 1 },
    { key: "tpm", label: "Tokens por minuto", min: 1 },
    { key: "daily_cost_cents", label: "Teto diário (centavos)", min: 1 },
    { key: "priority", label: "Prioridade (menor primeiro)", min: 0 },
  ];
  return (
    <div className="provider-limits">
      {fields.map(({ key, label, min }) => (
        <label key={key}>
          {label}
          <input
            type="number"
            min={min}
            step="1"
            required
            value={value[key]}
            onChange={(event) =>
              onChange({ ...value, [key]: Number(event.target.value) })
            }
          />
        </label>
      ))}
    </div>
  );
}

function AccountRow({
  account,
  csrf,
  reload,
  onUnauthorized,
}: {
  account: AnalysisProviderAccount;
  csrf: string;
  reload: () => Promise<void>;
  onUnauthorized: () => void;
}) {
  const [limits, setLimits] = useState(() => accountLimits(account));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await updateAnalysisProviderLimits(
        account.id,
        limits,
        account.version,
        reason.trim(),
        csrf,
      );
      setReason("");
      await reload();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }

  async function suspend() {
    if (!reason.trim()) {
      setError("Informe o motivo da suspensão.");
      return;
    }
    if (!window.confirm(`Suspender a conta ${account.label}?`)) return;
    setBusy(true);
    setError("");
    try {
      await suspendAnalysisProviderAccount(
        account.id,
        account.version,
        reason.trim(),
        csrf,
      );
      setReason("");
      await reload();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="provider-card">
      <div className="provider-card-title">
        <div>
          <h3>{account.label}</h3>
          <p className="muted">
            {kindLabels[account.kind]} · {account.model}
          </p>
          {account.location && (
            <p className="muted">Região: {account.location}</p>
          )}
          <p className="muted">
            Pool de capacidade: {account.pool_key} · prioridade{" "}
            {account.priority}
          </p>
          {account.base_url && (
            <p className="muted">Endpoint: {account.base_url}</p>
          )}
        </div>
        <span
          className={`pill ${account.status === "active" ? "success" : "warning"}`}
        >
          {account.status === "active"
            ? "Ativa"
            : account.status === "draft"
              ? "Rascunho"
              : "Suspensa"}
        </span>
      </div>
      <p className="fine-print">
        A credencial não pode ser visualizada. Referência:{" "}
        {account.credential_hint} · versão {account.version} · ID: {account.id}
      </p>
      {account.status === "draft" && (
        <p className="fine-print">
          Esta conta ainda não executa análises. A reserva de capacidade e o
          perfil comercial precisam ser concluídos no backend.
        </p>
      )}
      {account.status !== "suspended" && (
        <form onSubmit={(event) => void save(event)} className="provider-form">
          <LimitFields value={limits} onChange={setLimits} />
          <label>
            Motivo da alteração
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
              minLength={10}
              maxLength={500}
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="provider-actions">
            <button
              className="button primary"
              disabled={busy || !reason.trim()}
            >
              Salvar limites
            </button>
            <button
              className="button secondary"
              type="button"
              disabled={busy}
              onClick={() => void suspend()}
            >
              Suspender conta
            </button>
          </div>
        </form>
      )}
    </article>
  );
}

export function AnalysisProviders({
  csrf,
  onUnauthorized,
}: {
  csrf: string;
  onUnauthorized: () => void;
}) {
  const [items, setItems] = useState<AnalysisProviderAccount[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<AnalysisProviderKind>(
    "vertex_service_account",
  );
  const [model, setModel] = useState("");
  const [location, setLocation] = useState("");
  const [poolKey, setPoolKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [credential, setCredential] = useState("");
  const [limits, setLimits] = useState(initialLimits);
  const [reason, setReason] = useState("");

  async function load(nextCursor?: string) {
    setLoading(true);
    setError("");
    try {
      const result = await listAnalysisProviderAccounts(nextCursor);
      setAvailable(true);
      setItems((previous) =>
        nextCursor ? [...previous, ...result.items] : result.items,
      );
      setCursor(result.next_cursor);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      if (
        cause instanceof ApiError &&
        (cause.status === 404 || cause.status === 501)
      )
        setAvailable(false);
      setError(errorText(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let live = true;
    void listAnalysisProviderAccounts()
      .then((result) => {
        if (!live) return;
        setItems(result.items);
        setCursor(result.next_cursor);
      })
      .catch((cause: unknown) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        if (
          cause instanceof ApiError &&
          (cause.status === 404 || cause.status === 501)
        )
          setAvailable(false);
        setError(errorText(cause));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [onUnauthorized]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await createAnalysisProviderAccount(
        {
          label: label.trim(),
          kind,
          model: model.trim(),
          location: location.trim() || "global",
          pool_key: poolKey.trim(),
          base_url: baseUrl.trim() || null,
          secret: credential,
          ...limits,
          reason: reason.trim(),
        },
        csrf,
      );
      setCredential("");
      setLabel("");
      setReason("");
      await load();
    } catch (cause) {
      // A lost response can hide a completed creation. Refresh before trying again.
      setCredential("");
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      setError(
        `${errorText(cause)} Atualize a lista antes de uma nova tentativa.`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function chooseFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 64 * 1024) {
      setError("O arquivo da conta de serviço deve ter até 64 KiB.");
      return;
    }
    try {
      const value = await file.text();
      JSON.parse(value);
      setCredential(value);
      setError("");
    } catch {
      setError("O arquivo da conta de serviço precisa conter JSON válido.");
    }
  }

  return (
    <div className="content">
      <header className="page-head">
        <div>
          <p className="eyebrow">Configuração interna</p>
          <h1>Provedores de análise</h1>
          <p className="muted">
            Cadastre várias contas Gemini, OpenAI ou de APIs compatíveis. Cada
            cadastro fica em rascunho até a validação de perfil, custo e
            capacidade no backend.
          </p>
        </div>
        <button
          className="button secondary"
          disabled={loading}
          onClick={() => void load()}
        >
          Atualizar
        </button>
      </header>
      <p className="provider-notice">
        As contas cadastradas ainda não são usadas pelo worker. A troca
        automática entre contas ou fornecedores não está ativa. Após uma chamada
        de resultado incerto, outra conta não pode repetir o pedido sem
        conciliação. Contas Gemini no projeto compartilhado com o Imovel devem
        respeitar o limite conjunto observado de 12 chamadas.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {available && (
        <section
          className="provider-card"
          aria-labelledby="provider-create-title"
        >
          <h2 id="provider-create-title">Adicionar conta</h2>
          <form
            className="provider-form"
            onSubmit={(event) => void submit(event)}
          >
            <div className="provider-grid">
              <label>
                Nome interno
                <input
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  required
                  maxLength={100}
                />
              </label>
              <label>
                Provedor
                <select
                  value={kind}
                  onChange={(event) => {
                    setKind(event.target.value as AnalysisProviderKind);
                    setCredential("");
                  }}
                >
                  {Object.entries(kindLabels).map(([value, text]) => (
                    <option value={value} key={value}>
                      {text}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Modelo
                <input
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  required
                  maxLength={100}
                  placeholder="Ex.: gpt-5.4-mini"
                />
              </label>
              <label>
                Região/localidade
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder={
                    kind === "vertex_service_account"
                      ? "Ex.: us-central1"
                      : "global"
                  }
                  maxLength={80}
                  required={kind === "vertex_service_account"}
                />
              </label>
              <label>
                Pool de capacidade compartilhada
                <input
                  value={poolKey}
                  onChange={(event) => setPoolKey(event.target.value)}
                  required
                  minLength={3}
                  maxLength={160}
                  pattern="[A-Za-z0-9._:-]+"
                  placeholder={poolExamples[kind]}
                />
              </label>
              {kind === "openai_compatible" && (
                <label>
                  URL base HTTPS
                  <input
                    type="url"
                    value={baseUrl}
                    onChange={(event) => setBaseUrl(event.target.value)}
                    required
                    placeholder="https://api.exemplo.com/v1"
                  />
                </label>
              )}
            </div>
            <p className="fine-print">
              Contas do mesmo projeto GCP usam o mesmo pool{" "}
              <code>gcp:ID_DO_PROJETO</code>. Para conta de serviço, o ID deve
              coincidir com o arquivo JSON. OpenAI usa <code>openai:CONTA</code>
              ; API compatível usa <code>custom:SERVICO</code>.
            </p>
            {kind === "vertex_service_account" ? (
              <label>
                Arquivo JSON da conta de serviço
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(event) => void chooseFile(event.target.files?.[0])}
                  required={!credential}
                />
              </label>
            ) : (
              <label>
                Chave ou token
                <input
                  type="password"
                  autoComplete="off"
                  value={credential}
                  onChange={(event) => setCredential(event.target.value)}
                  required
                />
              </label>
            )}
            <p className="fine-print">
              O segredo é enviado uma vez à API e não aparece na listagem. Não o
              inclua no nome, modelo ou motivo.
            </p>
            <LimitFields value={limits} onChange={setLimits} />
            <label>
              Motivo do cadastro
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                required
                minLength={10}
                maxLength={500}
              />
            </label>
            <button className="button primary" disabled={busy || !credential}>
              {busy ? "Salvando…" : "Adicionar conta"}
            </button>
          </form>
        </section>
      )}
      <section aria-labelledby="provider-list-title">
        <h2 id="provider-list-title">Contas cadastradas</h2>
        {loading && items.length === 0 ? (
          <p className="muted">Carregando contas…</p>
        ) : items.length === 0 && available ? (
          <p className="empty-state">Nenhuma conta cadastrada.</p>
        ) : null}
        <div className="provider-list">
          {items.map((item) => (
            <AccountRow
              key={`${item.id}:${item.version}`}
              account={item}
              csrf={csrf}
              reload={() => load()}
              onUnauthorized={onUnauthorized}
            />
          ))}
        </div>
        {cursor && (
          <button
            className="button secondary"
            disabled={loading}
            onClick={() => void load(cursor)}
          >
            Carregar mais
          </button>
        )}
      </section>
    </div>
  );
}
