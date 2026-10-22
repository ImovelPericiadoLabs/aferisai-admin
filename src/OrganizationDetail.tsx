import { useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  describeOrganizationPermission,
  deleteOrganizationLogo,
  getOrganization,
  getLogoBlobUrl,
  grantApplicationPermission,
  mediaUrl,
  putOrganizationLogo,
  replaceOrganizationProfile,
  revokeApplicationPermission,
  type OrganizationDetail as Detail,
} from "./api";
import "./detail.css";
import { CredentialManagement } from "./CredentialManagement";
import { AdditionalApplicationForm } from "./AdditionalApplicationForm";
import { RedirectUriManagement } from "./RedirectUriManagement";
import { WebhookEndpointManagement } from "./WebhookEndpointManagement";

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

  return (
    <section className="detail" aria-labelledby="detail-title">
      <button className="back-link" onClick={onBack}>
        ← Voltar ao diretório
      </button>
      {loading && (
        <p role="status" className="directory-state">
          Carregando detalhes…
        </p>
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
            <div>
              <p className="eyebrow">Organização parceira</p>
              <h2 id="detail-title">{detail.name}</h2>
              <p className="detail-slug">{detail.slug}</p>
            </div>
            <span className="pill">{statusLabel(detail.status)}</span>
          </div>
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
                  <dl>
                    <div>
                      <dt>Identificador</dt>
                      <dd>{detail.id}</dd>
                    </div>
                    <div>
                      <dt>Descrição</dt>
                      <dd>
                        {detail.description?.trim() ||
                          "Nenhuma descrição cadastrada."}
                      </dd>
                    </div>
                  </dl>
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
                          setLogoError("Escolha um PNG ou JPEG de até 2 MiB.");
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
              <section
                className="detail-card"
                aria-labelledby="applications-title"
              >
                <div className="detail-card-head">
                  <h3 id="applications-title">Aplicações</h3>
                  <span>{detail.applications.length}</span>
                </div>
                {canManage && detail.status === "active" && (
                  <AdditionalApplicationForm
                    key={organizationId}
                    organizationId={organizationId}
                    csrfToken={csrfToken}
                    onCreated={() => setRevision((value) => value + 1)}
                    onUnauthorized={onUnauthorized}
                  />
                )}
                {detail.applications.length === 0 ? (
                  <p className="detail-empty">Nenhuma aplicação cadastrada.</p>
                ) : (
                  <div className="application-list">
                    {detail.applications.map((application) => (
                      <article
                        key={application.id}
                        className="application-item"
                      >
                        <div className="application-heading">
                          <div>
                            <h4>{application.name}</h4>
                            <small>{application.id}</small>
                          </div>
                          <span className="pill">
                            {statusLabel(application.status)}
                          </span>
                        </div>
                        <p>Permissões concedidas</p>
                        {application.permissions.length === 0 ? (
                          <span className="detail-empty">
                            Nenhuma permissão concedida.
                          </span>
                        ) : (
                          <ul className="permission-chips">
                            {application.permissions.map((code) => (
                              <li key={code}>{code}</li>
                            ))}
                          </ul>
                        )}
                        {canManage &&
                          detail.status === "active" &&
                          application.status === "active" && (
                            <div className="permission-actions">
                              {detail.permissions.map((permission) => {
                                const granted =
                                  application.permissions.includes(
                                    permission.code,
                                  );
                                const key = `${application.id}:${permission.code}`;
                                return (
                                  <button
                                    key={permission.code}
                                    type="button"
                                    className="back-link"
                                    disabled={permissionBusy !== null}
                                    onClick={() =>
                                      void changePermission(
                                        () =>
                                          granted
                                            ? revokeApplicationPermission(
                                                application.id,
                                                permission.code,
                                                csrfToken,
                                              )
                                            : grantApplicationPermission(
                                                application.id,
                                                permission.code,
                                                csrfToken,
                                              ),
                                        key,
                                        granted
                                          ? "Permissão revogada."
                                          : "Permissão concedida.",
                                      )
                                    }
                                  >
                                    {granted ? "Revogar" : "Conceder"}{" "}
                                    {permission.code}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        {canManage && (
                          <RedirectUriManagement
                            applicationId={application.id}
                            csrfToken={csrfToken}
                            canEdit={
                              detail.status === "active" &&
                              application.status === "active"
                            }
                            onUnauthorized={onUnauthorized}
                          />
                        )}
                        {canManage && (
                          <CredentialManagement
                            applicationId={application.id}
                            csrfToken={csrfToken}
                            canIssue={
                              detail.status === "active" &&
                              application.status === "active"
                            }
                            onUnauthorized={onUnauthorized}
                          />
                        )}
                        {canManage && (
                          <WebhookEndpointManagement
                            applicationId={application.id}
                            csrfToken={csrfToken}
                            canManage={canManage}
                            canEdit={
                              detail.status === "active" &&
                              application.status === "active"
                            }
                            onUnauthorized={onUnauthorized}
                          />
                        )}
                      </article>
                    ))}
                  </div>
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
                  {detail.permissions.map((permission) => (
                    <li key={permission.code}>
                      <strong>{permission.code}</strong>
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
                            {permission.description ||
                              "Sem descrição cadastrada."}
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
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
