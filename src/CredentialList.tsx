import type { PartnerCredential } from "./api";
import { IntegrationIcon } from "./IntegrationIcon";
import { credentialState, expiryNote } from "./credential-model";

export function CredentialList({
  items,
  onOpen,
}: {
  items: PartnerCredential[];
  onOpen: (id: string) => void;
}) {
  return (
    <ul className="cred-list" aria-label="Credenciais">
      {items.map((credential) => {
        const state = credentialState(credential);
        const scopes = credential.scopes ?? [];
        return (
          <li key={credential.id}>
            <button
              type="button"
              className="cred-row"
              data-state={state.key}
              data-credential-id={credential.id}
              aria-haspopup="dialog"
              onClick={() => onOpen(credential.id)}
            >
              <span className="cred-key" aria-hidden="true">
                <IntegrationIcon name="key" size={16} />
              </span>
              <span className="cred-main">
                <strong>{credential.name || "Credencial sem nome"}</strong>
                <code>{credential.client_id}</code>
              </span>
              <span className="cred-scopes-count">
                {scopes.length
                  ? `${scopes.length} permiss${scopes.length === 1 ? "ão" : "ões"}`
                  : "—"}
              </span>
              <span className="cred-expiry">{expiryNote(credential)}</span>
              <span className={`badge badge-${state.tone}`}>{state.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
