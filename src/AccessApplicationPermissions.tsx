import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  getOrganization,
  grantApplicationPermission,
  revokeApplicationPermission,
  type OrganizationDetail,
} from "./api";
import { canEditApplicationPermissions, type Role } from "./access-matrix";
import { ConfirmDialog } from "./ConfirmDialog";
import { scopeLabel } from "./display-labels";
import { EntityPicker } from "./EntityPicker";
import { resolveOrganization, searchOrganizations } from "./lookups";
import { buildPermissionMatrix } from "./permission-matrix";

const UNKNOWN_SCOPE = scopeLabel("");

function codeLabel(code: string, description: string | undefined): string {
  const known = scopeLabel(code);
  return known !== UNKNOWN_SCOPE ? known : (description ?? code);
}
type DetailState = {
  id: string;
  revision: number;
  data?: OrganizationDetail;
  failed?: boolean;
};

type Pending = {
  applicationId: string;
  applicationName: string;
  code: string;
  grant: boolean;
};

export function ApplicationPermissions({
  role,
  csrf,
  onUnauthorized,
}: {
  role: Role;
  csrf: string;
  onUnauthorized: () => void;
}) {
  const [organizationId, setOrganizationId] = useState("");
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<DetailState | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  useEffect(() => {
    if (!organizationId) return;
    let live = true;
    getOrganization(organizationId)
      .then((data) => {
        if (live) setState({ id: organizationId, revision, data });
      })
      .catch((cause: unknown) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setState({ id: organizationId, revision, failed: true });
      });
    return () => {
      live = false;
    };
  }, [organizationId, revision, onUnauthorized]);

  const current =
    state?.id === organizationId && state.revision === revision ? state : null;
  const matrix = useMemo(
    () => (current?.data ? buildPermissionMatrix(current.data) : null),
    [current],
  );
  const mayEdit = canEditApplicationPermissions(role);

  async function apply(target: Pending) {
    setBusy(true);
    setNotice(null);
    try {
      if (target.grant)
        await grantApplicationPermission(
          target.applicationId,
          target.code,
          csrf,
        );
      else
        await revokeApplicationPermission(
          target.applicationId,
          target.code,
          csrf,
        );
      setNotice({
        ok: true,
        text: target.grant ? "Permissão concedida." : "Permissão revogada.",
      });
      setRevision((value) => value + 1);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setNotice({
          ok: false,
          text:
            cause instanceof ApiError
              ? cause.detail
              : "Não foi possível alterar a permissão. Tente novamente.",
        });
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  return (
    <div className="access-apps">
      <div className="access-picker">
        <EntityPicker
          id="access-organization"
          label="Organização"
          placeholder="Buscar organização pelo nome"
          value={organizationId}
          search={searchOrganizations}
          resolve={resolveOrganization}
          onUnauthorized={onUnauthorized}
          onChange={(id) => {
            setOrganizationId(id);
            setNotice(null);
          }}
        />
      </div>
      {!mayEdit && (
        <div className="alert" role="note">
          Seu papel só consulta as permissões. Conceder e revogar é para gestor
          e administrador.
        </div>
      )}
      {notice && (
        <div
          className={`alert ${notice.ok ? "alert-success" : "alert-danger"}`}
          role={notice.ok ? "status" : "alert"}
        >
          {notice.text}
        </div>
      )}
      {!organizationId ? (
        <div className="empty-state" role="status">
          <strong>Escolha uma organização</strong>
          <span>
            Você verá quais permissões do catálogo cada aplicação recebeu.
          </span>
        </div>
      ) : !current ? (
        <div className="access-skeleton" role="status" aria-label="Carregando">
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      ) : current.failed ? (
        <div className="error-state" role="alert">
          <strong>Não foi possível consultar a organização</strong>
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            onClick={() => setRevision((value) => value + 1)}
          >
            Tentar novamente
          </button>
        </div>
      ) : matrix && matrix.rows.length === 0 ? (
        <div className="empty-state" role="status">
          <strong>Sem aplicações</strong>
          <span>Esta organização ainda não tem aplicações.</span>
        </div>
      ) : matrix && matrix.codes.length === 0 ? (
        <div className="empty-state" role="status">
          <strong>Catálogo vazio</strong>
          <span>Esta organização não tem permissões no catálogo.</span>
        </div>
      ) : (
        matrix && (
          <div className="data-table-wrap">
            <table className="data-table access-matrix" aria-label="Aplicações">
              <thead>
                <tr>
                  <th scope="col">Aplicação</th>
                  {matrix.codes.map((item) => (
                    <th key={item.code} scope="col">
                      {codeLabel(item.code, item.description)}
                      <span className="access-code">{item.code}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.rows.map((row) => (
                  <tr key={row.id}>
                    <th scope="row">
                      {row.name}
                      {(row.lockedReason || !mayEdit) && (
                        <span className="access-locked">
                          {row.lockedReason ??
                            "Somente leitura para o seu papel."}
                        </span>
                      )}
                    </th>
                    {matrix.codes.map((item) => {
                      const granted = row.granted[item.code];
                      const allowed = mayEdit && row.editable;
                      const why = !mayEdit
                        ? "Somente leitura para o seu papel."
                        : row.lockedReason;
                      return (
                        <td key={item.code}>
                          <button
                            className={`perm-toggle${granted ? " on" : ""}`}
                            type="button"
                            aria-pressed={granted}
                            disabled={!allowed || busy}
                            title={allowed ? undefined : (why ?? undefined)}
                            onClick={() =>
                              setPending({
                                applicationId: row.id,
                                applicationName: row.name,
                                code: item.code,
                                grant: !granted,
                              })
                            }
                          >
                            {granted ? "Concedida" : "Não concedida"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
      <ConfirmDialog
        open={pending !== null}
        tone={pending && !pending.grant ? "danger" : "primary"}
        title={
          pending?.grant
            ? "Conceder esta permissão?"
            : "Revogar esta permissão?"
        }
        description={
          pending?.grant
            ? "A aplicação passa a poder usar esta permissão nas próximas chamadas."
            : "A aplicação perde a permissão imediatamente. O que já foi autorizado por titulares deixa de valer para esta ação."
        }
        details={[
          { label: "Aplicação", value: pending?.applicationName ?? "" },
          {
            label: "Permissão",
            value: pending
              ? codeLabel(
                  pending.code,
                  matrix?.codes.find((item) => item.code === pending.code)
                    ?.description,
                )
              : "",
          },
        ]}
        confirmLabel={pending?.grant ? "Conceder" : "Revogar"}
        busy={busy}
        onConfirm={() => pending && void apply(pending)}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
