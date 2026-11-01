import { Icon } from "./DashboardIcon";

export function PageIntro({
  title,
  description,
  fetchedAt,
  onRefresh,
  loading,
}: {
  title: string;
  description: string;
  fetchedAt: Date | null;
  onRefresh: () => void;
  loading: boolean;
}) {
  return (
    <header className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{description}</p>
      </div>
      <div className="dash-intro-actions">
        {fetchedAt && (
          <span className="dash-updated">
            Consultado nesta tela às{" "}
            {fetchedAt.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
        <button
          className="btn btn-secondary btn-sm"
          type="button"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Atualizar métricas"
        >
          <Icon name="refresh" /> Atualizar
        </button>
      </div>
    </header>
  );
}

export function LoadingState() {
  return (
    <div
      className="dash-loading"
      role="status"
      aria-label="Carregando métricas"
      aria-busy="true"
    >
      <div className="dash-skeleton dash-skeleton-lead" />
      <div className="dash-skeleton-grid">
        {[0, 1, 2, 3].map((index) => (
          <div className="dash-skeleton-card" key={index}>
            <div className="dash-skeleton dash-skeleton-icon" />
            <div className="dash-skeleton dash-skeleton-title" />
            <div className="dash-skeleton dash-skeleton-value" />
            <div className="dash-skeleton dash-skeleton-line" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MessageState({
  kind,
  retry,
}: {
  kind: "error" | "empty";
  retry?: () => void;
}) {
  return (
    <div className="dash-message" role={kind === "error" ? "alert" : "status"}>
      <span className="dash-message-icon">
        <Icon name={kind === "error" ? "refresh" : "empty"} />
      </span>
      <h2>
        {kind === "error"
          ? "Não foi possível carregar as métricas"
          : "Ainda não há contagens disponíveis"}
      </h2>
      <p>
        {kind === "error"
          ? "Confira a conexão e tente consultar novamente."
          : "Os dados autorizados para seu perfil aparecerão aqui quando estiverem disponíveis."}
      </p>
      {retry && (
        <button type="button" className="dash-button" onClick={retry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
