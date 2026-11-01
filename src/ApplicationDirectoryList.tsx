import type { Application } from "./application-directory-model";
import { ApplicationDirectoryTable } from "./ApplicationDirectoryTable";

export function ApplicationDirectoryList({
  applications,
  visible,
  selected,
  query,
  filter,
  canManage,
  canSelectMore,
  canSelectAllVisible,
  allVisibleSelected,
  hiddenSelectedCount,
  onQuery,
  onFilter,
  onSelectVisible,
  onChangeSelection,
  onClearSelection,
  onBulk,
  onOpen,
}: {
  applications: Application[];
  visible: Application[];
  selected: string[];
  query: string;
  filter: string;
  canManage: boolean;
  canSelectMore: boolean;
  canSelectAllVisible: boolean;
  allVisibleSelected: boolean;
  hiddenSelectedCount: number;
  onQuery: (value: string) => void;
  onFilter: (value: string) => void;
  onSelectVisible: (checked: boolean) => void;
  onChangeSelection: (id: string, checked: boolean) => void;
  onClearSelection: () => void;
  onBulk: () => void;
  onOpen: (id: string) => void;
}) {
  return (
    <>
      <div className="appdir-toolbar">
        <div className="form-field">
          <label className="form-field-label" htmlFor="appdir-query">
            Buscar aplicação
          </label>
          <input
            id="appdir-query"
            className="input"
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Buscar pelo nome"
          />
        </div>
        <div className="form-field">
          <label className="form-field-label" htmlFor="appdir-filter">
            Estado
          </label>
          <select
            id="appdir-filter"
            className="input"
            value={filter}
            onChange={(event) => onFilter(event.target.value)}
          >
            <option value="all">Todos os estados</option>
            <option value="active">Ativas</option>
            <option value="suspended">Suspensas</option>
          </select>
        </div>
      </div>
      <p className="form-hint" role="status">
        {visible.length}{" "}
        {visible.length === 1 ? "aplicação exibida" : "aplicações exibidas"}
        {selected.length > 0 ? ` · ${selected.length} selecionadas` : ""}
        {canManage && !canSelectAllVisible && visible.length > 0
          ? " · Para selecionar todas, refine a lista ou limpe a seleção. O lote aceita até 50 aplicações."
          : ""}
      </p>
      {visible.length === 0 ? (
        <div className="empty-state" role="status">
          <strong>Nenhuma aplicação encontrada</strong>
          <span>
            {applications.length
              ? "Ajuste a busca ou o estado."
              : "Cadastre a primeira aplicação desta parceria."}
          </span>
        </div>
      ) : (
        <ApplicationDirectoryTable
          visible={visible}
          selected={selected}
          canManage={canManage}
          canSelectMore={canSelectMore}
          canSelectAllVisible={canSelectAllVisible}
          allVisibleSelected={allVisibleSelected}
          onSelectVisible={onSelectVisible}
          onChangeSelection={onChangeSelection}
          onOpen={onOpen}
        />
      )}
      {canManage && selected.length > 0 && (
        <div
          className="appdir-selection card"
          role="region"
          aria-label="Seleção"
        >
          <span>
            <strong>{selected.length}</strong> selecionadas · limite de 50
            {hiddenSelectedCount > 0 && (
              <small>
                {hiddenSelectedCount} fora do filtro atual; também serão
                incluídas na edição.
              </small>
            )}
          </span>
          <div className="appdir-actions">
            <button
              type="button"
              className="btn btn-ghost btn-md"
              onClick={() => onClearSelection()}
            >
              Limpar seleção
            </button>
            <button
              type="button"
              className="btn btn-primary btn-md"
              disabled={selected.length < 2}
              onClick={onBulk}
            >
              Editar em massa
            </button>
          </div>
        </div>
      )}
    </>
  );
}
