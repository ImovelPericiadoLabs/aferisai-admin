import type { OrganizationDetail as Detail } from "./api";
import { Disclosure } from "./controls";
import type { OrganizationProfileState } from "./useOrganizationProfile";

export function OrganizationProfileCard({
  detail,
  canManage,
  profile,
}: {
  detail: Detail;
  canManage: boolean;
  profile: OrganizationProfileState;
}) {
  const {
    editing,
    setEditing,
    name,
    setName,
    description,
    setDescription,
    saving,
    saveError,
    saved,
    identifierNotice,
    startEditing,
    saveProfile,
    copyIdentifier,
  } = profile;
  return (
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
              <label className="form-field-label" htmlFor="profile-name">
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
              <label className="form-field-label" htmlFor="profile-description">
                Descrição institucional
              </label>
              <textarea
                id="profile-description"
                className="input"
                maxLength={2000}
                rows={5}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
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
                {detail.description?.trim() || "Nenhuma descrição cadastrada."}
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
  );
}
