import { useMemo, useState, type ReactNode } from "react";
import {
  ApiError,
  applyApplicationBulkChange,
  previewApplicationBulkChange,
  type ApplicationBulkChanges,
  type ApplicationBulkPreview,
  type ApplicationBulkResult,
} from "./api";
import {
  applicationPermissionDescription,
  applicationPermissionLabel,
} from "./display-labels";
import { uuidv7 } from "./uuidv7";
import "./organization-applications-directory.css";

type Application = {
  id: string;
  name: string;
  status: string;
  permissions: string[];
};
type Permission = { code: string; description: string };
type Decision = "none" | "grant" | "revoke";

type Props = {
  organizationId: string;
  organizationName: string;
  applications: Application[];
  permissions: Permission[];
  canManage: boolean;
  csrfToken: string;
  onOpen: (id: string) => void;
  onChanged: () => void;
  onUnauthorized: () => void;
  createForm: ReactNode;
};

function statusLabel(status: string): string {
  if (status === "active") return "Ativa";
  if (status === "suspended") return "Suspensa";
  return "Estado não informado";
}

function outcomeLabel(
  outcome: ApplicationBulkResult["items"][number]["outcome"],
): string {
  if (outcome === "applied") return "Alterada";
  if (outcome === "no_change") return "Sem alteração";
  if (outcome === "conflict") return "Conflito de versão";
  if (outcome === "blocked") return "Bloqueada";
  return "Não encontrada";
}

function reasonLabel(reason: string | null | undefined): string | null {
  if (!reason) return null;
  const known: Record<string, string> = {
    inactive_application: "A aplicação já está suspensa.",
    application_unavailable: "A aplicação não está disponível.",
    organization_inactive: "A parceria está suspensa.",
    state_changed: "A aplicação mudou após a prévia. Revise novamente.",
    permission_unavailable:
      "Uma permissão deixou de estar disponível. Gere nova prévia.",
  };
  return (
    known[reason] ??
    "Não foi possível aplicar esta alteração. Atualize a lista e tente novamente."
  );
}

function permissionTransition(current: string[], next: string[]): string {
  const granted = next.filter((code) => !current.includes(code));
  const revoked = current.filter((code) => !next.includes(code));
  const parts = [];
  if (granted.length)
    parts.push(
      `Conceder: ${granted.map(applicationPermissionLabel).join(", ")}`,
    );
  if (revoked.length)
    parts.push(
      `Revogar: ${revoked.map(applicationPermissionLabel).join(", ")}`,
    );
  return parts.join(" · ") || "Permissões mantidas";
}

function previewHasChange(
  item: ApplicationBulkPreview["items"][number],
): boolean {
  return (
    item.current_status !== item.next_status ||
    item.current_permissions.length !== item.next_permissions.length ||
    item.current_permissions.some(
      (code) => !item.next_permissions.includes(code),
    )
  );
}

function PermissionIcon({ code }: { code: string }) {
  const shapes: Record<string, ReactNode> = {
    "application:read": (
      <>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M4 9h16M9 9v10" />
      </>
    ),
    "analysis:read": (
      <>
        <path d="M6 3h9l3 3v15H6zM15 3v4h4M9 11h6M9 15h6" />
      </>
    ),
    "analysis:submit:upload": (
      <>
        <path d="M5 15v5h14v-5M12 16V4m-4 4 4-4 4 4" />
      </>
    ),
    "analysis:create": (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M11 7v8m-4-4h8M16 16l5 5" />
      </>
    ),
    "analysis:write": (
      <>
        <path d="M5 3h11l3 3v14H5zM15 3v4h4M8 16l6-6 2 2-6 6H8z" />
      </>
    ),
    "registry:read": (
      <>
        <path d="M3 9 12 4l9 5M5 10h14M7 11v8m5-8v8m5-8v8M4 21h16" />
      </>
    ),
    "registry:create": (
      <>
        <path d="M5 4h10l4 4v12H5zM15 4v5h4M9 14h6m-3-3v6" />
      </>
    ),
    "registry:write": (
      <>
        <path d="M4 5h12l4 4v11H4zM16 5v5h4M8 16l6-6 2 2-6 6H8z" />
      </>
    ),
  };
  return (
    <span
      className="organization-applications-permission-icon"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {shapes[code] ?? (
          <path d="M12 3 4 7v6c0 4.5 3 7 8 9 5-2 8-4.5 8-9V7z" />
        )}
      </svg>
    </span>
  );
}

