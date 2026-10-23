import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ApiError,
  describeOrganizationPermission,
  deleteOrganizationLogo,
  getOrganization,
  getLogoBlobUrl,
  grantApplicationPermission,
  mediaUrl,
  putOrganizationLogoWithProgress,
  replaceOrganizationProfile,
  revokeApplicationPermission,
  teamPeopleApi,
  type OrganizationDetail as Detail,
} from "./api";
import { OrganizationAdmin } from "./OrganizationAdmin";
import { PermissionRegistration } from "./PermissionRegistration";
import type { ToastKind } from "./useToast";
import "./partner-detail.css";
import "./commercial-rules.css";
import { Breadcrumbs } from "./Breadcrumbs";
import { organizationLogos } from "./organization-logos";
import { TabBar } from "./TabBar";
import { PartnerPeople } from "./PartnerPeople";
import { Disclosure } from "./controls";
import { LOGO_RULE } from "./file-rules";
import { ImageUploader } from "./ImageUploader";
import { ApplicationCreationWizard } from "./ApplicationCreationWizard";
import { OrganizationApplicationsDirectory } from "./OrganizationApplicationsDirectory";
import { ApplicationWorkspace } from "./ApplicationWorkspace";
import {
  applicationPermissionDescription,
  applicationPermissionLabel,
} from "./display-labels";

type Props = {
  organizationId: string;
  csrfToken: string;
  canManage: boolean;
  isAdmin: boolean;
  onBack: () => void;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
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
  onToast,
}: Props) {
  const peopleApi = useMemo(
    () => teamPeopleApi(organizationId, csrfToken),
    [organizationId, csrfToken],
  );
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
    try {
      await action();
      setDetail(await getOrganization(organizationId));
      setPermissionEditing(null);
      onToast(notice, "success");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        onToast(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível atualizar a permissão.",
          "error",
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
    organizationLogos.invalidate(organizationId);
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

  async function copyIdentifier() {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(detail.id);
      setIdentifierNotice("Identificador copiado.");
    } catch {
      setIdentifierNotice("Selecione o identificador para copiar.");
    }
  }

  const openApplication =
    detail && section === "application" && selectedApplicationId
      ? (detail.applications.find(
          (item) => item.id === selectedApplicationId,
        ) ?? null)
      : null;
  const activeApplications = detail
    ? detail.applications.filter((item) => item.status === "active").length
    : 0;

  return (
    <section className="page partner-detail" aria-labelledby="detail-title">
      <Breadcrumbs
        items={[
          { label: "Parceiros", onSelect: onBack },
          ...(detail
            ? [
                {
                  label: detail.name,
                  onSelect: openApplication
                    ? () => setSelectedApplicationId(null)
                    : undefined,
                },
                ...(openApplication ? [{ label: openApplication.name }] : []),
              ]
            : []),
        ]}
      />
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
          <header
            className="card partner-head"
            data-compact={openApplication ? "true" : "false"}
          >
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
            <div
              className="partner-head-stats"
              aria-hidden={openApplication !== null}
            >
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
            </div>
          </header>
          {!openApplication && (
            <TabBar
              label="Área da parceria"
              idBase="partner"
              panelId="partner-panel"
              active={section}
              onChange={(id) => setSection(id as "application" | "partnership")}
              tabs={[
                {
                  id: "application",
                  label: "Integrações",
                  icon: "webhook",
                  badge: {
                    tone: "neutral",
                    label: String(detail.applications.length),
                    sr: `${detail.applications.length} aplicações`,
                  },
                },
                { id: "partnership", label: "Dados da parceria", icon: "grid" },
              ]}
            />
          )}
          <div
            id="partner-panel"
            {...(openApplication
              ? {}
              : {
                  role: "tabpanel",
                  "aria-labelledby": `partner-tab-${section}`,
                })}
          >
            {section === "application" && selectedApplicationId && (
              <>
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
                  onTogglePermission={(applicationId, code, granted, reason) =>
                    void changePermission(
                      () =>
                        granted
                          ? revokeApplicationPermission(
                              applicationId,
                              code,
                              csrfToken,
                              reason,
                            )
                          : grantApplicationPermission(
                              applicationId,
                              code,
                              csrfToken,
                              reason,
                            ),
                      `${applicationId}:${code}`,
                      granted ? "Permissão revogada." : "Permissão concedida.",
                    )
                  }
                  additionalApplication={null}
                  onDeleteApplication={
                    isAdmin
                      ? () => {
                          setSelectedApplicationId(null);
                          setRevision((value) => value + 1);
                          onToast(
                            "Aplicação excluída. O histórico foi mantido.",
                            "success",
                          );
                        }
                      : undefined
                  }
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

                  {isAdmin && (
                    <OrganizationAdmin
                      organizationId={organizationId}
                      organizationName={detail.name}
                      status={detail.status}
                      cnpjMasked={detail.cnpj_masked}
                      csrf={csrfToken}
                      onChanged={async () =>
                        setDetail(await getOrganization(organizationId))
                      }
                      onUnauthorized={onUnauthorized}
                      onToast={onToast}
                    />
                  )}

                  <PartnerPeople
                    api={peopleApi}
                    organizationName={detail.name}
                    canManage={isAdmin}
                    onUnauthorized={onUnauthorized}
                    onToast={onToast}
                  />

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
                </div>

                <section
                  className="card partner-catalog"
                  aria-labelledby="catalog-title"
                >
                  <div className="card-header">
                    <h2 className="card-title" id="catalog-title">
                      Catálogo de ações
                    </h2>
                    <div className="people-header-actions">
                      <span className="badge badge-neutral">
                        {detail.permissions.length}
                      </span>
                      {canManage && (
                        <PermissionRegistration
                          organizationId={organizationId}
                          csrfToken={csrfToken}
                          registered={detail.permissions.map((p) => p.code)}
                          onRegistered={async () =>
                            setDetail(await getOrganization(organizationId))
                          }
                          onUnauthorized={onUnauthorized}
                          onToast={onToast}
                        />
                      )}
                    </div>
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
