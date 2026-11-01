import type { PolicyChannel, PolicyStatus } from "./commercial-model";

const statusTabs: { value: "" | PolicyStatus; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "draft", label: "Rascunhos" },
  { value: "published", label: "Publicadas" },
  { value: "suspended", label: "Suspensas" },
];

export function CommercialPoliciesToolbar({
  counts,
  statusFilter,
  channelFilter,
  onStatus,
  onChannel,
}: {
  counts: Record<"all" | PolicyStatus, number>;
  statusFilter: "" | PolicyStatus;
  channelFilter: "" | PolicyChannel;
  onStatus: (value: "" | PolicyStatus) => void;
  onChannel: (value: "" | PolicyChannel) => void;
}) {
  return (
    <div className="rules-toolbar">
      <div className="rules-tabs" role="group" aria-label="Filtrar por estado">
        {statusTabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            className="rules-tab"
            aria-pressed={statusFilter === tab.value}
            onClick={() => onStatus(tab.value)}
          >
            {tab.label}
            <span className="rules-tab-count">
              {counts[tab.value === "" ? "all" : tab.value]}
            </span>
          </button>
        ))}
      </div>
      <label className="rules-channel">
        <span className="sr-only">Canal</span>
        <select
          className="input"
          value={channelFilter}
          onChange={(event) =>
            onChannel(event.target.value as "" | PolicyChannel)
          }
        >
          <option value="">Todos os canais</option>
          <option value="site">Site direto</option>
          <option value="integration">Integração</option>
          <option value="promotion">Promoção</option>
        </select>
      </label>
    </div>
  );
}
