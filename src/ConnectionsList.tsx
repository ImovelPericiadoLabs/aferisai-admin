import { useState } from "react";
import {
  useApplicationIdentities,
  type ApplicationIdentity,
} from "./application-identity";
import type { TeamConnection } from "./api";
import { groupScopes, partnerLinks, shortId } from "./connection-model";
import "./connections.css";

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function Logo({ name, url }: { name: string; url: string | null }) {
  return (
    <span className="cx-logo" aria-hidden="true">
      {url ? (
        <img src={url} alt="" referrerPolicy="no-referrer" />
      ) : (
        name.slice(0, 1).toLocaleUpperCase("pt-BR")
      )}
    </span>
  );
}

function CopyId({ label, value }: { label: string; value: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("done");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 1600);
  }
  return (
    <div className="cx-id">
      <dt>{label}</dt>
      <dd>
        <code title={value}>{shortId(value)}</code>
        <button type="button" onClick={() => void copy()}>
          {state === "done"
            ? "Copiado"
            : state === "failed"
              ? "Falhou"
              : "Copiar"}
        </button>
      </dd>
    </div>
  );
}

function Connection({
  item,
  identity,
  canRevoke,
  revoking,
  onRevoke,
}: {
  item: TeamConnection;
  identity: ApplicationIdentity | undefined;
  canRevoke: boolean;
  revoking: boolean;
  onRevoke: (id: string) => void;
}) {
  const name = identity?.name ?? "Aplicação parceira";
  const links = partnerLinks(identity?.profile);
  const groups = groupScopes(item.scopes);
  const granted = new Date(item.granted_at);
  return (
    <li className="cx-item">
      <header className="cx-head">
        <Logo name={name} url={identity?.logoUrl ?? null} />
        <div className="cx-who">
          <h2>{name}</h2>
          <p>
            {identity?.organizationName
              ? `Parceira ${identity.organizationName}`
              : identity
                ? "Organização não identificada"
                : "Carregando parceria…"}
          </p>
          {links.length > 0 && (
            <ul className="cx-links" aria-label={`Links de ${name}`}>
              {links.map((link) => (
                <li key={link.label}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer">
                    {link.label}
                    <span className="sr-only"> (abre em nova aba)</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="cx-side">
          <p>
            Conectado em <strong>{dateFormat.format(granted)}</strong>
          </p>
          {canRevoke && (
            <button
              type="button"
              className="cx-revoke"
              disabled={revoking}
              onClick={() => onRevoke(item.id)}
            >
              Revogar conexão
            </button>
          )}
        </div>
      </header>

      <details className="cx-more">
        <summary>
          <span className="cx-count">
            {item.scopes.length}{" "}
            {item.scopes.length === 1 ? "permissão" : "permissões"}
          </span>
          <span className="cx-summary">
            {groups
              .map((group) => `${group.label} ${group.items.length}`)
              .join(" · ")}
          </span>
        </summary>
        <dl className="cx-scopes">
          {groups.map((group) => (
            <div key={group.id} className="cx-group">
              <dt>{group.label}</dt>
              <dd>
                {group.items.map((scope) => (
                  <span key={scope.code}>{scope.label}</span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        <dl className="cx-ids">
          <CopyId label="Conexão" value={item.id} />
          <CopyId label="Titular" value={item.user_id} />
          <CopyId label="Aplicação" value={item.application_id} />
          <div className="cx-id">
            <dt>Versão da autorização</dt>
            <dd>{item.grant_version}</dd>
          </div>
        </dl>
      </details>
    </li>
  );
}

export function ConnectionsList({
  items,
  canRevoke,
  revoking,
  onRevoke,
}: {
  items: TeamConnection[];
  canRevoke: boolean;
  revoking: boolean;
  onRevoke: (id: string) => void;
}) {
  const identities = useApplicationIdentities(items);
  return (
    <ul className="cx-list" aria-label="Conexões ativas">
      {items.map((item) => (
        <Connection
          key={item.id}
          item={item}
          identity={identities.get(item.application_id)}
          canRevoke={canRevoke}
          revoking={revoking}
          onRevoke={onRevoke}
        />
      ))}
    </ul>
  );
}
