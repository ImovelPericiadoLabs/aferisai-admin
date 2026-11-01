import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ApiError,
  activateRegistrySupplierAccount,
  createRegistrySupplierAccount,
  listRegistrySupplierAccounts,
  suspendRegistrySupplierAccount,
  type RegistrySupplierAccount,
} from "./api";
import { SupplierAccountEditor } from "./SupplierAccountEditor";
import { SupplierAccountsList } from "./SupplierAccountsList";
import { SupplierCreatePanel } from "./SupplierCreatePanel";
import { SupplierStatusDialog } from "./SupplierStatusDialog";
import "./ops.css";
import {
  emptyForm,
  errorText,
  filters,
  type Filter,
  type Pending,
} from "./registry-suppliers-model";
import {
  activationBlock,
  supplierBody,
  validateSupplierForm,
  type SupplierForm,
} from "./supplier-model";
import { useDialogFocus } from "./useDialogFocus";
import type { ToastKind } from "./useToast";
import "./analysis-providers.css";
import "./registry-suppliers.css";

export function RegistrySuppliers({
  csrf,
  onUnauthorized,
  onToast,
}: {
  csrf: string;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
}) {
  const [items, setItems] = useState<RegistrySupplierAccount[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("");
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<RegistrySupplierAccount | null>(null);
  const editTrigger = useRef<HTMLElement | null>(null);
  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");
  const panelRef = useRef<HTMLElement>(null);
  const createTrigger = useRef<HTMLButtonElement>(null);

  const load = useCallback(
    async (next?: string) => {
      try {
        const page = await listRegistrySupplierAccounts(next);
        setItems((current) =>
          next ? [...current, ...page.items] : page.items,
        );
        setCursor(page.next_cursor);
        setError("");
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setError(errorText(cause));
      } finally {
        setLoading(false);
      }
    },
    [onUnauthorized],
  );

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  function closeCreate() {
    if (busy) return;
    setCreating(false);
    setForm(emptyForm);
    setSubmitted(false);
    setFormError("");
  }

  useDialogFocus(creating, panelRef, closeCreate, {
    returnFocus: () => createTrigger.current,
  });

  const counts = useMemo(
    () => ({
      "": items.length,
      draft: items.filter((item) => item.status === "draft").length,
      active: items.filter((item) => item.status === "active").length,
      suspended: items.filter((item) => item.status === "suspended").length,
    }),
    [items],
  );
  const visible = items.filter((item) => !filter || item.status === filter);
  const portalAccounts = items.filter(
    (item) => item.provider === "onr" && item.status !== "suspended",
  );
  const check = validateSupplierForm(form);
  const set = <K extends keyof SupplierForm>(key: K, value: SupplierForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!check.ok) return;
    setBusy(true);
    setFormError("");
    try {
      await createRegistrySupplierAccount(supplierBody(form), csrf);
      setBusy(false);
      setCreating(false);
      setForm(emptyForm);
      setSubmitted(false);
      onToast(
        "Conta cadastrada em rascunho. Ela ainda não é usada.",
        "success",
      );
      await load();
    } catch (cause) {
      // Secrets are not kept after a failed attempt: they must be typed again.
      setForm((current) => ({
        ...current,
        password: "",
        token: "",
        stateLoginPassword: "",
        statePkcs12Cert: "",
        statePkcs12Password: "",
      }));
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else {
        await load();
        setFormError(
          `${errorText(cause)} Por segurança, digite a senha e o token de novo.`,
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function decide(reason: string) {
    if (!pending) return;
    const { action, account } = pending;
    setBusy(true);
    try {
      if (action === "activate")
        await activateRegistrySupplierAccount(
          account.id,
          account.version,
          reason,
          csrf,
        );
      else
        await suspendRegistrySupplierAccount(
          account.id,
          account.version,
          reason,
          csrf,
        );
      setPending(null);
      onToast(
        action === "activate"
          ? "Conta ativada. Isso não valida o login nem autoriza compras."
          : "Conta suspensa. Novas reservas de compra ficam bloqueadas.",
        "success",
      );
      await load();
    } catch (cause) {
      setPending(null);
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else {
        onToast(errorText(cause), "error");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  const block =
    pending?.action === "activate"
      ? activationBlock(pending.account, items)
      : null;

  return (
    <section className="page providers" aria-labelledby="suppliers-title">
      <header className="page-header">
        <div>
          <h1 className="page-title" id="suppliers-title">
            Fornecedores registrais
          </h1>
          <p className="page-subtitle">
            Contas RI Digital e InfoSimples dos pedidos registrais. Clique numa
            conta para configurar.
          </p>
        </div>
        <button
          ref={createTrigger}
          className="btn btn-primary btn-md"
          type="button"
          aria-haspopup="dialog"
          onClick={() => setCreating(true)}
        >
          <span aria-hidden="true">＋</span> Nova conta
        </button>
      </header>

      <div className="alert" role="note">
        Segredos são cifrados e não voltam a aparecer. Cadastrar ou ativar uma
        conta <strong>não valida o login no fornecedor</strong> nem autoriza
        compra.
      </div>

      <div
        className="prov-filters"
        role="group"
        aria-label="Filtrar por estado"
      >
        {filters.map((item) => (
          <button
            key={item.label}
            type="button"
            className="prov-chip"
            aria-pressed={filter === item.value}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
            <span className="prov-chip-count">{counts[item.value]}</span>
          </button>
        ))}
        <button
          className="btn btn-ghost btn-sm prov-refresh"
          type="button"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            void load();
          }}
        >
          Atualizar
        </button>
      </div>

      <SupplierAccountsList
        items={items}
        visible={visible}
        loading={loading}
        error={error}
        filter={filter}
        editingId={editing?.id ?? null}
        onRetry={() => {
          setLoading(true);
          void load();
        }}
        onOpen={(item, element) => {
          editTrigger.current = element;
          setEditing(item);
        }}
      />

      {cursor && (
        <footer className="prov-footer">
          <span>{items.length} contas carregadas</span>
          <button
            className="btn btn-secondary btn-md"
            type="button"
            disabled={loading}
            onClick={() => void load(cursor)}
          >
            Carregar mais
          </button>
        </footer>
      )}

      <SupplierAccountEditor
        account={
          editing
            ? (items.find((item) => item.id === editing.id) ?? editing)
            : null
        }
        onStatusAction={(action, account) => setPending({ action, account })}
        accounts={items}
        csrf={csrf}
        returnFocus={() => editTrigger.current}
        onClose={() => setEditing(null)}
        onUnauthorized={onUnauthorized}
        onToast={onToast}
        onAccountsChanged={() => void load()}
      />

      <SupplierStatusDialog
        pending={pending}
        block={block}
        busy={busy}
        onConfirm={(reason) => void decide(reason)}
        onCancel={() => setPending(null)}
      />

      <SupplierCreatePanel
        creating={creating}
        panelRef={panelRef}
        form={form}
        busy={busy}
        submitted={submitted}
        errors={check.errors}
        formError={formError}
        portalAccounts={portalAccounts}
        set={set}
        onClose={closeCreate}
        onSubmit={(event) => void submit(event)}
      />
    </section>
  );
}
