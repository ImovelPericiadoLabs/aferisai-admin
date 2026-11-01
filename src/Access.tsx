import { useState } from "react";
import type { Role } from "./access-matrix";
import { ApplicationPermissions } from "./AccessApplicationPermissions";
import { MyAccess, RoleMatrix } from "./AccessRoles";
import "./access.css";

type Tab = "mine" | "roles" | "apps";

const tabs: { id: Tab; label: string }[] = [
  { id: "mine", label: "Meu acesso" },
  { id: "roles", label: "Papéis" },
  { id: "apps", label: "Aplicações" },
];

export function Access({
  role,
  csrf,
  onUnauthorized,
}: {
  role: Role;
  csrf: string;
  onUnauthorized: () => void;
}) {
  const [tab, setTab] = useState<Tab>("mine");
  return (
    <section className="page access" aria-labelledby="access-title">
      <header className="page-header">
        <div>
          <h1 className="page-title" id="access-title">
            Permissões
          </h1>
          <p className="page-subtitle">
            O que cada papel pode fazer e quais permissões cada aplicação
            parceira recebeu.
          </p>
        </div>
      </header>
      <div className="seg-tabs" role="tablist" aria-label="Permissões">
        {tabs.map((item) => (
          <button
            key={item.id}
            id={`access-tab-${item.id}`}
            className={`seg-tab${tab === item.id ? " active" : ""}`}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            aria-controls={`access-panel-${item.id}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        id={`access-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`access-tab-${tab}`}
      >
        {tab === "mine" && <MyAccess role={role} />}
        {tab === "roles" && <RoleMatrix role={role} />}
        {tab === "apps" && (
          <ApplicationPermissions
            role={role}
            csrf={csrf}
            onUnauthorized={onUnauthorized}
          />
        )}
      </div>
    </section>
  );
}
