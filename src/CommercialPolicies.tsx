import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDialogFocus } from "./useDialogFocus";
import {
  ApiError,
  createCommercialPolicyDraft,
  decideCommercialPolicy,
  listCommercialPolicies,
  previewCommercialPolicy,
  updateCommercialPolicyDraft,
  type CommercialPolicy,
  type CommercialPolicyPreview,
} from "./api";
import {
  countByStatus,
  filterPolicies,
  formToDraftBody,
  initialForm,
  policyToForm,
  type FormState,
  type PolicyChannel,
  type PolicyStatus,
} from "./commercial-model";
import { CommercialPolicyForm } from "./CommercialPolicyForm";
import { CommercialPolicyPanel } from "./CommercialPolicyPanel";
import { CommercialPoliciesTable } from "./CommercialPoliciesTable";
import { CommercialPoliciesToolbar } from "./CommercialPoliciesToolbar";
import { useCommercialPolicyOrganizations } from "./useCommercialPolicyOrganizations";
import "./commercial-policies.css";
import "./commercial-rules.css";

type Drawer = "closed" | "view" | "form";

function errorMessage(cause: unknown): string {
  return cause instanceof ApiError
    ? cause.detail
    : "Não foi possível consultar a API agora.";
}

export function CommercialPolicies({
  csrf,
  onUnauthorized,
}: {
  csrf: string;
  onUnauthorized: () => void;
}) {
  const [items, setItems] = useState<CommercialPolicy[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | PolicyStatus>("");
  const [channelFilter, setChannelFilter] = useState<"" | PolicyChannel>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<Drawer>("closed");
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<CommercialPolicyPreview | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const lastOpened = useRef<string | null>(null);

  useEffect(() => {
    let live = true;
    listCommercialPolicies()
      .then((page) => {
        if (!live) return;
        setItems(page.items);
        setNextCursor(page.next_cursor);
        setError("");
      })
      .catch((cause: unknown) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setError(errorMessage(cause));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [revision, onUnauthorized]);

  const { organizations, orgNames } = useCommercialPolicyOrganizations(items);

  const counts = useMemo(() => countByStatus(items), [items]);
  const visible = useMemo(
    () => filterPolicies(items, statusFilter, channelFilter),
    [items, statusFilter, channelFilter],
  );
  const selected = items.find((item) => item.id === selectedId) ?? null;

  function closeDrawer() {
    setDrawer("closed");
    setEditingId(null);
    setPreview(null);
  }

  useDialogFocus(drawer !== "closed", panelRef, closeDrawer, {
    returnFocus: () =>
      document.querySelector<HTMLElement>(
        `[data-row-id="${lastOpened.current}"]`,
      ) ?? document.querySelector<HTMLElement>(".page-header .btn-primary"),
  });

  function openPolicy(id: string) {
    lastOpened.current = id;
    setSelectedId(id);
    setPreview(null);
    setDrawer("view");
  }

  function openNew() {
    lastOpened.current = null;
    setForm(initialForm());
    setEditingId(null);
    setNotice("");
    setError("");
    setDrawer("form");
  }

  function openEdit(policy: CommercialPolicy) {
    setForm(policyToForm(policy));
    setEditingId(policy.id);
    setNotice("");
    setError("");
    setDrawer("form");
  }

  async function guarded(task: () => Promise<void>): Promise<boolean> {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
      return true;
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError(errorMessage(cause));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    const ok = await guarded(async () => {
      const body = formToDraftBody(form);
      if (editingId !== null) {
        await updateCommercialPolicyDraft(editingId, body, csrf);
        setNotice("Rascunho atualizado. Revise o escopo antes de publicar.");
      } else {
        const created = await createCommercialPolicyDraft(body, csrf);
        setNotice(
          `Rascunho ${created.id} registrado. Revise o escopo antes de publicar.`,
        );
        setSelectedId(created.id);
      }
      setRevision((value) => value + 1);
    });
    if (ok) {
      setEditingId(null);
      setForm(initialForm());
      setDrawer("closed");
    }
  }

  function decide(policy: CommercialPolicy, reason: string) {
    return guarded(async () => {
      const action = policy.status === "draft" ? "publish" : "suspend";
      await decideCommercialPolicy(policy.id, action, reason, csrf);
      setNotice(
        action === "publish"
          ? "Versão publicada. Ainda não é usada no checkout."
          : "Versão suspensa para novas cotações.",
      );
      setRevision((value) => value + 1);
    });
  }

  function simulate(
    policy: CommercialPolicy,
    basePrice: string,
    count: string,
  ) {
    const base = Math.round(Number(basePrice) * 100);
    const quantity = Number(count);
    if (!base || !quantity) return;
    setPreview(null);
    void guarded(async () => {
      setPreview(
        await previewCommercialPolicy(policy.id, base, quantity, csrf),
      );
    });
  }

  async function more() {
    if (!nextCursor) return;
    await guarded(async () => {
      const page = await listCommercialPolicies(nextCursor);
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.next_cursor);
    });
  }

  const filtering = Boolean(statusFilter || channelFilter);

  return (
    <section className="rules page" aria-labelledby="rules-title">
      <header className="page-header">
        <div>
          <h1 className="page-title" id="rules-title">
            Regras comerciais
          </h1>
          <p className="page-subtitle">
            Condições de desconto e comissão por item, canal e organização. Cada
            mudança vira uma versão com motivo registrado.
          </p>
        </div>
        <button
          className="btn btn-primary btn-md"
          type="button"
          onClick={openNew}
        >
          <span aria-hidden="true">＋</span> Nova regra
        </button>
      </header>

      <div className="alert" role="note">
        Publicar registra a condição aprovada, mas o checkout registral ainda
        não aplica estas versões nem emite cobrança.
      </div>

      {error && drawer === "closed" && (
        <div className="alert alert-danger rules-alert" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="alert alert-success rules-alert" role="status">
          {notice}
        </div>
      )}
      <CommercialPoliciesToolbar
        counts={counts}
        statusFilter={statusFilter}
        channelFilter={channelFilter}
        onStatus={setStatusFilter}
        onChannel={setChannelFilter}
      />

      <CommercialPoliciesTable
        visible={visible}
        initialLoading={loading && items.length === 0}
        filtering={filtering}
        orgNames={orgNames}
        selectedId={selectedId}
        viewing={drawer === "view"}
        onOpen={openPolicy}
        onNew={openNew}
        onClearFilters={() => {
          setStatusFilter("");
          setChannelFilter("");
        }}
      />

      {nextCursor && (
        <footer className="rules-footer">
          <span>{items.length} versões carregadas</span>
          <button
            className="btn btn-secondary btn-md"
            type="button"
            disabled={busy}
            onClick={() => void more()}
          >
            Carregar mais
          </button>
        </footer>
      )}

      {createPortal(
        <>
          {drawer !== "closed" && (
            <div className="detail-panel-overlay" onClick={closeDrawer} />
          )}
          <aside
            className={`detail-panel detail-panel-wide${drawer !== "closed" ? " open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rules-panel-title"
            aria-hidden={drawer === "closed"}
            ref={panelRef}
          >
            {drawer === "form" && (
              <CommercialPolicyForm
                key={editingId ?? "new"}
                form={form}
                onChange={setForm}
                editing={editingId !== null}
                busy={busy}
                error={error}
                organizations={organizations}
                onSubmit={() => void submit()}
                onClose={closeDrawer}
                onUnauthorized={onUnauthorized}
              />
            )}
            {drawer === "view" && selected && (
              <CommercialPolicyPanel
                key={selected.id}
                policy={selected}
                orgNames={orgNames}
                busy={busy}
                error={error}
                preview={preview}
                onClose={closeDrawer}
                onEdit={openEdit}
                onDecide={decide}
                onSimulate={simulate}
              />
            )}
          </aside>
        </>,
        document.body,
      )}
    </section>
  );
}
