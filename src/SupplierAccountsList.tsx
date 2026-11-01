import { OpsTable, type OpsColumn } from "./OpsTable";
import type { RegistrySupplierAccount } from "./api";
import { dateTime, type Filter } from "./registry-suppliers-model";
import { supplierLabel, supplierStatusView } from "./supplier-model";

export function SupplierAccountsList({
  items,
  visible,
  loading,
  error,
  filter,
  editingId,
  onRetry,
  onOpen,
}: {
  items: RegistrySupplierAccount[];
  visible: RegistrySupplierAccount[];
  loading: boolean;
  error: string;
  filter: Filter;
  editingId: string | null;
  onRetry: () => void;
  onOpen: (item: RegistrySupplierAccount, element: HTMLElement) => void;
}) {
  const columns: OpsColumn<RegistrySupplierAccount>[] = [
    {
      id: "account",
      label: "Conta",
      locked: true,
      render: (item) => (
        <span className="ops-id">
          <strong className="sup-clip ops-name">{item.label}</strong>
          <small>
            {supplierLabel(item.provider)} · versão {item.version}
          </small>
        </span>
      ),
      text: (item) => item.label,
    },
    {
      id: "credential",
      label: "Credencial",
      hideBelow: "tablet",
      render: (item) => (
        <span className="sup-clip">{item.credential_hint}</span>
      ),
      text: (item) => item.credential_hint,
    },
    {
      id: "status",
      label: "Estado",
      render: (item) => {
        const status = supplierStatusView(item.status);
        return (
          <span className={`badge badge-${status.tone}`}>{status.label}</span>
        );
      },
      text: (item) => supplierStatusView(item.status).label,
    },
    {
      id: "updated",
      label: "Atualizada",
      align: "end",
      render: (item) => dateTime.format(new Date(item.updated_at)),
      text: (item) => item.updated_at,
    },
  ];

  return (
    <>
      {loading && items.length === 0 ? (
        <div
          className="prov-skeleton"
          role="status"
          aria-label="Carregando contas"
        >
          {[0, 1, 2].map((index) => (
            <span className="skeleton" key={index} />
          ))}
        </div>
      ) : error && items.length === 0 ? (
        <div className="error-state" role="alert">
          <strong>Não foi possível consultar as contas</strong>
          <span>{error}</span>
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            onClick={onRetry}
          >
            Tentar novamente
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state" role="status">
          <strong>
            {filter ? "Nenhuma conta neste estado" : "Nenhuma conta cadastrada"}
          </strong>
          <span>
            {filter
              ? "Altere o filtro para ver outras contas."
              : "Cadastre a conta do fornecedor para preparar os pedidos registrais. Nenhuma conta está cadastrada nesta instalação."}
          </span>
        </div>
      ) : (
        <>
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          <OpsTable
            label="Contas de fornecedores registrais"
            columns={columns}
            rows={visible}
            rowKey={(item) => item.id}
            hidden={[]}
            density="comfortable"
            selectedKey={editingId}
            onOpen={onOpen}
            card={(item) => {
              const status = supplierStatusView(item.status);
              return (
                <>
                  <span className="ops-card-top">
                    <strong className="sup-clip ops-name">{item.label}</strong>
                    <span className={`badge badge-${status.tone}`}>
                      {status.label}
                    </span>
                  </span>
                  <span className="ops-card-meta sup-clip">
                    {supplierLabel(item.provider)} · {item.credential_hint}
                  </span>
                </>
              );
            }}
          />
        </>
      )}
    </>
  );
}
