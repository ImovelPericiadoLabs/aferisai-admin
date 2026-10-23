import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDialogFocus } from "./useDialogFocus";
import {
  ApiError,
  createCommercialPolicyDraft,
  decideCommercialPolicy,
  listCommercialPolicies,
  listOrganizations,
  previewCommercialPolicy,
  updateCommercialPolicyDraft,
  type CommercialPolicy,
  type CommercialPolicyPreview,
} from "./api";
import {
  countByStatus,
  describeAmount,
  filterPolicies,
  formToDraftBody,
  initialForm,
  policyToForm,
  scopeSummary,
  statusTone,
  validityState,
  type FormState,
  type PolicyChannel,
  type PolicyStatus,
} from "./commercial-model";
import {
  CommercialPolicyForm,
  type OrganizationOption,
} from "./CommercialPolicyForm";
import { CommercialPolicyPanel } from "./CommercialPolicyPanel";
import "./commercial-policies.css";
import "./commercial-rules.css";
import { itemLabel, sourceLabel, statusLabel } from "./display-labels";
import { resolveOrganization } from "./lookups";

type Drawer = "closed" | "view" | "form";

const dateShort = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const statusTabs: { value: "" | PolicyStatus; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "draft", label: "Rascunhos" },
  { value: "published", label: "Publicadas" },
  { value: "suspended", label: "Suspensas" },
];

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
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
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

  useEffect(() => {
    let live = true;
    listOrganizations("")
      .then((page) => {
        if (live)
          setOrganizations(
            page.items.map((org) => ({ id: org.id, name: org.name })),
          );
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const unknownOrgKey = useMemo(
    () =>
      [
        ...new Set(
          items
            .map((item) => item.organization_id)
            .filter(
              (id): id is string =>
                id !== null && !organizations.some((org) => org.id === id),
            ),
        ),
      ]
        .slice(0, 20)
        .join(","),
    [items, organizations],
  );

  useEffect(() => {
    if (!unknownOrgKey) return;
    let live = true;
    void Promise.all(
      unknownOrgKey
        .split(",")
        .map((id) => resolveOrganization(id).catch(() => null)),
    ).then((found) => {
      if (!live) return;
      const known = found.filter((org) => org !== null);
      if (known.length)
        setOrganizations((current) => [
          ...current,
          ...known.map((org) => ({ id: org.id, name: org.label })),
        ]);
    });
    return () => {
      live = false;
    };
  }, [unknownOrgKey]);

  const orgNames = useMemo(
    () => Object.fromEntries(organizations.map((org) => [org.id, org.name])),
    [organizations],
  );
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

      <div className="rules-toolbar">
        <div
          className="rules-tabs"
          role="group"
          aria-label="Filtrar por estado"
        >
          {statusTabs.map((tab) => (
            <button
              key={tab.label}
              type="button"
              className="rules-tab"
              aria-pressed={statusFilter === tab.value}
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label}
              <span className="rules-tab-count">
                {counts[tab.value === "" ? "all" : tab.value]}
              </span>
            </button>
          ))}
        </div>
        <label className="rules-channel">
          <span className="sr-only">Canal</span>
          <select
            className="input"
            value={channelFilter}
            onChange={(event) =>
              setChannelFilter(event.target.value as "" | PolicyChannel)
            }
          >
            <option value="">Todos os canais</option>
            <option value="site">Site direto</option>
            <option value="integration">Integração</option>
            <option value="promotion">Promoção</option>
          </select>
        </label>
      </div>

      {loading && items.length === 0 ? (
        <div className="rules-skeleton" role="status" aria-label="Carregando">
          {Array.from({ length: 5 }, (_, index) => (
            <span className="skeleton" key={index} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state" role="status">
          <strong>
            {filtering
              ? "Nenhuma regra neste filtro"
              : "Nenhuma regra cadastrada"}
          </strong>
          <span>
            {filtering
              ? "Altere o estado ou o canal para ver outras versões."
              : "Crie a primeira regra para definir desconto e comissão por item e canal."}
          </span>
          {filtering ? (
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => {
                setStatusFilter("");
                setChannelFilter("");
              }}
            >
              Limpar filtros
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              type="button"
              onClick={openNew}
            >
              Nova regra
            </button>
          )}
        </div>
      ) : (
        <div className="data-table-wrap">
          <table
            className="data-table rules-table"
            aria-label="Regras comerciais"
          >
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Escopo</th>
                <th scope="col">Vigência</th>
                <th scope="col">Desconto</th>
                <th scope="col">Comissão</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((policy) => {
                const scope = scopeSummary(policy, orgNames);
                const validity = validityState(
                  policy.valid_from,
                  policy.valid_until,
                );
                return (
                  <tr
                    key={policy.id}
                    data-clickable
                    className={
                      policy.id === selectedId && drawer === "view"
                        ? "selected"
                        : undefined
                    }
                    onClick={() => openPolicy(policy.id)}
                  >
                    <td data-label="Item">
                      <button
                        className="rules-cell-button"
                        data-row-id={policy.id}
                        type="button"
                        aria-haspopup="dialog"
                        onClick={(event) => {
                          event.stopPropagation();
                          openPolicy(policy.id);
                        }}
                      >
                        <strong>{itemLabel(policy.item_code)}</strong>
                        <small>{sourceLabel(policy.source)}</small>
                      </button>
                    </td>
                    <td data-label="Escopo">
                      <strong className="rules-cell-main">
                        {scope.primary}
                      </strong>
                      <small className="rules-cell-sub">
                        {scope.secondary}
                      </small>
                    </td>
                    <td data-label="Vigência">
                      <span className="rules-cell-stack">
                        <span className="rules-cell-main">
                          {dateShort.format(new Date(policy.valid_from))} –{" "}
                          {dateShort.format(new Date(policy.valid_until))}
                        </span>
                        <small className="rules-cell-sub">
                          {validity === "active"
                            ? "Vigente agora"
                            : validity === "future"
                              ? "Ainda não iniciou"
                              : "Encerrada"}
                        </small>
                      </span>
                    </td>
                    <td data-label="Desconto">
                      {describeAmount(
                        policy.discount_rate_bps,
                        policy.discount_fixed_cents,
                      )}
                    </td>
                    <td data-label="Comissão">
                      {describeAmount(
                        policy.commission_rate_bps,
                        policy.commission_fixed_cents,
                      )}
                    </td>
                    <td data-label="Estado">
                      <span className={`badge ${statusTone(policy.status)}`}>
                        {statusLabel(policy.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
