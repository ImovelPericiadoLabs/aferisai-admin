import type { ComponentProps, FormEvent } from "react";
import { EntityPicker } from "./EntityPicker";
import { resolveOrganization, searchOrganizations } from "./lookups";

type PickerSearch = ComponentProps<typeof EntityPicker>["search"];
type PickerResolve = ComponentProps<typeof EntityPicker>["resolve"];

export function ConnectionsFilter({
  orgFilter,
  appFilter,
  activeFilter,
  loading,
  applicationsSearch,
  applicationResolver,
  onUnauthorized,
  onOrganizationChange,
  onApplicationChange,
  onSubmit,
  onClear,
}: {
  orgFilter: string;
  appFilter: string;
  activeFilter: string;
  loading: boolean;
  applicationsSearch: PickerSearch;
  applicationResolver: PickerResolve;
  onUnauthorized: () => void;
  onOrganizationChange: (id: string) => void;
  onApplicationChange: (id: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: "flex",
        gap: "0.6rem",
        marginBottom: "1.5rem",
        flexWrap: "wrap",
        alignItems: "flex-start",
      }}
    >
      <div style={{ flex: "1 1 240px", maxWidth: "320px" }}>
        <EntityPicker
          onUnauthorized={onUnauthorized}
          id="org-filter"
          label="Organização"
          hint="Escolha a organização para listar as aplicações dela."
          placeholder="Buscar organização"
          value={orgFilter}
          search={searchOrganizations}
          resolve={resolveOrganization}
          onChange={onOrganizationChange}
        />
      </div>
      <div style={{ flex: "1 1 240px", maxWidth: "320px" }}>
        <EntityPicker
          onUnauthorized={onUnauthorized}
          id="app-filter"
          label="Aplicação"
          placeholder={
            orgFilter ? "Buscar aplicação" : "Escolha a organização primeiro"
          }
          disabled={!orgFilter}
          value={appFilter}
          search={applicationsSearch}
          resolve={applicationResolver}
          cacheKey={orgFilter}
          onChange={onApplicationChange}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div className="picker" aria-hidden="true">
          <label className="form-field-label">&nbsp;</label>
        </div>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button
            type="submit"
            className="btn btn-secondary btn-md"
            disabled={loading || !appFilter}
          >
            Filtrar
          </button>
          {activeFilter && (
            <button
              type="button"
              className="btn btn-secondary btn-md"
              onClick={onClear}
            >
              Limpar filtro
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
