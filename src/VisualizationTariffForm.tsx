import type { FormEvent } from "react";
import type { RegistrySupplierAccount } from "./api";
import { ComposerSection } from "./SupplierUi";
import { FilePickButton } from "./EvidenceTools";
import { sha256Hex } from "./evidence-model";
import {
  rangeText,
  type resolveTariffLimits,
  type TariffDraft,
} from "./registry-tariff-model";
import { money } from "./registry-visualization-tariffs-model";
import type { StepState } from "./account-model";

export function VisualizationTariffForm({
  account,
  draft,
  limits,
  states,
  busy,
  evidenceFile,
  activeOnr,
  activeInfo,
  orderCents,
  downloadCents,
  reserveCents,
  set,
  setEvidenceFile,
  setError,
  onSubmit,
}: {
  account: RegistrySupplierAccount;
  draft: TariffDraft;
  limits: ReturnType<typeof resolveTariffLimits>;
  states: StepState[];
  busy: boolean;
  evidenceFile: string;
  activeOnr: RegistrySupplierAccount[];
  activeInfo: RegistrySupplierAccount[];
  orderCents: number | null;
  downloadCents: number | null;
  reserveCents: number | null;
  set: <K extends keyof TariffDraft>(key: K, value: TariffDraft[K]) => void;
  setEvidenceFile: (name: string) => void;
  setError: (message: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      id="vm-tariff-form"
      className="sup-composer-form"
      onSubmit={onSubmit}
      noValidate
    >
      <ComposerSection
        title="Valores"
        state={states[0]}
        recap={`Pedido ${orderCents === null ? "—" : money(orderCents)} · download ${downloadCents === null ? "—" : money(downloadCents)} · mínimo ${reserveCents === null ? "—" : money(reserveCents)}`}
      >
        {account.provider !== "onr" && (
          <label>
            Conta RI Digital ativa
            <select
              className="input"
              value={draft.onrAccountId}
              onChange={(event) => set("onrAccountId", event.target.value)}
              disabled={busy}
            >
              <option value="">Selecione a conta</option>
              {activeOnr.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {account.provider !== "infosimples" && (
          <label>
            Conta InfoSimples ativa
            <select
              className="input"
              value={draft.infosimplesAccountId}
              onChange={(event) =>
                set("infosimplesAccountId", event.target.value)
              }
              disabled={busy}
            >
              <option value="">Selecione a conta</option>
              {activeInfo.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Pedido (R$)
          <input
            className="input"
            inputMode="decimal"
            value={draft.orderFee}
            placeholder="0,28"
            onChange={(event) => set("orderFee", event.target.value)}
            disabled={busy}
          />
        </label>
        <label>
          Cada download (R$)
          <input
            className="input"
            inputMode="decimal"
            value={draft.downloadFee}
            placeholder="0,20"
            onChange={(event) => set("downloadFee", event.target.value)}
            disabled={busy}
          />
        </label>
        <label>
          Mínimo mensal por venda (R$)
          <input
            className="input"
            inputMode="decimal"
            value={draft.monthlyReserve}
            onChange={(event) => set("monthlyReserve", event.target.value)}
            disabled={busy}
          />
          <small>
            Custo fixo da operação aprovado pelo responsável (
            {rangeText(limits.monthly_minimum_reserve_cents)}).
          </small>
        </label>
      </ComposerSection>

      <ComposerSection
        title="Evidência"
        state={states[1]}
        recap={`${draft.evidenceMode === "admin_declaration" ? "Declaração administrativa" : `Arquivo ${draft.evidenceSha256.slice(0, 8)}…`} · ${draft.reason.trim().slice(0, 40)}`}
      >
        <label>
          Como você conferiu o preço?
          <select
            className="input"
            value={draft.evidenceMode}
            disabled={busy}
            onChange={(event) =>
              set(
                "evidenceMode",
                event.target.value as TariffDraft["evidenceMode"],
              )
            }
          >
            <option value="admin_declaration">Declaro o preço conferido</option>
            <option value="supplier_file">Tenho arquivo do fornecedor</option>
          </select>
          <small>
            O servidor registra sua decisão com valores, data e motivo. A
            declaração não é um documento do fornecedor.
          </small>
        </label>
        {draft.evidenceMode === "supplier_file" && (
          <>
            <label>
              Tabela de preços consultada
              <input
                className="input"
                value={draft.evidenceSha256}
                maxLength={64}
                readOnly
                disabled={busy}
              />
              <small>
                {evidenceFile ||
                  "Escolha o arquivo para gerar o resumo automaticamente. O arquivo fica no seu dispositivo."}
              </small>
            </label>
            <FilePickButton
              disabled={busy}
              onHash={async (bytes, name) => {
                set("evidenceSha256", await sha256Hex(bytes));
                setEvidenceFile(name);
              }}
              onError={setError}
            />
          </>
        )}
        <label>
          Motivo da conferência
          <textarea
            className="input"
            rows={3}
            minLength={limits.reason_length.min}
            maxLength={limits.reason_length.max}
            value={draft.reason}
            onChange={(event) => set("reason", event.target.value)}
            disabled={busy}
          />
          <small>Fica na auditoria. Sem senhas, tokens ou matrículas.</small>
        </label>
      </ComposerSection>

      <ComposerSection
        title="Confirmação"
        state={states[2]}
        recap="Declarações confirmadas"
      >
        <label>
          <input
            type="checkbox"
            checked={draft.contractVerified}
            onChange={(event) => set("contractVerified", event.target.checked)}
            disabled={busy}
          />
          Conferi o uso das APIs de pedido e download nesta conta.
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.supplierFeeCovered}
            onChange={(event) =>
              set("supplierFeeCovered", event.target.checked)
            }
            disabled={busy}
          />
          Os valores cobrem o pedido, três downloads e o mínimo mensal.
        </label>
      </ComposerSection>
    </form>
  );
}
