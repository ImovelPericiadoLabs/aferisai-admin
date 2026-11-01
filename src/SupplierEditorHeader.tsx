import type { RegistrySupplierAccount } from "./api";
import { supplierLabel, supplierStatusView } from "./supplier-model";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function SupplierEditorHeader({
  account,
  busy,
  onClose,
  onStatusAction,
}: {
  account: RegistrySupplierAccount;
  busy: boolean;
  onClose: () => void;
  onStatusAction: (
    action: "activate" | "suspend",
    account: RegistrySupplierAccount,
  ) => void;
}) {
  const status = supplierStatusView(account.status);
  const initials = account.label
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <header className="sup-ed-header">
      <span className="sup-ed-avatar" aria-hidden="true">
        {initials}
      </span>
      <div className="sup-ed-heading">
        <h2 id="supplier-editor-title" className="sup-clip">
          {account.label}
        </h2>
        <p className="sup-clip">
          {supplierLabel(account.provider)} · versão {account.version} ·
          atualizada em {dateTime.format(new Date(account.updated_at))}
        </p>
      </div>
      <span className={`badge badge-${status.tone}`}>{status.label}</span>
      {account.status !== "active" ? (
        <button
          type="button"
          className="btn btn-primary btn-md"
          aria-haspopup="dialog"
          onClick={() => onStatusAction("activate", account)}
        >
          Ativar
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-ghost-danger btn-md"
          aria-haspopup="dialog"
          onClick={() => onStatusAction("suspend", account)}
        >
          Suspender
        </button>
      )}
      <button
        className="btn btn-ghost btn-sm"
        type="button"
        aria-label="Fechar"
        disabled={busy}
        onClick={onClose}
      >
        ✕
      </button>
    </header>
  );
}
