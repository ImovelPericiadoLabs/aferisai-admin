import { useCallback, useState } from "react";
import {
  ApiError,
  changeOrganizationStatus,
  listOrganizationEvents,
  setOrganizationCnpj,
} from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import { ManagementHistory } from "./ManagementHistory";
import { statusCopy, validateCnpj } from "./management-model";
import type { ToastKind } from "./useToast";

type Dialog = null | "status" | "cnpj";

export function OrganizationAdmin({
  organizationId,
  organizationName,
  status,
  cnpjMasked,
  csrf,
  onChanged,
  onUnauthorized,
  onToast,
}: {
  organizationId: string;
  organizationName: string;
  status: string;
  cnpjMasked: string | null | undefined;
  csrf: string;
  onChanged: () => Promise<void>;
  onUnauthorized: () => void;
  onToast: (message: string, tone: ToastKind) => void;
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [cnpj, setCnpj] = useState("");
  const [cnpjEditable, setCnpjEditable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const next = status === "active" ? "suspended" : "active";
  const copy = statusCopy("organization", next);
  const cnpjCheck = cnpj.trim() === "" ? null : validateCnpj(cnpj);
  const loadHistory = useCallback(
    (cursor?: string) => listOrganizationEvents(organizationId, cursor),
    [organizationId],
  );

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      setDialog(null);
      setCnpj("");
      setCnpjEditable(false);
      onToast(success, "success");
      await onChanged();
    } catch (cause) {
      setDialog(null);
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else {
        onToast(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível concluir a ação. Atualize a tela e confira.",
          "error",
        );
        await onChanged().catch(() => undefined);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card org-admin" aria-labelledby="org-admin-title">
      <div className="card-header">
        <h2 className="card-title" id="org-admin-title">
          Administração da parceria
        </h2>
        <span className="badge badge-neutral">Administrador</span>
      </div>
      <div className="card-body">
        <dl className="org-admin-rows">
          <div>
            <dt>Estado</dt>
            <dd>
              <span
                className={`badge ${status === "active" ? "badge-success" : "badge-warning"}`}
              >
                {status === "active" ? "Ativa" : "Suspensa"}
              </span>
            </dd>
            <button
              type="button"
              className={`btn btn-sm ${next === "suspended" ? "btn-ghost-danger" : "btn-secondary"}`}
              aria-haspopup="dialog"
              onClick={() => setDialog("status")}
            >
              {next === "suspended"
                ? "Suspender parceria"
                : "Reativar parceria"}
            </button>
          </div>
          <div>
            <dt>CNPJ</dt>
            <dd>{cnpjMasked ? <code>{cnpjMasked}</code> : "Não cadastrado"}</dd>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              aria-haspopup="dialog"
              onClick={() => setDialog("cnpj")}
            >
              {cnpjMasked ? "Alterar CNPJ" : "Cadastrar CNPJ"}
            </button>
          </div>
        </dl>
        <p className="form-hint">
          A raiz do CNPJ fica oculta depois de salva. Cada mudança registra quem
          fez e o motivo.
        </p>
        <div className="pm-history">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-expanded={showHistory}
            onClick={() => setShowHistory((value) => !value)}
          >
            {showHistory ? "Ocultar histórico" : "Ver histórico"}
          </button>
          {showHistory && (
            <ManagementHistory
              load={loadHistory}
              onUnauthorized={onUnauthorized}
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={dialog === "status"}
        tone={next === "suspended" ? "danger" : "primary"}
        title={copy.title}
        description={copy.description}
        details={[{ label: "Parceria", value: organizationName }]}
        reason={{
          label: "Motivo (fica na trilha de auditoria)",
          min: 5,
          max: 500,
        }}
        confirmLabel={copy.confirm}
        busy={busy}
        onConfirm={(reason) =>
          void run(
            () => changeOrganizationStatus(organizationId, next, reason, csrf),
            copy.success,
          )
        }
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "cnpj"}
        title={cnpjMasked ? "Alterar o CNPJ?" : "Cadastrar o CNPJ?"}
        description="O CNPJ precisa ser único e ter dígitos verificadores válidos. Números e letras são aceitos, com ou sem pontuação."
        details={[
          { label: "Parceria", value: organizationName },
          ...(cnpjMasked ? [{ label: "Atual", value: cnpjMasked }] : []),
        ]}
        reason={{
          label: "Motivo (fica na trilha de auditoria)",
          min: 5,
          max: 500,
        }}
        confirmDisabled={!cnpjCheck || !cnpjCheck.ok}
        confirmLabel="Salvar CNPJ"
        busy={busy}
        onConfirm={(reason) =>
          cnpjCheck?.ok &&
          void run(
            () =>
              setOrganizationCnpj(
                organizationId,
                cnpjCheck.normalized,
                reason,
                csrf,
              ),
            "CNPJ salvo.",
          )
        }
        onCancel={() => {
          setDialog(null);
          setCnpj("");
          setCnpjEditable(false);
        }}
      >
        <div className="org-admin-cnpj">
          <label className="form-field-label" htmlFor="org-cnpj">
            CNPJ
          </label>
          <input
            id="org-cnpj"
            className="input"
            name="company-registry"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={20}
            readOnly={!cnpjEditable}
            onFocus={() => setCnpjEditable(true)}
            value={cnpj}
            disabled={busy}
            aria-invalid={cnpjCheck !== null && !cnpjCheck.ok}
            onChange={(event) => setCnpj(event.target.value)}
          />
          <span
            className={`form-hint${cnpjCheck && !cnpjCheck.ok ? " org-admin-error" : ""}`}
          >
            {cnpjCheck && !cnpjCheck.ok
              ? cnpjCheck.message
              : "Ex.: 11.222.333/0001-81"}
          </span>
        </div>
      </ConfirmDialog>
    </section>
  );
}
