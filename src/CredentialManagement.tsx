import { useRef } from "react";
import { useDialogFocus } from "./useDialogFocus";
import { ConfirmDialog } from "./ConfirmDialog";
import { IntegrationIcon } from "./IntegrationIcon";
import { SecretReveal } from "./SecretReveal";
import { isExpired } from "./credential-dates";
import { CredentialDetailPanel } from "./CredentialDetailPanel";
import { CredentialIssuePanel } from "./CredentialIssuePanel";
import { CredentialList } from "./CredentialList";
import { useCredentialManagement } from "./useCredentialManagement";

type Props = {
  applicationId: string;
  csrfToken: string;
  canIssue: boolean;
  availableScopes?: string[];
  permissionDescriptions?: Record<string, string>;
  channel?: "team" | "partner";
  onUnauthorized: () => void;
  onChanged?: () => void;
};

export function CredentialManagement({
  applicationId,
  csrfToken,
  canIssue,
  availableScopes = ["application:read"],
  permissionDescriptions = {},
  channel = "team",
  onUnauthorized,
  onChanged,
}: Props) {
  const {
    busy,
    closeIssue,
    confirmIssue,
    confirmRecovery,
    confirmRevoke,
    copied,
    copyClientId,
    cursor,
    detailId,
    error,
    expiresInDays,
    formError,
    issue,
    issueReason,
    issued,
    items,
    listError,
    loadMore,
    loaded,
    name,
    notice,
    openIssue,
    reconciled,
    refresh,
    revoke,
    selectedScopes,
    setConfirmRecovery,
    setConfirmRevoke,
    setDetailId,
    setExpiresInDays,
    setFormError,
    setIssueReason,
    setIssued,
    setName,
    setReconciled,
    setSelectedScopes,
    setUncertain,
    uncertain,
  } = useCredentialManagement({
    applicationId,
    csrfToken,
    availableScopes,
    channel,
    onUnauthorized,
    onChanged,
  });
  const detailRef = useRef<HTMLElement>(null);
  const activeCount = items.filter(
    (item) => item.status === "active" && !isExpired(item.expires_at),
  ).length;

  const revokeTarget = items.find((item) => item.id === confirmRevoke);

  const panelRef = useRef<HTMLElement>(null);
  useDialogFocus(confirmIssue, panelRef, () => closeIssue());
  const detail = items.find((item) => item.id === detailId) ?? null;
  useDialogFocus(detail !== null, detailRef, () => setDetailId(null), {
    returnFocus: () =>
      document.querySelector<HTMLElement>(`[data-credential-id="${detailId}"]`),
  });

  const canOpenIssue =
    loaded && !listError && canIssue && !uncertain && !issued;
  const issueFull = loaded && activeCount >= 2;
  const orphan = items.find((item) => item.issue_request_id === uncertain);

  return (
    <section className="cred" aria-label="Credenciais da aplicação">
      <header className="cred-head">
        <div>
          <h3 className="appws-section-title">Credenciais</h3>
          <p className="form-hint">
            Troque o segredo antes de revogar o anterior. Até duas credenciais
            podem estar ativas durante a troca.
          </p>
        </div>
        <div className="appdir-actions">
          <button
            className="btn btn-ghost btn-md"
            type="button"
            disabled={busy}
            onClick={() => void refresh()}
          >
            Atualizar
          </button>
          {canOpenIssue && !issueFull && (
            <button
              className="btn btn-primary btn-md"
              type="button"
              disabled={busy}
              onClick={openIssue}
            >
              <IntegrationIcon name="plus" size={14} /> Emitir credencial
            </button>
          )}
        </div>
      </header>
      {!loaded && (
        <div className="rules-skeleton" role="status" aria-label="Carregando">
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      )}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}
      {uncertain && (
        <div className="alert alert-warning cred-recovery" role="status">
          <strong>Emissão com resultado desconhecido</strong>
          <p>
            Identificador da tentativa: <code>{uncertain}</code>
          </p>
          {orphan ? (
            <p>
              A credencial <code>{orphan.client_id}</code> foi registrada, mas o
              segredo não pode ser recuperado. Revogue-a antes de emitir outra.
            </p>
          ) : reconciled ? (
            <p>
              Esta tentativa não aparece na lista carregada. Consulte as demais
              páginas e atualize novamente antes de encerrar a verificação.
            </p>
          ) : (
            <p>
              Atualize a lista para verificar se a credencial foi registrada.
            </p>
          )}
          {reconciled && !orphan && !cursor && (
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => setConfirmRecovery(true)}
            >
              Revisei toda a lista; encerrar verificação
            </button>
          )}
        </div>
      )}
      {loaded && items.length === 0 && !error && (
        <div className="onb card" role="status">
          <span className="onb-badge" aria-hidden="true">
            <IntegrationIcon name="key" size={28} />
          </span>
          <h4>Emita sua primeira credencial</h4>
          <p className="onb-lead">
            A credencial identifica seus sistemas nas chamadas à API. O segredo
            aparece uma única vez, então prepare um cofre antes de começar.
          </p>
          {canOpenIssue && (
            <button
              className="btn btn-primary btn-lg onb-cta"
              type="button"
              disabled={busy}
              onClick={openIssue}
            >
              Emitir credencial
            </button>
          )}
        </div>
      )}
      {items.length > 0 && (
        <CredentialList items={items} onOpen={setDetailId} />
      )}
      {cursor && (
        <button
          className="btn btn-secondary btn-md cred-more"
          type="button"
          disabled={busy}
          onClick={() => void loadMore()}
        >
          Carregar mais
        </button>
      )}
      {loaded && activeCount >= 2 && (
        <div className="alert" role="note">
          Limite de duas credenciais ativas. Revogue uma antiga antes de emitir
          outra.
        </div>
      )}
      {loaded && !canIssue && (
        <div className="alert" role="note">
          A organização e a aplicação precisam estar ativas para emitir uma
          credencial.
        </div>
      )}

      <CredentialDetailPanel
        detail={detail}
        panelRef={detailRef}
        busy={busy}
        copied={copied}
        permissionDescriptions={permissionDescriptions}
        onClose={() => setDetailId(null)}
        onCopy={(value) => void copyClientId(value)}
        onRevoke={setConfirmRevoke}
      />

      <CredentialIssuePanel
        open={confirmIssue}
        panelRef={panelRef}
        busy={busy}
        error={error}
        formError={formError}
        name={name}
        expiresInDays={expiresInDays}
        issueReason={issueReason}
        availableScopes={availableScopes}
        selectedScopes={selectedScopes}
        permissionDescriptions={permissionDescriptions}
        onName={setName}
        onExpiresInDays={setExpiresInDays}
        onIssueReason={setIssueReason}
        onSelectedScopes={setSelectedScopes}
        onFormError={setFormError}
        onSubmit={() => void issue()}
        onClose={closeIssue}
      />
      <ConfirmDialog
        open={confirmRevoke !== null}
        tone="danger"
        title="Revogar esta credencial?"
        description="Revogar invalida imediatamente os tokens desta credencial. Confirme que a nova já foi testada."
        details={
          revokeTarget
            ? [
                {
                  label: "Credencial",
                  value: revokeTarget.name || "Credencial sem nome",
                },
                { label: "Identificador", value: revokeTarget.client_id },
              ]
            : []
        }
        confirmLabel="Revogar credencial"
        busy={busy}
        reason={{
          label: "Motivo (fica na trilha de auditoria)",
          min: 3,
          max: 500,
        }}
        onConfirm={(reason) =>
          confirmRevoke && void revoke(confirmRevoke, reason)
        }
        onCancel={() => setConfirmRevoke(null)}
      />
      <ConfirmDialog
        open={confirmRecovery}
        title="Encerrar a verificação?"
        description="Confirme que você revisou toda a lista e a credencial desta tentativa não foi registrada."
        confirmLabel="Confirmar que não foi registrada"
        onConfirm={() => {
          setUncertain(null);
          setReconciled(false);
          setConfirmRecovery(false);
        }}
        onCancel={() => setConfirmRecovery(false)}
      />
      {issued && (
        <SecretReveal
          title="Credencial emitida"
          description="Guarde o segredo em um cofre seguro e teste a nova credencial antes de revogar a anterior."
          secretLabel="Segredo (client secret)"
          secret={issued.client_secret}
          details={[{ label: "Identificador", value: issued.client_id }]}
          onDismiss={() => setIssued(null)}
        />
      )}
    </section>
  );
}
