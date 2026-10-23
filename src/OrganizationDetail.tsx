import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  ApiError,
  describeOrganizationPermission,
  deleteOrganizationLogo,
  getOrganization,
  getLogoBlobUrl,
  grantApplicationPermission,
  invitePartnerMember,
  mediaUrl,
  putOrganizationLogoWithProgress,
  replaceOrganizationProfile,
  revokeApplicationPermission,
  type OrganizationDetail as Detail,
} from "./api";
import "./partner-detail.css";
import "./commercial-rules.css";
import { ConfirmDialog } from "./ConfirmDialog";
import { Disclosure } from "./controls";
import { FieldAction } from "./FieldAction";
import { LOGO_RULE } from "./file-rules";
import { ImageUploader } from "./ImageUploader";
import { ApplicationCreationWizard } from "./ApplicationCreationWizard";
import { OrganizationApplicationsDirectory } from "./OrganizationApplicationsDirectory";
import { ApplicationWorkspace } from "./ApplicationWorkspace";
import {
  applicationPermissionDescription,
  applicationPermissionLabel,
} from "./display-labels";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  organizationId: string;
  csrfToken: string;
  canManage: boolean;
  isAdmin: boolean;
  onBack: () => void;
  onUnauthorized: () => void;
};

function statusLabel(status: string): string {
  if (status === "active") return "Ativa";
  if (status === "suspended") return "Suspensa";
  return "Estado desconhecido";
}

