import type { RegistrySupplierAccount } from "./api";
import { RegistryCommercialTerms } from "./RegistryCommercialTerms";
import type { ToastKind } from "./useToast";

export function SupplierCommercialTab({
  account,
  activeOnrAccount,
  csrf,
  onUnauthorized,
  onToast,
}: {
  account: RegistrySupplierAccount;
  activeOnrAccount: RegistrySupplierAccount | undefined;
  csrf: string;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
}) {
  return (
    <>
      {(account.provider === "onr" || activeOnrAccount) && (
        <>
          {account.provider !== "onr" && (
            <p className="sup-muted">
              A reserva de IA é a mesma para visualização InfoSimples e pedidos
              RI Digital. A versão comercial pertence à conta RI Digital ativa e
              vale somente para novas cotações.
            </p>
          )}
          <RegistryCommercialTerms
            key={account.provider === "onr" ? account.id : activeOnrAccount?.id}
            accountId={
              account.provider === "onr" ? account.id : activeOnrAccount!.id
            }
            active={
              account.provider === "onr"
                ? account.status === "active"
                : !!activeOnrAccount
            }
            csrf={csrf}
            onUnauthorized={onUnauthorized}
            onToast={onToast}
          />
        </>
      )}
      {account.provider !== "onr" && !activeOnrAccount && (
        <p className="alert alert-warning" role="status">
          Ative uma conta RI Digital para publicar a reserva de IA
          compartilhada.
        </p>
      )}
    </>
  );
}
