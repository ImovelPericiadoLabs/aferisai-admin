import { useMemo, useState, type ReactNode } from "react";
import {
  ApiError,
  applyApplicationBulkChange,
  previewApplicationBulkChange,
  type ApplicationBulkPreview,
  type ApplicationBulkResult,
} from "./api";
import {
  buildBulkChanges,
  type Application,
  type Decision,
  type Permission,
} from "./application-directory-model";
import { ApplicationBulkChangeForm } from "./ApplicationBulkChangeForm";
import { ApplicationBulkPreviewPanel } from "./ApplicationBulkPreviewPanel";
import { ApplicationBulkResultPanel } from "./ApplicationBulkResultPanel";
import { ApplicationDirectoryList } from "./ApplicationDirectoryList";
import { uuidv7 } from "./uuidv7";
import "./application-directory.css";

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

  async function requestPreview() {
    if (selected.length < 2 || selected.length > 50)
      return setError("Selecione entre 2 e 50 aplicações.");
    const changes = buildBulkChanges(
      permissions,
      decisions,
      statusEnabled,
      nextStatus,
    );
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
      <section className="appdir">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setMode("list")}
        >
          Cancelar cadastro
        </button>
        {createForm}
      </section>
    );
  }

  const backToList = () => {
    setMode("list");
    setPreview(null);
    setResult(null);
    setError("");
  };

  return (
    <section
      className="appdir"
      aria-labelledby={mode === "list" ? "appdir-title" : undefined}
      aria-label={mode === "list" ? undefined : "Edição em massa de aplicações"}
    >
      {mode === "list" && (
        <header className="appdir-head">
          <div>
            <h2 className="appdir-title" id="appdir-title">
              Aplicações
            </h2>
            <p className="page-subtitle">
              Abra uma integração de {organizationName} para configurar
              webhooks, entregas e credenciais.
            </p>
          </div>
          {canManage && createForm && mode === "list" && (
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => setMode("create")}
            >
              <span aria-hidden="true">＋</span> Nova aplicação
            </button>
          )}
        </header>
      )}

      {mode === "list" ? (
        <>
          <ApplicationDirectoryList
            applications={applications}
            visible={visible}
            selected={selected}
            query={query}
            filter={filter}
            canManage={canManage}
            canSelectMore={canSelectMore}
            canSelectAllVisible={canSelectAllVisible}
            allVisibleSelected={allVisibleSelected}
            hiddenSelectedCount={hiddenSelectedCount}
            onQuery={setQuery}
            onFilter={setFilter}
            onSelectVisible={selectVisible}
            onChangeSelection={changeSelection}
            onClearSelection={() => setSelected([])}
            onBulk={() => {
              setMode("bulk");
              setError("");
            }}
            onOpen={onOpen}
          />
        </>
      ) : (
        <>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={backToList}
          >
            Cancelar edição em massa
          </button>
          <div className="appdir-bulk-head">
            <h3>Edição em massa</h3>
            <p className="page-subtitle">
              {selectedApps.length} aplicações selecionadas. Escolha somente os
              campos que deseja alterar.
            </p>
          </div>
          {result ? (
            <ApplicationBulkResultPanel
              result={result}
              applications={applications}
              onFinish={() => {
                setMode("list");
                setSelected([]);
                setResult(null);
              }}
            />
          ) : (
            <>
              <ApplicationBulkChangeForm
                permissions={permissions}
                decisions={decisions}
                statusEnabled={statusEnabled}
                nextStatus={nextStatus}
                onStatusEnabled={(checked) => {
                  setStatusEnabled(checked);
                  setPreview(null);
                }}
                onNextStatus={(status) => {
                  setNextStatus(status);
                  setPreview(null);
                }}
                onDecision={changeDecision}
              />
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
              {!preview ? (
                <div className="appdir-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-md"
                    disabled={busy}
                    onClick={() => void requestPreview()}
                  >
                    {busy ? "Preparando…" : "Revisar alterações"}
                  </button>
                </div>
              ) : (
                <ApplicationBulkPreviewPanel
                  preview={preview}
                  busy={busy}
                  onRevise={() => setPreview(null)}
                  onApply={() => void applyChanges()}
                />
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