export function OrganizationDetail({
  organizationId,
  csrfToken,
  canManage,
  isAdmin,
  onBack,
  onUnauthorized,
}: Props) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [permissionEditing, setPermissionEditing] = useState<string | null>(
    null,
  );
  const [permissionDescription, setPermissionDescription] = useState("");
  const [permissionBusy, setPermissionBusy] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState("");
  const [permissionNotice, setPermissionNotice] = useState("");
  const [logoBlobUrl, setLogoBlobUrl] = useState<string | null>(null);
  const [logoRevision, setLogoRevision] = useState(0);
  const [logoError, setLogoError] = useState("");
  const [logoNotice, setLogoNotice] = useState("");
  const [section, setSection] = useState<"application" | "partnership">(
    "application",
  );
  const [selectedApplicationId, setSelectedApplicationId] = useState<
    string | null
  >(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteEditable, setInviteEditable] = useState(false);
  const [inviteConfirm, setInviteConfirm] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteNotice, setInviteNotice] = useState("");
  const [identifierNotice, setIdentifierNotice] = useState("");

  useEffect(() => {
    let live = true;
    getOrganization(organizationId)
      .then((result) => {
        if (live) setDetail(result);
      })
      .catch((cause: unknown) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else
          setError(
            cause instanceof ApiError
              ? cause.detail
              : "Não foi possível consultar a organização.",
          );
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [organizationId, onUnauthorized, revision]);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    if (detail?.logo_url && mediaUrl(detail.logo_url)) {
      getLogoBlobUrl(detail.logo_url)
        .then((url) => {
          objectUrl = url;
          if (active) setLogoBlobUrl(url);
          else URL.revokeObjectURL(url);
        })
        .catch(() => {
          if (active) setLogoError("Não foi possível carregar o logo.");
        });
    }
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [detail?.logo_url, logoRevision]);

  function retry() {
    setLoading(true);
    setError("");
    setRevision((value) => value + 1);
  }

  function startEditing() {
    if (!detail || !canManage) return;
    setName(detail.name);
    setDescription(detail.description || "");
    setSaveError("");
    setSaved(false);
    setEditing(true);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !canManage) return;
    setSaving(true);
    setSaveError("");
    try {
      const updated = await replaceOrganizationProfile(
        organizationId,
        { name: name.trim(), description: description.trim() || null },
        csrfToken,
      );
      setDetail({ ...detail, ...updated });
      setEditing(false);
      setSaved(true);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setSaveError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível salvar o perfil.",
        );
    } finally {
      setSaving(false);
    }
  }

  async function changePermission(
    action: () => Promise<unknown>,
    key: string,
    notice: string,
  ) {
    setPermissionBusy(key);
    setPermissionError("");
    setPermissionNotice("");
    try {
      await action();
      setDetail(await getOrganization(organizationId));
      setPermissionEditing(null);
      setPermissionNotice(notice);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setPermissionError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível atualizar a permissão.",
        );
    } finally {
      setPermissionBusy(null);
    }
  }

  function savePermissionDescription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!permissionEditing || !permissionDescription.trim()) return;
    void changePermission(
      () =>
        describeOrganizationPermission(
          organizationId,
          permissionEditing,
          permissionDescription.trim(),
          csrfToken,
        ),
      `description:${permissionEditing}`,
      "Descrição atualizada.",
    );
  }

  async function refreshLogo(notice: string) {
    try {
      const next = await getOrganization(organizationId);
      setLogoBlobUrl(null);
      setDetail(next);
      setLogoRevision((value) => value + 1);
      setLogoError("");
      setLogoNotice(notice);
    } catch {
      setLogoNotice("");
      setLogoError(
        "A alteração foi salva, mas não foi possível atualizar a tela. Recarregue a página para ver o resultado.",
      );
    }
  }

  async function uploadLogo(
    file: Blob,
    onProgress: (fraction: number) => void,
  ) {
    setLogoNotice("");
    await putOrganizationLogoWithProgress(
      organizationId,
      file,
      csrfToken,
      onProgress,
    );
    await refreshLogo("Logo atualizado.");
  }

  async function removeLogo() {
    setLogoNotice("");
    await deleteOrganizationLogo(organizationId, csrfToken);
    await refreshLogo("Logo removido.");
  }

  function requestInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return;
    const email = inviteEmail.trim();
    setInviteNotice("");
    if (!EMAIL_PATTERN.test(email)) {
      setInviteError("Informe um e-mail válido, como nome@empresa.com.br.");
      return;
    }
    setInviteError("");
    setInviteConfirm(true);
  }

  async function sendInvite() {
    if (!isAdmin || !inviteEmail.trim()) return;
    setInviteBusy(true);
    setInviteError("");
    setInviteNotice("");
    try {
      await invitePartnerMember(organizationId, inviteEmail.trim(), csrfToken);
      setInviteNotice(
        "Convite enviado por e-mail. O link fica válido por 24 horas.",
      );
      setInviteEmail("");
      setInviteEditable(false);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setInviteError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível confirmar o envio do convite. Consulte o cadastro antes de tentar novamente.",
        );
    } finally {
      setInviteBusy(false);
      setInviteConfirm(false);
    }
  }

  async function copyIdentifier() {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(detail.id);
      setIdentifierNotice("Identificador copiado.");
    } catch {
      setIdentifierNotice("Selecione o identificador para copiar.");
    }
  }

  const sections = [
    { id: "application", label: "Integrações" },
    { id: "partnership", label: "Dados da parceria" },
  ] as const;

  function onSectionKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const index = sections.findIndex((item) => item.id === section);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? sections.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + sections.length) %
            sections.length;
    setSection(sections[next].id);
    event.currentTarget
      .querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  }

  const activeApplications = detail
    ? detail.applications.filter((item) => item.status === "active").length
    : 0;

  return (
    <section className="page partner-detail" aria-labelledby="detail-title">
      <button className="btn btn-ghost btn-sm" type="button" onClick={onBack}>
        ← Parceiros
      </button>
      {loading && (
        <div
          className="rules-skeleton"
          role="status"
          aria-label="Carregando parceria"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <span className="skeleton" key={index} />
          ))}
        </div>
      )}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}{" "}
          <button className="btn btn-secondary btn-sm" onClick={retry}>
            Tentar novamente
          </button>
        </div>
      )}
      {!loading && detail && (
        <>
          <header className="card partner-head">
            <div className="partner-logo">
              {logoBlobUrl ? (
                <img
                  src={logoBlobUrl}
                  alt={`Logo de ${detail.name}`}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span aria-hidden="true">
                  {detail.name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="partner-head-name">
              <h1 className="page-title" id="detail-title">
                {detail.name}
              </h1>
              <p className="page-subtitle">{detail.slug}</p>
            </div>
            <span
              className={`badge ${detail.status === "active" ? "badge-success" : detail.status === "suspended" ? "badge-warning" : "badge-neutral"}`}
            >
              {statusLabel(detail.status)}
            </span>
            <dl className="partner-stats">
              <div>
                <dt>Aplicações</dt>
                <dd>{detail.applications.length}</dd>
              </div>
              <div>
                <dt>Ativas</dt>
                <dd>{activeApplications}</dd>
              </div>
              <div>
                <dt>Ações no catálogo</dt>
                <dd>{detail.permissions.length}</dd>
              </div>
            </dl>
          </header>
          <div
            className="seg-tabs"
            role="tablist"
            aria-label="Área da parceria"
            onKeyDown={onSectionKeyDown}
          >
            {sections.map((item) => (
              <button
                key={item.id}
                id={`partner-tab-${item.id}`}
                type="button"
                role="tab"
                className={`seg-tab${section === item.id ? " active" : ""}`}
                aria-selected={section === item.id}
                aria-controls={`partner-panel-${item.id}`}
                tabIndex={section === item.id ? 0 : -1}
                onClick={() => setSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {permissionError && (
            <div className="alert alert-danger" role="alert">
              {permissionError}
            </div>
          )}
          {permissionNotice && (
            <div className="alert alert-success" role="status">
              {permissionNotice}
            </div>
          )}
          <div
            id={`partner-panel-${section}`}
            role="tabpanel"
            aria-labelledby={`partner-tab-${section}`}
          >
            {section === "application" && selectedApplicationId && (
              <>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedApplicationId(null)}
                >
                  ← Aplicações
                </button>
                <ApplicationWorkspace
                  key={selectedApplicationId ?? organizationId}
                  applications={detail.applications}
                  permissions={detail.permissions}
                  selectedApplicationId={selectedApplicationId}
                  onSelectApplication={setSelectedApplicationId}
                  csrfToken={csrfToken}
                  canManage={canManage}
                  canEdit={detail.status === "active"}
                  onUnauthorized={onUnauthorized}
                  permissionBusy={permissionBusy !== null}
                  onTogglePermission={(applicationId, code, granted) =>
                    void changePermission(
                      () =>
                        granted
                          ? revokeApplicationPermission(
                              applicationId,
                              code,
                              csrfToken,
                            )
                          : grantApplicationPermission(
                              applicationId,
                              code,
                              csrfToken,
                            ),
                      `${applicationId}:${code}`,
                      granted ? "Permissão revogada." : "Permissão concedida.",
                    )
                  }
                  additionalApplication={null}
                />
              </>
            )}
            {section === "application" && !selectedApplicationId && (
              <OrganizationApplicationsDirectory
                organizationId={organizationId}
                organizationName={detail.name}
                applications={detail.applications}
                permissions={detail.permissions}
                canManage={canManage && detail.status === "active"}
                csrfToken={csrfToken}
                onOpen={setSelectedApplicationId}
                onChanged={() => setRevision((value) => value + 1)}
                onUnauthorized={onUnauthorized}
                createForm={
                  canManage && detail.status === "active" ? (
                    <ApplicationCreationWizard
                      key={organizationId}
                      organizationId={organizationId}
                      organizationName={detail.name}
                      availablePermissions={detail.permissions}
                      csrfToken={csrfToken}
                      onCreated={(applicationId) => {
                        setSelectedApplicationId(applicationId);
                        setRevision((value) => value + 1);
                      }}
                      onUnauthorized={onUnauthorized}
                    />
                  ) : null
                }
              />
            )}
            {section === "partnership" && (
              <div className="partner-grid">
                <div className="partner-column">
                  <section className="card" aria-labelledby="profile-title">
                    <div className="card-header">
                      <h2 className="card-title" id="profile-title">
                        Perfil
                      </h2>
                      {canManage && !editing ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          type="button"
                          onClick={startEditing}
                        >
                          Editar perfil
                        </button>
                      ) : (
                        <span className="badge badge-neutral">
                          {canManage ? "Editando" : "Somente leitura"}
                        </span>
                      )}
                    </div>
                    <div className="card-body">
                      {saved && (
                        <div className="alert alert-success" role="status">
                          Perfil atualizado.
                        </div>
                      )}
                      {editing ? (
                        <form className="form-stack" onSubmit={saveProfile}>
                          <div className="form-field">
                            <label
                              className="form-field-label"
                              htmlFor="profile-name"
                            >
                              Nome da organização
                            </label>
                            <input
                              id="profile-name"
                              className="input"
                              required
                              maxLength={255}
                              value={name}
                              onChange={(event) => setName(event.target.value)}
                            />
                          </div>
                          <div className="form-field">
                            <label
                              className="form-field-label"
                              htmlFor="profile-description"
                            >
                              Descrição institucional
                            </label>
                            <textarea
                              id="profile-description"
                              className="input"
                              maxLength={2000}
                              rows={5}
                              value={description}
                              onChange={(event) =>
                                setDescription(event.target.value)
                              }
                            />
                            <span className="form-hint">
                              Até 2.000 caracteres. Deixe vazio para remover.
                            </span>
                          </div>
                          {saveError && (
                            <div className="alert alert-danger" role="alert">
                              {saveError}
                            </div>
                          )}
                          <div className="partner-actions">
                            <button
                              className="btn btn-primary btn-md"
                              disabled={saving || !name.trim()}
                            >
                              {saving ? "Salvando…" : "Salvar perfil"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-md"
                              disabled={saving}
                              onClick={() => setEditing(false)}
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="partner-field">
                            <span className="form-field-label">Descrição</span>
                            <p>
                              {detail.description?.trim() ||
                                "Nenhuma descrição cadastrada."}
                            </p>
                          </div>
                          <Disclosure title="Identificador técnico">
                            <div className="partner-id">
                              <code>{detail.id}</code>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => void copyIdentifier()}
                              >
                                Copiar
                              </button>
                            </div>
                            {identifierNotice && (
                              <p className="form-hint" role="status">
                                {identifierNotice}
                              </p>
                            )}
                          </Disclosure>
                        </>
                      )}
                    </div>
                  </section>

                  <section className="card" aria-labelledby="logo-title">
                    <div className="card-header">
                      <h2 className="card-title" id="logo-title">
                        Logo
                      </h2>
                      <span className="badge badge-neutral">
                        {detail.logo_url ? "Disponível" : "Sem imagem"}
                      </span>
                    </div>
                    <div className="card-body">
                      <p className="form-hint">
                        Imagem da organização, visível somente para a equipe
                        nesta área.
                      </p>
                      <ImageUploader
                        label="Logo"
                        currentSrc={logoBlobUrl}
                        rule={LOGO_RULE}
                        shape="circle"
                        canEdit={isAdmin}
                        onUpload={uploadLogo}
                        onRemove={removeLogo}
                        onUnauthorized={onUnauthorized}
                      />
                      {logoError && (
                        <div className="alert alert-danger" role="alert">
                          {logoError}
                        </div>
                      )}
                      {logoNotice && (
                        <div className="alert alert-success" role="status">
                          {logoNotice}
                        </div>
                      )}
                    </div>
                  </section>

                  {isAdmin && (
                    <section
                      className="card"
                      aria-labelledby="partner-invitation-title"
                    >
                      <div className="card-header">
                        <h2
                          className="card-title"
                          id="partner-invitation-title"
                        >
                          Acesso do parceiro
                        </h2>
                      </div>
                      <div className="card-body">
                        <p className="form-hint">
                          Convide a pessoa responsável. Ela criará uma senha e
                          ativará o autenticador antes de entrar na própria
                          integração.
                        </p>
                        <form
                          noValidate
                          onSubmit={requestInvite}
                          className="form-stack"
                        >
                          <FieldAction
                            id="partner-invite-email"
                            label="E-mail do responsável"
                            action={
                              <button
                                className="btn btn-primary btn-md"
                                disabled={inviteBusy || !inviteEmail.trim()}
                              >
                                {inviteBusy ? "Enviando…" : "Enviar convite"}
                              </button>
                            }
                          >
                            <input
                              id="partner-invite-email"
                              className="input"
                              name="responsible-contact"
                              type="text"
                              inputMode="email"
                              autoComplete="off"
                              autoCapitalize="none"
                              spellCheck={false}
                              readOnly={!inviteEditable}
                              onFocus={() => setInviteEditable(true)}
                              value={inviteEmail}
                              onChange={(event) =>
                                setInviteEmail(event.target.value)
                              }
                            />
                          </FieldAction>
                        </form>
                        {inviteError && (
                          <div className="alert alert-danger" role="alert">
                            {inviteError}
                          </div>
                        )}
                        {inviteNotice && (
                          <div className="alert alert-success" role="status">
                            {inviteNotice}
                          </div>
                        )}
                        <ConfirmDialog
                          open={inviteConfirm}
                          title="Enviar convite de acesso?"
                          description="O convite será enviado agora por e-mail e o link vale por 24 horas. Confira o endereço: se estiver errado, outra pessoa receberá o acesso."
                          details={[
                            { label: "Parceria", value: detail?.name ?? "—" },
                            {
                              label: "Enviar para",
                              value: inviteEmail.trim(),
                            },
                          ]}
                          confirmLabel="Enviar convite"
                          busy={inviteBusy}
                          onConfirm={() => void sendInvite()}
                          onCancel={() => setInviteConfirm(false)}
                        />
                      </div>
                    </section>
                  )}
                </div>

                <section
                  className="card partner-catalog"
                  aria-labelledby="catalog-title"
                >
                  <div className="card-header">
                    <h2 className="card-title" id="catalog-title">
                      Catálogo de ações
                    </h2>
                    <span className="badge badge-neutral">
                      {detail.permissions.length}
                    </span>
                  </div>
                  <div className="card-body">
                    <p className="form-hint">
                      Permissões que esta organização pode conceder às suas
                      aplicações.
                    </p>
                    {detail.permissions.length === 0 ? (
                      <div className="empty-state" role="status">
                        <strong>Nenhuma ação no catálogo</strong>
                      </div>
                    ) : (
                      <ul className="catalog-list">
                        {detail.permissions.map((permission) => (
                          <li key={permission.code}>
                            <strong title={permission.code}>
                              {applicationPermissionLabel(permission.code)}
                            </strong>
                            {permissionEditing === permission.code ? (
                              <form
                                className="form-stack"
                                onSubmit={savePermissionDescription}
                              >
                                <div className="form-field">
                                  <label
                                    className="form-field-label"
                                    htmlFor="permission-description"
                                  >
                                    Descrição da ação
                                  </label>
                                  <input
                                    id="permission-description"
                                    className="input"
                                    required
                                    maxLength={255}
                                    value={permissionDescription}
                                    onChange={(event) =>
                                      setPermissionDescription(
                                        event.target.value,
                                      )
                                    }
                                  />
                                </div>
                                <div className="partner-actions">
                                  <button
                                    className="btn btn-primary btn-sm"
                                    disabled={
                                      permissionBusy !== null ||
                                      !permissionDescription.trim()
                                    }
                                  >
                                    {permissionBusy
                                      ? "Salvando…"
                                      : "Salvar descrição"}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    disabled={permissionBusy !== null}
                                    onClick={() => setPermissionEditing(null)}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <>
                                <span>
                                  {permission.description?.trim() ||
                                    applicationPermissionDescription(
                                      permission.code,
                                    )}
                                </span>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    disabled={permissionBusy !== null}
                                    onClick={() => {
                                      setPermissionEditing(permission.code);
                                      setPermissionDescription(
                                        permission.description,
                                      );
                                      setPermissionError("");
                                    }}
                                  >
                                    Editar descrição
                                  </button>
                                )}
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
