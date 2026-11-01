import {
  activateAnalysisProviderAccount,
  suspendAnalysisProviderAccount,
  updateAnalysisProviderLimits,
  type AnalysisProviderAccount,
} from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  activationBody,
  formToLimits,
  formatCostPerDay,
  shortHash,
  validateExternalReserved,
  validateProfileHash,
  type LimitsForm,
} from "./provider-model";

const REASON = { label: "Motivo", min: 10, max: 500 };

export type ProviderAsk = "limits" | "activate" | "suspend" | null;

export function AnalysisProviderConfirmDialogs({
  account,
  ask,
  form,
  parsed,
  previewModel,
  profile,
  reservedCheck,
  profileCheck,
  busy,
  csrf,
  run,
  onCancel,
}: {
  account: AnalysisProviderAccount;
  ask: ProviderAsk;
  form: LimitsForm;
  parsed: ReturnType<typeof formToLimits>;
  previewModel: string;
  profile: string;
  reservedCheck: ReturnType<typeof validateExternalReserved>;
  profileCheck: ReturnType<typeof validateProfileHash>;
  busy: boolean;
  csrf: string;
  run: (task: () => Promise<unknown>, success: string) => Promise<void>;
  onCancel: () => void;
}) {
  return (
    <>
      <ConfirmDialog
        open={ask === "limits"}
        title="Salvar novos limites?"
        description="Os novos limites passam a valer para esta conta."
        details={[
          { label: "Conta", value: account.label },
          {
            label: "Teto diário",
            value: parsed.ok
              ? formatCostPerDay(parsed.limits.daily_cost_cents)
              : "",
          },
          { label: "Requisições por minuto", value: form.rpm },
        ]}
        reason={REASON}
        confirmLabel="Salvar limites"
        busy={busy}
        onConfirm={(reason) => {
          const result = formToLimits(form);
          if (result.ok)
            void run(
              () =>
                updateAnalysisProviderLimits(
                  account.id,
                  result.limits,
                  account.version,
                  reason,
                  csrf,
                ),
              "Limites salvos.",
            );
        }}
        onCancel={() => onCancel()}
      />
      <ConfirmDialog
        open={ask === "activate"}
        title="Ativar esta conta?"
        description="A conta sai de rascunho e fica ativa com o perfil de execução conferido abaixo."
        details={[
          { label: "Conta", value: account.label },
          { label: "Modelo", value: previewModel || account.model },
          {
            label: "Reserva externa",
            value:
              account.kind === "vertex_service_account"
                ? reservedCheck.value
                : 0,
          },
          {
            label: "Perfil",
            value: shortHash(profile),
          },
        ]}
        reason={REASON}
        confirmLabel="Ativar conta"
        busy={busy}
        onConfirm={(reason) => {
          const body = activationBody(
            account,
            account.kind === "vertex_service_account" ? reservedCheck.value : 0,
            reason,
            profileCheck.value,
          );
          void run(
            () => activateAnalysisProviderAccount(account.id, body, csrf),
            "Conta ativada.",
          );
        }}
        onCancel={() => onCancel()}
      />
      <ConfirmDialog
        open={ask === "suspend"}
        tone="danger"
        title="Suspender esta conta?"
        description="A conta deixa de poder receber chamadas. Nesta versão não há reativação pelo painel."
        details={[{ label: "Conta", value: account.label }]}
        reason={REASON}
        confirmLabel="Suspender conta"
        busy={busy}
        onConfirm={(reason) =>
          void run(
            () =>
              suspendAnalysisProviderAccount(
                account.id,
                account.version,
                reason,
                csrf,
              ),
            "Conta suspensa.",
          )
        }
        onCancel={() => onCancel()}
      />
    </>
  );
}
