import type {
  RegistrySupplierAccount,
  RegistryVisualizationTariff,
} from "./api";
import { emptyTariffDraft, type TariffDraft } from "./registry-tariff-model";
import { supplierTariffValidityLabel } from "./supplier-tariff-validity";

export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);

export function tariffStatus(item: RegistryVisualizationTariff) {
  return supplierTariffValidityLabel(item.valid_until);
}

export function draftFor(
  account: RegistrySupplierAccount,
  accounts: RegistrySupplierAccount[],
): TariffDraft {
  const only = (provider: RegistrySupplierAccount["provider"]) => {
    const active = accounts.filter(
      (item) => item.provider === provider && item.status === "active",
    );
    return active.length === 1 ? active[0].id : "";
  };
  return {
    ...emptyTariffDraft,
    onrAccountId: account.provider === "onr" ? account.id : only("onr"),
    infosimplesAccountId:
      account.provider === "infosimples" ? account.id : only("infosimples"),
  };
}