export function OrganizationApplicationsDirectory({
  organizationId,
  organizationName,
  applications,
  permissions,
  canManage,
  csrfToken,
  onOpen,
  onChanged,
  onUnauthorized,
  createForm,
}: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<"list" | "create" | "bulk">("list");
  const [statusEnabled, setStatusEnabled] = useState(false);
  const [nextStatus, setNextStatus] = useState<"active" | "suspended">(
    "active",
  );
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [preview, setPreview] = useState<ApplicationBulkPreview | null>(null);
  const [result, setResult] = useState<ApplicationBulkResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const visible = useMemo(
    () =>
      applications.filter((item) => {
        const matchesText = item.name
          .toLocaleLowerCase("pt-BR")
          .includes(query.trim().toLocaleLowerCase("pt-BR"));
        return matchesText && (filter === "all" || item.status === filter);
      }),
    [applications, query, filter],
  );
  const selectedApps = applications.filter((item) =>
    selected.includes(item.id),
  );
  const canSelectMore = selected.length < 50;
  const allVisibleSelected =
    visible.length > 0 && visible.every((item) => selected.includes(item.id));
  const hiddenSelectedCount = selected.filter(
    (id) => !visible.some((item) => item.id === id),
  ).length;
  const canSelectAllVisible =
    visible.length > 0 && visible.length + hiddenSelectedCount <= 50;

  function changeSelection(id: string, checked: boolean) {
    setSelected((current) =>
      checked
        ? current.length < 50
          ? [...current, id]
          : current
        : current.filter((value) => value !== id),
    );
    setPreview(null);
    setResult(null);
    setError("");
  }

  function selectVisible(checked: boolean) {
    setSelected((current) =>
      checked
        ? Array.from(new Set([...current, ...visible.map((item) => item.id)]))
        : current.filter((id) => !visible.some((item) => item.id === id)),
    );
    setPreview(null);
    setResult(null);
  }

  function changeDecision(code: string, decision: Decision) {
    setDecisions((current) => ({ ...current, [code]: decision }));
    setPreview(null);
    setResult(null);
    setError("");
  }

  function buildChanges(): ApplicationBulkChanges {
    const changes: ApplicationBulkChanges = {};
    if (statusEnabled) changes.status = nextStatus;
    const grants = permissions
      .filter((item) => decisions[item.code] === "grant")
      .map((item) => item.code);
    const revokes = permissions
      .filter((item) => decisions[item.code] === "revoke")
      .map((item) => item.code);
    if (grants.length) changes.grant_permissions = grants;
    if (revokes.length) changes.revoke_permissions = revokes;
    return changes;
  }

  async function requestPreview() {
    if (selected.length < 2 || selected.length > 50)
      return setError("Selecione entre 2 e 50 aplicações.");
    const changes = buildChanges();
    if (
      !changes.status &&
      !changes.grant_permissions?.length &&
      !changes.revoke_permissions?.length
    )
      return setError("Escolha pelo menos um campo para alterar.");
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await previewApplicationBulkChange(
        organizationId,
        selected,
        changes,
        csrfToken,
        uuidv7(),
      );
      setPreview(response);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else if (cause instanceof ApiError && cause.status === 409)
        setError(
          "As aplicações mudaram durante a preparação. Atualize a parceria e revise novamente.",
        );
      else
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível preparar a prévia. Tente novamente.",
        );
    } finally {
      setBusy(false);
    }
  }

  async function applyChanges() {
    if (!preview || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await applyApplicationBulkChange(
        organizationId,
        preview.preview_id,
        preview.confirmation_hash,
        csrfToken,
      );
      setResult(response);
      setPreview(null);
      onChanged();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else {
        if (
          cause instanceof ApiError &&
          (cause.status === 409 || cause.status === 410)
        ) {
          setPreview(null);
          setError(
            "A prévia expirou ou os dados mudaram. Confira as aplicações e gere uma nova prévia.",
          );
        } else
          setError(
            cause instanceof ApiError
              ? cause.detail
              : "Não foi possível aplicar as alterações. Consulte o estado atual e tente novamente.",
          );
      }
    } finally {
      setBusy(false);
    }
  }

  if (mode === "create") {
    return (
      <section className="organization-applications-directory">
        <button
          type="button"
          className="back-link"
          onClick={() => setMode("list")}
        >
          ← Voltar às aplicações
        </button>
        {createForm}
      </section>
    );
  }

  return (
    <section
      className="organization-applications-directory"
      aria-labelledby="organization-applications-title"
    >
      <header className="organization-applications-heading">
        <div>
          <p className="eyebrow">{organizationName}</p>
          <h3 id="organization-applications-title">Aplicações</h3>
          <p>
            Abra uma integração para configurar webhooks, entregas e
            credenciais.
          </p>
        </div>
        {canManage && createForm && mode === "list" && (
          <button
            type="button"
            className="button primary"
            onClick={() => setMode("create")}
          >
            ＋ Nova aplicação
          </button>
        )}
      </header>

      {mode === "list" ? (
        <>
          <div className="organization-applications-toolbar">
            <label>
              <span>Buscar aplicação</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar pelo nome"
              />
            </label>
            <label>
              <span>Estado</span>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="all">Todos os estados</option>
                <option value="active">Ativas</option>
                <option value="suspended">Suspensas</option>
              </select>
            </label>
          </div>
          <p className="organization-applications-count">
            {visible.length}{" "}
            {visible.length === 1 ? "aplicação exibida" : "aplicações exibidas"}
            {selected.length > 0 ? ` · ${selected.length} selecionadas` : ""}
          </p>
          {canManage && !canSelectAllVisible && visible.length > 0 && (
            <p className="organization-applications-selection-hint">
              Para selecionar todas, refine a lista ou limpe a seleção. O lote
              aceita até 50 aplicações.
            </p>
          )}
          {visible.length === 0 ? (
            <div className="organization-applications-empty">
              <h4>Nenhuma aplicação encontrada</h4>
              <p>
                {applications.length
                  ? "Ajuste a busca ou o estado."
                  : "Cadastre a primeira aplicação desta parceria."}
              </p>
            </div>
          ) : (
            <div className="organization-applications-table-wrap">
              <table className="organization-applications-table">
                <thead>
                  <tr>
                    {canManage && (
                      <th
                        scope="col"
                        className="organization-applications-check"
                      >
                        <input
                          type="checkbox"
                          aria-label="Selecionar todas as aplicações exibidas"
                          checked={allVisibleSelected}
                          disabled={!allVisibleSelected && !canSelectAllVisible}
                          onChange={(event) =>
                            selectVisible(event.target.checked)
                          }
                        />
                      </th>
                    )}
                    <th scope="col">Aplicação</th>
                    <th scope="col">Permissões</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item) => (
                    <tr key={item.id}>
                      {canManage && (
                        <td className="organization-applications-check">
                          <input
                            type="checkbox"
                            aria-label={`Selecionar ${item.name}`}
                            checked={selected.includes(item.id)}
                            disabled={
                              !selected.includes(item.id) && !canSelectMore
                            }
                            onChange={(event) =>
                              changeSelection(item.id, event.target.checked)
                            }
                          />
                        </td>
                      )}
                      <td>
                        <button
                          type="button"
                          className="organization-applications-name"
                          onClick={() => onOpen(item.id)}
                        >
                          <span aria-hidden="true">
                            {item.name.slice(0, 1).toLocaleUpperCase("pt-BR")}
                          </span>
                          <strong>{item.name}</strong>
                        </button>
                      </td>
                      <td
                        className="organization-applications-permissions"
                        data-label="Permissões"
                      >
                        {item.permissions.length}{" "}
                        {item.permissions.length === 1
                          ? "concedida"
                          : "concedidas"}
                      </td>
                      <td data-label="Estado">
                        <span
                          className={`organization-applications-status is-${item.status === "active" ? "active" : "suspended"}`}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="organization-applications-open"
                          onClick={() => onOpen(item.id)}
                        >
                          Abrir →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {canManage && selected.length > 0 && (
            <div className="organization-applications-selection">
              <span>
                <strong>{selected.length}</strong> selecionadas · limite de 50
                {hiddenSelectedCount > 0 && (
                  <small>
                    {hiddenSelectedCount} fora do filtro atual; também serão
                    incluídas na edição.
                  </small>
                )}
              </span>
              <div>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setSelected([])}
                >
                  Limpar seleção
                </button>
                <button
                  type="button"
                  className="button primary"
                  disabled={selected.length < 2}
                  onClick={() => {
                    setMode("bulk");
                    setError("");
                  }}
                >
                  Editar em massa
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <button
            type="button"
            className="back-link"
            onClick={() => {
              setMode("list");
              setPreview(null);
              setResult(null);
              setError("");
            }}
          >
            ← Voltar às aplicações
          </button>
          <div className="organization-applications-bulk-head">
            <h4>Edição em massa</h4>
            <p>
              {selectedApps.length} aplicações selecionadas. Escolha somente os
              campos que deseja alterar.
            </p>
          </div>
          {result ? (
            <div className="organization-applications-result" role="status">
              <h5>Resultado por aplicação</h5>
              <p className="organization-applications-result-summary">
                {result.affected_count} de {result.selected_count} aplicações
                alteradas. Confira o resultado individual abaixo.
              </p>
              <ul>
                {result.items.map((item) => (
                  <li key={item.application_id}>
                    <strong>
                      {applications.find(
                        (app) => app.id === item.application_id,
                      )?.name ?? "Aplicação indisponível"}
                    </strong>
                    <span
                      className={`organization-applications-outcome is-${item.outcome}`}
                    >
                      <span aria-hidden="true">
                        {item.outcome === "applied"
                          ? "✓"
                          : item.outcome === "no_change"
                            ? "−"
                            : "!"}
                      </span>
                      {outcomeLabel(item.outcome)}
                    </span>
                    {reasonLabel(item.reason) && (
                      <small>{reasonLabel(item.reason)}</small>
                    )}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="button primary"
                onClick={() => {
                  setMode("list");
                  setSelected([]);
                  setResult(null);
                }}
              >
                Concluir
              </button>
            </div>
          ) : (
            <>
              <div className="organization-applications-bulk-fields">
                <div className="organization-applications-status-field">
                  <label>
                    <input
                      type="checkbox"
                      checked={statusEnabled}
                      onChange={(event) => {
                        setStatusEnabled(event.target.checked);
                        setPreview(null);
                      }}
                    />{" "}
                    Alterar estado
                  </label>
                  <select
                    disabled={!statusEnabled}
                    value={nextStatus}
                    onChange={(event) => {
                      setNextStatus(
                        event.target.value as "active" | "suspended",
                      );
                      setPreview(null);
                    }}
                  >
                    <option value="active">Ativa</option>
                    <option value="suspended">Suspensa</option>
                  </select>
                </div>
                <fieldset>
                  <legend>Permissões</legend>
                  <p>
                    Defina separadamente o que conceder ou revogar. “Não
                    alterar” mantém cada aplicação como está.
                  </p>
                  {permissions.map((permission) => (
                    <div
                      className="organization-applications-permission-row"
                      key={permission.code}
                    >
                      <PermissionIcon code={permission.code} />
                      <span>
                        <strong>
                          {applicationPermissionLabel(permission.code)}
                        </strong>
                        <small>
                          {applicationPermissionDescription(
                            permission.code,
                            permission.description,
                          )}
                        </small>
                      </span>
                      <select
                        aria-label={`${applicationPermissionLabel(permission.code)}: ação`}
                        value={decisions[permission.code] ?? "none"}
                        onChange={(event) =>
                          changeDecision(
                            permission.code,
                            event.target.value as Decision,
                          )
                        }
                      >
                        <option value="none">Não alterar</option>
                        <option value="grant">Conceder</option>
                        <option value="revoke">Revogar</option>
                      </select>
                    </div>
                  ))}
                  {decisions["application:read"] === "revoke" && (
                    <p className="organization-applications-access-warning">
                      Revogar “Consultar integração” impede que a credencial da
                      aplicação consulte seus próprios dados.
                    </p>
                  )}
                </fieldset>
              </div>
              {error && (
                <p className="organization-applications-error" role="alert">
                  {error}
                </p>
              )}
              {!preview ? (
                <button
                  type="button"
                  className="button primary"
                  disabled={busy}
                  onClick={() => void requestPreview()}
                >
                  {busy ? "Preparando…" : "Revisar alterações"}
                </button>
              ) : (
                <div
                  className="organization-applications-preview"
                  aria-live="polite"
                >
                  <div className="organization-applications-preview-head">
                    <h5>Confira antes de aplicar</h5>
                    <p>
                      {preview.selected_count} aplicações selecionadas ·{" "}
                      {preview.affected_count} com mudanças · prévia válida até{" "}
                      {new Date(preview.expires_at).toLocaleTimeString(
                        "pt-BR",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </p>
                  </div>
                  <p className="organization-applications-preview-summary">
                    {preview.affected_count} com mudanças;{" "}
                    {preview.items.filter((item) => !item.can_apply).length}{" "}
                    exigem atenção;{" "}
                    {
                      preview.items.filter(
                        (item) => item.can_apply && !previewHasChange(item),
                      ).length
                    }{" "}
                    sem alteração.
                  </p>
                  <ul>
                    {preview.items.map((item) => (
                      <li key={item.application_id}>
                        <strong>{item.name}</strong>
                        <span>
                          {item.current_status === item.next_status
                            ? `Mantém ${statusLabel(item.current_status).toLowerCase()}`
                            : `${statusLabel(item.current_status)} → ${statusLabel(item.next_status)}`}
                        </span>
                        <small>
                          {permissionTransition(
                            item.current_permissions,
                            item.next_permissions,
                          )}
                        </small>
                        <em>
                          {item.can_apply
                            ? previewHasChange(item)
                              ? "✓ Pode aplicar"
                              : "Sem alteração"
                            : (reasonLabel(item.reason) ?? "Não pode aplicar")}
                        </em>
                      </li>
                    ))}
                  </ul>
                  <div className="organization-applications-preview-actions">
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => setPreview(null)}
                    >
                      Revisar campos
                    </button>
                    <button
                      type="button"
                      className="button primary"
                      disabled={busy || preview.affected_count === 0}
                      onClick={() => void applyChanges()}
                    >
                      {busy ? "Aplicando…" : "Confirmar alterações"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
