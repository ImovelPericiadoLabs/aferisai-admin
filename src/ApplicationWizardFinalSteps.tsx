import {
  applicationPermissionDescription,
  applicationPermissionGlyph,
  applicationPermissionLabel,
} from "./display-labels";
import type { Dispatch, SetStateAction } from "react";
import type { Permission } from "./application-wizard-model";

export function ApplicationWizardPermissionsStep({
  id,
  permissionOptions,
  selectedPermissions,
  setSelectedPermissions,
}: {
  id: string;
  permissionOptions: Permission[];
  selectedPermissions: string[];
  setSelectedPermissions: Dispatch<SetStateAction<string[]>>;
}) {
  return (
    <div className="app-wizard-section">
      <div className="app-wizard-section-heading">
        <h4>Permissões</h4>
        <p>
          Escolha os acessos desta aplicação. O usuário parceiro só verá as
          integrações da própria empresa.
        </p>
      </div>
      <ul className="app-wizard-permissions">
        <li className="app-wizard-permission-required">
          <span className="app-wizard-permission-icon" aria-hidden="true">
            {applicationPermissionGlyph("application:read")}
          </span>
          <span>
            <strong>{applicationPermissionLabel("application:read")}</strong>
            <small>
              {applicationPermissionDescription("application:read")}
            </small>
          </span>
          <span className="app-wizard-required">Obrigatória</span>
        </li>
        {permissionOptions.map((permission, index) => (
          <li
            key={permission.code}
            className={
              selectedPermissions.includes(permission.code) ? "is-selected" : ""
            }
          >
            <label
              htmlFor={`${id}-permission-${index}`}
              className="app-wizard-permission-option"
            >
              <span className="app-wizard-permission-icon" aria-hidden="true">
                {applicationPermissionGlyph(permission.code, index + 1)}
              </span>
              <span>
                <strong>{applicationPermissionLabel(permission.code)}</strong>
                <small>
                  {applicationPermissionDescription(
                    permission.code,
                    permission.description,
                  )}
                </small>
              </span>
              <input
                id={`${id}-permission-${index}`}
                type="checkbox"
                checked={selectedPermissions.includes(permission.code)}
                onChange={(event) =>
                  setSelectedPermissions((items) =>
                    event.target.checked
                      ? [...items, permission.code]
                      : items.filter((code) => code !== permission.code),
                  )
                }
              />
            </label>
          </li>
        ))}
      </ul>
      {permissionOptions.length === 0 && (
        <p className="app-wizard-inline-note">
          Nenhuma permissão adicional está disponível no catálogo desta empresa.
        </p>
      )}
    </div>
  );
}

export function ApplicationWizardReviewStep({
  name,
  organizationName,
  callbacks,
  selectedPermissions,
  attempt,
  created,
  saveError,
}: {
  name: string;
  organizationName: string;
  callbacks: string[];
  selectedPermissions: string[];
  attempt: boolean;
  created: boolean;
  saveError: string;
}) {
  return (
    <div className="app-wizard-section">
      <div className="app-wizard-section-heading">
        <h4>Revisão</h4>
        <p>Confira os dados antes de criar a aplicação.</p>
      </div>
      <dl className="app-wizard-review">
        <div>
          <dt>Aplicação</dt>
          <dd>{name.trim()}</dd>
        </div>
        <div>
          <dt>Empresa</dt>
          <dd>{organizationName}</dd>
        </div>
        <div>
          <dt>URLs de retorno</dt>
          <dd>
            {callbacks.length ? callbacks.join(" · ") : "Nenhuma por enquanto"}
          </dd>
        </div>
        <div>
          <dt>Permissões</dt>
          <dd>
            {selectedPermissions
              .map((code) => applicationPermissionLabel(code))
              .join(" · ")}
          </dd>
        </div>
      </dl>
      <p className="app-wizard-inline-note">
        Após salvar, configure o webhook e emita uma credencial no detalhe da
        aplicação. Essas etapas não ativam eventos automaticamente.
      </p>
      {attempt && (
        <p className="app-wizard-retry">
          {created
            ? "Aplicação criada; concluindo configurações pendentes."
            : "Tentativa em andamento."}{" "}
          O mesmo identificador será usado ao tentar novamente.
        </p>
      )}
      {saveError && (
        <p className="app-wizard-save-error" role="alert">
          {saveError}
        </p>
      )}
    </div>
  );
}

export function ApplicationWizardPreview({
  name,
  organizationName,
  callbacks,
  selectedPermissions,
}: {
  name: string;
  organizationName: string;
  callbacks: string[];
  selectedPermissions: string[];
}) {
  return (
    <aside className="app-wizard-preview" aria-label="Prévia da aplicação">
      <p className="app-wizard-preview-kicker">Prévia da aplicação</p>
      <h4>{name.trim() || "Nome da aplicação"}</h4>
      <p className="app-wizard-preview-org">{organizationName}</p>
      <dl>
        <div>
          <dt>Retornos OAuth</dt>
          <dd>{callbacks.length}</dd>
        </div>
        <div>
          <dt>Permissões</dt>
          <dd>{selectedPermissions.length}</dd>
        </div>
        <div>
          <dt>Webhook</dt>
          <dd>Configurar após criar</dd>
        </div>
      </dl>
      <p className="app-wizard-preview-note">
        O acesso da aplicação permanece limitado às permissões selecionadas.
      </p>
    </aside>
  );
}
