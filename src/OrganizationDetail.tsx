import { useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  describeOrganizationPermission,
  deleteOrganizationLogo,
  getOrganization,
  getLogoBlobUrl,
  grantApplicationPermission,
  invitePartnerMember,
  mediaUrl,
  putOrganizationLogo,
  replaceOrganizationProfile,
  revokeApplicationPermission,
  type OrganizationDetail as Detail,
} from "./api";
import "./detail.css";
import { ConfirmDialog } from "./ConfirmDialog";
import { ApplicationCreationWizard } from "./ApplicationCreationWizard";
import { OrganizationApplicationsDirectory } from "./OrganizationApplicationsDirectory";
import { ApplicationWorkspace } from "./ApplicationWorkspace";
import {
  applicationPermissionDescription,
  applicationPermissionGlyph,
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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
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

  async function changeLogo(remove: boolean) {
    if (!isAdmin || (!remove && !logoFile)) return;
    setLogoBusy(true);
    setLogoError("");
    setLogoNotice("");
    try {
      if (remove) await deleteOrganizationLogo(organizationId, csrfToken);
      else if (logoFile)
        await putOrganizationLogo(organizationId, logoFile, csrfToken);
      setLogoBlobUrl(null);
      setDetail(await getOrganization(organizationId));
      setLogoRevision((value) => value + 1);
      setLogoFile(null);
      setLogoNotice(remove ? "Logo removido." : "Logo atualizado.");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setLogoError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível atualizar o logo.",
        );
    } finally {
      setLogoBusy(false);
    }
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

  return (
    <section className="detail" aria-labelledby="detail-title">
      <button className="back-link" onClick={onBack}>
        ← Voltar ao diretório
      </button>
      {loading && (
        <div
          className="integration-skeleton"
          role="status"
          aria-label="Carregando parceria"
        >
          <i />
          <i />
          <i />
        </div>
      )}
      {error && (
        <div className="detail-error">
          <p className="error" role="alert">
            {error}
          </p>
          <button className="button secondary" onClick={retry}>
            Tentar novamente
          </button>
        </div>
      )}
      {!loading && detail && (
        <>
          <div className="detail-intro">
            <div className="detail-intro-main">
              <div className="detail-logo">
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
              <div className="detail-intro-name">
                <p className="eyebrow">Parceria</p>
                <h1 id="detail-title">{detail.name}</h1>
              </div>
              <span
                className={`detail-status detail-status--${detail.status === "active" ? "active" : detail.status === "suspended" ? "suspended" : "unknown"}`}
              >
                <span aria-hidden="true">
                  {detail.status === "active" ? "✓" : "–"}
                </span>
                {statusLabel(detail.status)}
              </span>
            </div>
            <dl className="detail-summary">
              <div>
                <dt>Aplicações</dt>
                <dd>{detail.applications.length}</dd>
              </div>
              <div>
                <dt>Aplicações ativas</dt>
                <dd>
                  {
                    detail.applications.filter(
                      (item) => item.status === "active",
                    ).length
                  }
                </dd>
              </div>
            </dl>
          </div>
          <div
            className="integration-section-nav"
            role="tablist"
            aria-label="Área da parceria"
          >
            <button
              type="button"
              role="tab"
              aria-selected={section === "application"}
              onClick={() => setSection("application")}
            >
              Integrações
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={section === "partnership"}
              onClick={() => setSection("partnership")}
            >
              Dados da parceria
            </button>
          </div>
          {section === "application" && selectedApplicationId && (
            <>
              <button
                type="button"
                className="back-link"
                onClick={() => setSelectedApplicationId(null)}
              >
                ← Voltar às aplicações
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
          {permissionError && (
            <p className="error" role="alert">
              {permissionError}
            </p>
          )}
          {permissionNotice && (
            <p className="profile-saved" role="status">
              {permissionNotice}
            </p>
          )}
          {section === "partnership" && isAdmin && (
            <section
              className="integration-invitation"
              aria-labelledby="partner-invitation-title"
            >
              <div>
                <h3 id="partner-invitation-title">Acesso do parceiro</h3>
                <p>
                  Convide a pessoa responsável. Ela criará uma senha e ativará o
                  autenticador antes de entrar na própria integração.
                </p>
              </div>
              <form noValidate onSubmit={requestInvite}>
                <div className="field">
                  <label htmlFor="partner-invite-email">
                    E-mail do responsável
                  </label>
                  <input
                    id="partner-invite-email"
                    name="responsible-contact"
                    type="text"
                    inputMode="email"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    readOnly={!inviteEditable}
                    onFocus={() => setInviteEditable(true)}
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                  />
                </div>
                <button
                  className="button primary"
                  disabled={inviteBusy || !inviteEmail.trim()}
                >
                  {inviteBusy ? "Enviando…" : "Enviar convite"}
                </button>
              </form>
              <ConfirmDialog
                open={inviteConfirm}
                title="Enviar convite de acesso?"
                description="O convite será enviado agora por e-mail e o link vale por 24 horas. Confira o endereço: se estiver errado, outra pessoa receberá o acesso."
                details={[
                  { label: "Parceria", value: detail?.name ?? "—" },
                  { label: "Enviar para", value: inviteEmail.trim() },
                ]}
                confirmLabel="Enviar convite"
                busy={inviteBusy}
                onConfirm={() => void sendInvite()}
                onCancel={() => setInviteConfirm(false)}
              />
              {inviteError && (
                <p className="error" role="alert">
                  {inviteError}
                </p>
              )}
              {inviteNotice && (
                <p className="profile-saved" role="status">
                  {inviteNotice}
                </p>
              )}
            </section>
          )}
          {section === "partnership" && (
            <div className="detail-grid">
              <div className="detail-main">
                <article className="detail-card">
                  <div className="detail-card-head">
                    <h3>Perfil</h3>
                    {canManage && !editing ? (
                      <button className="back-link" onClick={startEditing}>
                        Editar perfil
                      </button>
                    ) : (
                      <span>{canManage ? "Editando" : "Somente leitura"}</span>
                    )}
                  </div>
                  {saved && (
                    <p className="profile-saved" role="status">
                      Perfil atualizado.
                    </p>
                  )}
                  {editing ? (
                    <form className="form profile-form" onSubmit={saveProfile}>
                      <label htmlFor="profile-name">Nome da organização</label>
                      <input
                        id="profile-name"
                        required
                        maxLength={255}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                      />
                      <label htmlFor="profile-description">
                        Descrição institucional
                      </label>
                      <textarea
                        id="profile-description"
                        maxLength={2000}
                        rows={5}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                      />
                      <small>
                        Até 2.000 caracteres. Deixe vazio para remover.
                      </small>
                      {saveError && (
                        <p className="error" role="alert">
                          {saveError}
                        </p>
                      )}
                      <div className="button-row">
                        <button
                          className="button primary"
                          disabled={saving || !name.trim()}
                        >
                          {saving ? "Salvando…" : "Salvar perfil"}
                        </button>
                        <button
                          type="button"
                          className="button secondary"
                          disabled={saving}
                          onClick={() => setEditing(false)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <dl>
                        <div>
                          <dt>Descrição</dt>
                          <dd>
                            {detail.description?.trim() ||
                              "Nenhuma descrição cadastrada."}
                          </dd>
                        </div>
                      </dl>
                      <details className="detail-technical">
                        <summary>Identificador técnico</summary>
                        <div>
                          <code>{detail.id}</code>
                          <button
                            type="button"
                            className="back-link"
                            onClick={() => void copyIdentifier()}
                          >
                            Copiar
                          </button>
                        </div>
                        {identifierNotice && (
                          <p role="status">{identifierNotice}</p>
                        )}
                      </details>
                    </>
                  )}
                </article>
                <section
                  className="detail-card logo-card"
                  aria-labelledby="logo-title"
                >
                  <div className="detail-card-head">
                    <h3 id="logo-title">Logo</h3>
                    <span>{detail.logo_url ? "Disponível" : "Sem imagem"}</span>
                  </div>
                  <p>
                    Imagem da organização, visível somente para a equipe nesta
                    área.
                  </p>
                  {isAdmin && (
                    <>
                      <label htmlFor="logo-file">
                        Enviar PNG ou JPEG, até 2 MiB
                      </label>
                      <input
                        id="logo-file"
                        type="file"
                        accept="image/png,image/jpeg"
                        onChange={(event) => {
                          const file = event.target.files?.[0] || null;
                          setLogoError("");
                          setLogoFile(
                            file &&
                              ["image/png", "image/jpeg"].includes(file.type) &&
                              file.size <= 2 * 1024 * 1024
                              ? file
                              : null,
                          );
                          if (
                            file &&
                            (!["image/png", "image/jpeg"].includes(file.type) ||
                              file.size > 2 * 1024 * 1024)
                          )
                            setLogoError(
                              "Escolha um PNG ou JPEG de até 2 MiB.",
                            );
                        }}
                      />
                      <div className="button-row">
                        <button
                          className="button primary"
                          type="button"
                          disabled={logoBusy || !logoFile}
                          onClick={() => void changeLogo(false)}
                        >
                          {logoBusy ? "Enviando…" : "Enviar logo"}
                        </button>
                        {detail.logo_url && (
                          <button
                            className="button secondary"
                            type="button"
                            disabled={logoBusy}
                            onClick={() => void changeLogo(true)}
                          >
                            Remover logo
                          </button>
                        )}
                      </div>
                    </>
                  )}
                  {logoError && (
                    <p className="error" role="alert">
                      {logoError}
                    </p>
                  )}
                  {logoNotice && (
                    <p className="profile-saved" role="status">
                      {logoNotice}
                    </p>
                  )}
                </section>
              </div>
              <aside className="detail-card" aria-labelledby="catalog-title">
                <div className="detail-card-head">
                  <h3 id="catalog-title">Catálogo de ações</h3>
                  <span>{detail.permissions.length}</span>
                </div>
                <p>
                  Permissões que esta organização pode conceder às suas
                  aplicações.
                </p>
                {detail.permissions.length === 0 ? (
                  <p className="detail-empty">Nenhuma ação no catálogo.</p>
                ) : (
                  <ul className="catalog-list">
                    {detail.permissions.map((permission, index) => (
                      <li key={permission.code}>
                        <span className="catalog-icon" aria-hidden="true">
                          {applicationPermissionGlyph(permission.code, index)}
                        </span>
                        <div className="catalog-content">
                          <strong title={permission.code}>
                            {applicationPermissionLabel(permission.code)}
                          </strong>
                          {permissionEditing === permission.code ? (
                            <form
                              className="permission-description-form"
                              onSubmit={savePermissionDescription}
                            >
                              <label htmlFor="permission-description">
                                Descrição da ação
                              </label>
                              <input
                                id="permission-description"
                                required
                                maxLength={255}
                                value={permissionDescription}
                                onChange={(event) =>
                                  setPermissionDescription(event.target.value)
                                }
                              />
                              <div className="button-row">
                                <button
                                  className="button primary"
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
                                  className="button secondary"
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
                                  className="back-link"
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
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </aside>
            </div>
          )}
        </>
      )}
    </section>
  );
}
