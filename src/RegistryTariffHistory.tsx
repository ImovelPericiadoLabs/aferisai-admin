import type { RegistryArispTariff, RegistryCertificateTariff } from "./api";
import { certificateKinds, money } from "./registry-optional-tariffs-model";
import { supplierTariffValidityLabel } from "./supplier-tariff-validity";

export function CertificateTariffHistory({
  items,
}: {
  items: RegistryCertificateTariff[];
}) {
  return (
    <ul className="sup-tariff-list">
      {items.map((item) => (
        <li key={item.id}>
          <strong>
            {certificateKinds.find((kind) => kind.value === item.code)?.label ??
              item.code}
            {item.state ? ` · ${item.state}` : ""}
          </strong>
          <span>
            {money(item.unit_cost_cents)} ·{" "}
            {supplierTariffValidityLabel(item.valid_until)}
          </span>
          <small>
            {item.operational_attestation
              ? "Disponibilidade declarada pelo administrador"
              : item.sample_document_sha256 && item.sample_charge_sha256
                ? "Arquivos de entrega conferidos"
                : "Sem comprovação de entrega"}
          </small>
        </li>
      ))}
    </ul>
  );
}

export function ArispTariffHistory({
  items,
}: {
  items: RegistryArispTariff[];
}) {
  return (
    <ul className="sup-tariff-list">
      {items.map((item) => (
        <li key={item.id}>
          <strong>Reserva da API {money(item.budget_cents)}</strong>
          <span>
            Pedido {money(item.order_fee_cents)} · download{" "}
            {money(item.download_fee_cents)} × {item.download_budget_count}
          </span>
          <small>
            {item.certificate_type
              ? `Tipo ${item.certificate_type} comprovado`
              : "Tipo de ônus não comprovado"}{" "}
            · {supplierTariffValidityLabel(item.valid_until)}
          </small>
        </li>
      ))}
    </ul>
  );
}
