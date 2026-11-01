import type { Application } from "./application-workspace-model";
import { FieldAction } from "./FieldAction";

export function ApplicationSwitcher({
  applications,
  activeId,
  hasMoreApplications,
  loadingMoreApplications,
  onLoadMoreApplications,
  onSwitch,
}: {
  applications: Application[];
  activeId: string;
  hasMoreApplications: boolean;
  loadingMoreApplications: boolean;
  onLoadMoreApplications?: () => void;
  onSwitch: (id: string) => void;
}) {
  return (
    <div className="appws-switch">
      <FieldAction
        id="appws-switch-select"
        label="Trocar aplicação"
        action={
          hasMoreApplications && onLoadMoreApplications ? (
            <button
              type="button"
              className="btn btn-secondary btn-md"
              disabled={loadingMoreApplications}
              onClick={onLoadMoreApplications}
            >
              {loadingMoreApplications
                ? "Carregando…"
                : "Carregar mais aplicações"}
            </button>
          ) : null
        }
      >
        <select
          id="appws-switch-select"
          className="input"
          value={activeId}
          onChange={(event) => onSwitch(event.target.value)}
        >
          {applications.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {item.status === "active" ? "Ativa" : "Suspensa"}
            </option>
          ))}
        </select>
      </FieldAction>
    </div>
  );
}
