import type { RefObject } from "react";
import type { RegistryVisualizationTariff } from "./api";
import type { tariffDraftBody } from "./registry-tariff-model";
import { ComposerSummary, Delta } from "./SupplierUi";
import { money } from "./registry-visualization-tariffs-model";

export function VisualizationTariffSummary({
  orderCents,
  downloadCents,
  reserveCents,
  current,
  reviewing,
  body,
  busy,
  confirmRef,
  accountLabel,
  onPublish,
  onBack,
}: {
  orderCents: number | null;
  downloadCents: number | null;
  reserveCents: number | null;
  current: RegistryVisualizationTariff | undefined;
  reviewing: boolean;
  body: ReturnType<typeof tariffDraftBody>;
  busy: boolean;
  confirmRef: RefObject<HTMLButtonElement | null>;
  accountLabel: (id: string) => string;
  onPublish: () => void;
  onBack: () => void;
}) {
  return (
    <ComposerSummary
      title="Resumo da nova versão"
      total={
        orderCents !== null && downloadCents !== null
          ? money(orderCents + 3 * downloadCents + (reserveCents ?? 0))
          : "—"
      }
      delta={
        orderCents !== null && downloadCents !== null && current ? (
          <>
            <Delta
              current={orderCents + 3 * downloadCents + (reserveCents ?? 0)}
              previous={current.budget_cents}
            />{" "}
            <small className="sup-muted">
              atual {money(current.budget_cents)}
            </small>
          </>
        ) : undefined
      }
      rows={[
        {
          label: "Pedido",
          value: orderCents === null ? "—" : money(orderCents),
        },
        {
          label: "3 × download",
          value: downloadCents === null ? "—" : money(3 * downloadCents),
        },
        {
          label: "Mínimo mensal",
          value: reserveCents === null ? "—" : money(reserveCents),
        },
        { label: "Vigência", value: "Até atualização" },
      ]}
      footer={
        !reviewing ? (
          <button
            type="submit"
            form="vm-tariff-form"
            className="btn btn-primary btn-md"
            disabled={busy}
          >
            Revisar publicação
          </button>
        ) : body ? (
          <div
            className="sup-review"
            role="group"
            aria-label="Confirmar tarifa"
          >
            <p>
              Publicar{" "}
              <strong>
                {money(
                  body.order_fee_cents +
                    3 * body.download_fee_cents +
                    body.monthly_minimum_reserve_cents,
                )}
              </strong>{" "}
              para {accountLabel(body.onr_account_id)} e{" "}
              {accountLabel(body.infosimples_account_id)}. Fica na auditoria e
              vale até a próxima atualização.
            </p>
            <button
              ref={confirmRef}
              type="button"
              className="btn btn-primary btn-md"
              disabled={busy}
              onClick={() => onPublish()}
            >
              {busy ? "Publicando…" : "Confirmar e publicar"}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-md"
              disabled={busy}
              onClick={() => onBack()}
            >
              Voltar
            </button>
          </div>
        ) : null
      }
    />
  );
}
