import { useState, type FormEvent } from "react";
import { FormModal, Metrics, SettingCard } from "./SupplierUi";
import {
  ApiError,
  createRegistrySupplierAccount,
  type RegistrySupplierAccount,
} from "./api";
import {
  shortDigest,
  supplierBody,
  validateSupplierForm,
  type SupplierForm,
} from "./supplier-model";
import type { ToastKind } from "./useToast";

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
    reason: "",
  });
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const check = validateSupplierForm(form);
  const set = <K extends keyof SupplierForm>(key: K, value: SupplierForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!check.ok || busy) return;
    setBusy(true);
    setError("");
    try {
      await createRegistrySupplierAccount(supplierBody(form), csrf);
      setForm((current) => ({ ...current, password: "", token: "" }));
      setSubmitted(false);
      onToast(
        "Nova credencial criada em rascunho. Confira antes de trocar a conta ativa.",
        "success",
      );
      setOpen(false);
      onCreated();
    } catch (cause) {
      setForm((current) => ({ ...current, password: "", token: "" }));
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
            onClick={() => setOpen(true)}
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

      <FormModal
        open={open}
        title="Trocar credencial"
        onClose={() => !busy && setOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost btn-md"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="sup-renew-form"
              className="btn btn-primary btn-md"
              disabled={busy}
            >
              {busy ? "Salvando…" : "Cadastrar em rascunho"}
            </button>
          </>
        }
      >
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        <form
          id="sup-renew-form"
          className="sup-form-grid"
          onSubmit={(event) => void submit(event)}
          autoComplete="off"
          noValidate
        >
          <label>
            Nome da nova credencial
            <input
              className="input"
              value={form.label}
              maxLength={120}
              disabled={busy}
              onChange={(event) => set("label", event.target.value)}
            />
            {submitted && check.errors.label && (
              <small role="alert" className="sup-error">
                {check.errors.label}
              </small>
            )}
          </label>
          <label>
            Login do portal
            <input
              className="input"
              type="email"
              value={form.email}
              maxLength={254}
              autoComplete="off"
              disabled={busy}
              onChange={(event) => set("email", event.target.value)}
            />
            {submitted && check.errors.email && (
              <small role="alert" className="sup-error">
                {check.errors.email}
              </small>
            )}
          </label>
          <label>
            Nova senha
            <input
              className="input"
              type="password"
              value={form.password}
              autoComplete="new-password"
              disabled={busy}
              onChange={(event) => set("password", event.target.value)}
            />
            {submitted && check.errors.password && (
              <small role="alert" className="sup-error">
                {check.errors.password}
              </small>
            )}
          </label>
          {account.provider === "infosimples" && (
            <>
              <label>
                Novo token da InfoSimples
                <input
                  className="input"
                  type="password"
                  value={form.token}
                  autoComplete="off"
                  disabled={busy}
                  onChange={(event) => set("token", event.target.value)}
                />
                {submitted && check.errors.token && (
                  <small role="alert" className="sup-error">
                    {check.errors.token}
                  </small>
                )}
              </label>
              <label>
                Conta RI Digital vinculada
                <select
                  className="input"
                  value={form.portalDigest}
                  disabled={busy}
                  onChange={(event) => set("portalDigest", event.target.value)}
                >
                  <option value="">Selecione a conta</option>
                  {accounts
                    .filter(
                      (item) =>
                        item.provider === "onr" && item.status === "active",
                    )
                    .map((item) => (
                      <option key={item.id} value={item.account_binding_sha256}>
                        {item.label}
                      </option>
                    ))}
                </select>
                {submitted && check.errors.portalDigest && (
                  <small role="alert" className="sup-error">
                    {check.errors.portalDigest}
                  </small>
                )}
              </label>
            </>
          )}
          <label>
            Motivo da troca
            <textarea
              className="input"
              rows={3}
              minLength={10}
              maxLength={500}
              value={form.reason}
              disabled={busy}
              onChange={(event) => set("reason", event.target.value)}
            />
            {submitted && check.errors.reason && (
              <small role="alert" className="sup-error">
                {check.errors.reason}
              </small>
            )}
          </label>
        </form>
      </FormModal>
    </>
  );
}
