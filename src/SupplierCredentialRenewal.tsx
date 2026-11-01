import { useState, type FormEvent } from "react";
import { Metrics, SettingCard } from "./SupplierUi";
import { stepStates } from "./account-model";
import {
  ApiError,
  createRegistrySupplierAccount,
  type RegistrySupplierAccount,
} from "./api";
import {
  credentialSteps,
  shortDigest,
  supplierBody,
  validateSupplierForm,
  type SupplierForm,
} from "./supplier-model";
import type { ToastKind } from "./useToast";
import { SupplierCredentialComposer } from "./SupplierCredentialComposer";
import { SupplierStateAuthCard } from "./SupplierStateAuthCard";
import { useSupplierStateAuthRotation } from "./useSupplierStateAuthRotation";

export function SupplierCredentialRenewal({
  account,
  accounts,
  csrf,
  onCreated,
  onUnauthorized,
  onToast,
}: {
  account: RegistrySupplierAccount;
  accounts: RegistrySupplierAccount[];
  csrf: string;
  onCreated: () => void;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
}) {
  const [form, setForm] = useState<SupplierForm>({
    label: `${account.label.slice(0, 98)} · nova credencial`,
    provider: account.provider,
    email: "",
    password: "",
    token: "",
    portalDigest: "",
    stateLoginCpf: "",
    stateLoginPassword: "",
    statePkcs12Cert: "",
    statePkcs12Password: "",
    reason: "",
  });
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const stateAuth = useSupplierStateAuthRotation({
    account,
    csrf,
    busy,
    setBusy,
    onCreated,
    onUnauthorized,
    onToast,
  });
  const check = validateSupplierForm(form);
  const states = stepStates(credentialSteps(form));
  const set = <K extends keyof SupplierForm>(key: K, value: SupplierForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!check.ok) return;
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await createRegistrySupplierAccount(supplierBody(form), csrf);
      setForm((current) => ({
        ...current,
        password: "",
        token: "",
        stateLoginPassword: "",
        statePkcs12Cert: "",
        statePkcs12Password: "",
      }));
      setSubmitted(false);
      onToast(
        "Nova credencial criada em rascunho. Confira antes de trocar a conta ativa.",
        "success",
      );
      setOpen(false);
      onCreated();
    } catch (cause) {
      setForm((current) => ({
        ...current,
        password: "",
        token: "",
        stateLoginPassword: "",
        statePkcs12Cert: "",
        statePkcs12Password: "",
      }));
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível confirmar o cadastro. Atualize a lista antes de tentar outra vez.",
        );
    } finally {
      setBusy(false);
    }
  }

  const dateTime = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <>
      {account.provider === "infosimples" && (
        <SupplierStateAuthCard busy={busy} state={stateAuth} />
      )}
      <SettingCard
        title="Credencial em uso"
        help={
          <>
            A credencial antiga continua ligada aos pedidos e custos já feitos.
            A nova nasce em rascunho: depois de conferir, suspenda a conta ativa
            e ative a nova na lista. Publique as tarifas da nova conta antes de
            oferecer cotações.
            {account.provider === "onr" &&
              " Configure de novo o proxy RI Digital na nova conta, se precisar."}{" "}
            Senha e token nunca aparecem de novo.
          </>
        }
        actions={
          <button
            type="button"
            className="btn btn-secondary btn-md"
            aria-haspopup="dialog"
            onClick={() => {
              setSubmitted(false);
              setOpen(true);
            }}
          >
            Trocar credencial
          </button>
        }
      >
        <Metrics
          items={[
            { label: "Identificação", value: account.credential_hint },
            {
              label: "Vínculo",
              value: (
                <code title={account.account_binding_sha256}>
                  {shortDigest(account.account_binding_sha256)}
                </code>
              ),
            },
            { label: "Versão", value: account.version },
            {
              label: "Atualizada",
              value: dateTime.format(new Date(account.updated_at)),
            },
          ]}
        />
      </SettingCard>

      {open && (
        <SupplierCredentialComposer
          account={account}
          accounts={accounts}
          form={form}
          set={set}
          check={check}
          states={states}
          submitted={submitted}
          busy={busy}
          error={error}
          onSubmit={(event) => void submit(event)}
          onClose={() => !busy && setOpen(false)}
        />
      )}
    </>
  );
}
