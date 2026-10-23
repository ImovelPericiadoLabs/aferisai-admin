import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ApiError,
  createPromotion,
  listCommercialPolicies,
  listPromotions,
  suspendPromotion,
  type PromotionAsset,
  type PromotionCreateResult,
} from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import { itemLabel, promotionKindLabel } from "./display-labels";
import { resolveOrganization } from "./lookups";
import {
  countByState,
  filterPromotions,
  initialPromotionForm,
  promotionState,
  promotionStateLabel,
  usageOf,
  validatePromotionForm,
  type PromotionFormState,
  type PromotionState,
} from "./promotion-model";
import { PromotionForm } from "./PromotionForm";
import { SecretReveal } from "./SecretReveal";
import { promotionTone } from "./status-tones";
import { useDialogFocus } from "./useDialogFocus";
import "./commercial-rules.css";
import "./promotions.css";

type Drawer = "closed" | "view" | "form";

const dateShort = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Sao_Paulo",
});
const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const tabs: { value: "" | PromotionState; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "active", label: "Ativas" },
  { value: "scheduled", label: "Agendadas" },
  { value: "exhausted", label: "Esgotadas" },
  { value: "expired", label: "Expiradas" },
  { value: "suspended", label: "Suspensas" },
];

function errorMessage(cause: unknown): string {
  return cause instanceof ApiError
    ? cause.detail
    : "Não foi possível consultar a API agora.";
}

export function Promotions({
  csrf,
  onUnauthorized,
}: {
  csrf: string;
  onUnauthorized: () => void;
}) {
  const [items, setItems] = useState<PromotionAsset[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<"" | PromotionState>("");
  const [drawer, setDrawer] = useState<Drawer>("closed");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<PromotionFormState>(() =>
    initialPromotionForm(),
  );
  const [created, setCreated] = useState<PromotionCreateResult | null>(null);
  const [askSuspend, setAskSuspend] = useState(false);
  const [orgNames, setOrgNames] = useState<Record<string, string>>({});
  const [ruleNames, setRuleNames] = useState<Record<string, string>>({});
  const panelRef = useRef<HTMLElement>(null);
  const lastOpened = useRef<string | null>(null);

  useEffect(() => {
    let live = true;
    listPromotions()
      .then((page) => {
        if (!live) return;
        setItems(page.items);
        setNextCursor(page.next_cursor);
        setNow(Date.now());
        setLoadFailed(false);
        setError("");
      })
      .catch((cause: unknown) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else {
          setLoadFailed(true);
          setError(errorMessage(cause));
        }
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
    listCommercialPolicies()
      .then((page) => {
        if (!live) return;
        setRuleNames(
          Object.fromEntries(
            page.items
              .filter((policy) => policy.channel === "promotion")
              .map((policy) => [
                policy.id,
                `${itemLabel(policy.item_code)} · ${promotionKindLabel(policy.attribution)}`,
              ]),
          ),
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
            .filter((id) => !(id in orgNames)),
        ),
      ]
        .slice(0, 20)
        .join(","),
    [items, orgNames],
  );

  useEffect(() => {
    if (!unknownOrgKey) return;
    let live = true;
    void Promise.all(
      unknownOrgKey.split(",").map(async (id) => {
        const found = await resolveOrganization(id).catch(() => null);
        return [id, found?.label ?? ""] as const;
      }),
    ).then((pairs) => {
      if (live)
        setOrgNames((current) => ({
          ...current,
          ...Object.fromEntries(pairs),
        }));
    });
    return () => {
      live = false;
    };
  }, [unknownOrgKey]);

  const counts = useMemo(() => countByState(items, now), [items, now]);
  const visible = useMemo(
    () => filterPromotions(items, filter, now),
    [items, filter, now],
  );
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const orgName = (id: string) =>
    orgNames[id] || `Organização ${id.slice(0, 8)}…`;
  const ruleName = (id: string) => ruleNames[id] || `Regra ${id.slice(0, 8)}…`;

  function closeDrawer() {
    setDrawer("closed");
    setFormError("");
    setAskSuspend(false);
  }

  useDialogFocus(drawer !== "closed", panelRef, closeDrawer, {
    returnFocus: () =>
      document.querySelector<HTMLElement>(
        `[data-row-id="${lastOpened.current}"]`,
      ) ?? document.querySelector<HTMLElement>(".page-header .btn-primary"),
  });

  function openNew() {
    lastOpened.current = null;
    setForm(initialPromotionForm());
    setFormError("");
    setNotice("");
    setDrawer("form");
  }

  function openPromotion(id: string) {
    lastOpened.current = id;
    setSelectedId(id);
    setNotice("");
    setError("");
    setDrawer("view");
  }

  async function submit() {
    const result = validatePromotionForm(form);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      const made = await createPromotion(result.body, csrf);
      setCreated(made);
      setDrawer("closed");
      setRevision((value) => value + 1);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setFormError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function suspend() {
    if (!selected) return;
    setBusy(true);
    try {
      await suspendPromotion(selected.id, csrf);
      setAskSuspend(false);
      setNotice("Promoção suspensa. Resgates futuros foram bloqueados.");
      setRevision((value) => value + 1);
      setDrawer("closed");
    } catch (cause) {
      setAskSuspend(false);
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function more() {
    if (!nextCursor) return;
    setBusy(true);
    try {
      const page = await listPromotions(nextCursor);
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.next_cursor);
      setNow(Date.now());
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  const filtering = filter !== "";

  return (
    <section className="page promotions" aria-labelledby="promo-title">
      <header className="page-header">
        <div>
          <h1 className="page-title" id="promo-title">
            Promoções
          </h1>
          <p className="page-subtitle">
            Cupons e links ligados a uma regra comercial do canal promoção. O
            código aparece uma única vez, na criação.
          </p>
        </div>
        <button
          className="btn btn-primary btn-md"
          type="button"
          onClick={openNew}
        >
          <span aria-hidden="true">＋</span> Nova promoção
        </button>
      </header>

      {error && drawer === "closed" && (
        <div className="alert alert-danger rules-alert" role="alert">
          {error}
          {loadFailed && (
            <>
              {" "}
              <button
                className="btn btn-secondary btn-sm"
                type="button"
                onClick={() => {
                  setLoading(true);
                  setRevision((value) => value + 1);
                }}
              >
                Tentar novamente
              </button>
            </>
          )}
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
          {tabs.map((tab) => (
            <button
              key={tab.label}
              type="button"
              className="rules-tab"
              aria-pressed={filter === tab.value}
              onClick={() => setFilter(tab.value)}
            >
              {tab.label}
              <span className="rules-tab-count">
                {counts[tab.value === "" ? "all" : tab.value]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="rules-skeleton" role="status" aria-label="Carregando">
          {Array.from({ length: 5 }, (_, index) => (
            <span className="skeleton" key={index} />
          ))}
        </div>
      ) : visible.length === 0 && !loadFailed ? (
        <div className="empty-state" role="status">
          <strong>
            {filtering
              ? "Nenhuma promoção neste estado"
              : "Nenhuma promoção criada"}
          </strong>
          <span>
            {filtering
              ? "Escolha outro estado para ver as demais."
              : "Crie a primeira promoção para gerar um cupom ou link para um parceiro."}
          </span>
          {filtering ? (
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => setFilter("")}
            >
              Limpar filtro
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              type="button"
              onClick={openNew}
            >
              Nova promoção
            </button>
          )}
        </div>
      ) : (
        visible.length > 0 && (
          <div className="data-table-wrap">
            <table className="data-table" aria-label="Promoções">
              <thead>
                <tr>
                  <th scope="col">Promoção</th>
                  <th scope="col">Organização</th>
                  <th scope="col">Validade</th>
                  <th scope="col">Uso</th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((asset) => {
                  const state = promotionState(asset, now);
                  const usage = usageOf(asset);
                  return (
                    <tr
                      key={asset.id}
                      data-clickable
                      className={
                        asset.id === selectedId && drawer === "view"
                          ? "selected"
                          : undefined
                      }
                      onClick={() => openPromotion(asset.id)}
                    >
                      <td data-label="Promoção">
                        <button
                          className="rules-cell-button"
                          data-row-id={asset.id}
                          type="button"
                          aria-haspopup="dialog"
                          onClick={(event) => {
                            event.stopPropagation();
                            openPromotion(asset.id);
                          }}
                        >
                          <strong>{asset.public_label || "Sem rótulo"}</strong>
                          <small>{promotionKindLabel(asset.kind)}</small>
                        </button>
                      </td>
                      <td data-label="Organização">
                        <strong className="rules-cell-main">
                          {orgName(asset.organization_id)}
                        </strong>
                        <small className="rules-cell-sub">
                          {ruleName(asset.policy_version_id)}
                        </small>
                      </td>
                      <td data-label="Validade">
                        <span className="rules-cell-main">
                          {dateShort.format(new Date(asset.valid_from))} –{" "}
                          {dateShort.format(new Date(asset.valid_until))}
                        </span>
                      </td>
                      <td data-label="Uso">
                        <span className="promo-usage">
                          <span className="rules-cell-main">{usage.text}</span>
                          {usage.fraction !== null && (
                            <span
                              className="promo-usage-bar"
                              data-full={usage.fraction >= 1}
                              aria-hidden="true"
                            >
                              <span
                                style={{ width: `${usage.fraction * 100}%` }}
                              />
                            </span>
                          )}
                        </span>
                      </td>
                      <td data-label="Estado">
                        <span className={`badge ${promotionTone(state)}`}>
                          {promotionStateLabel[state]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {nextCursor && (
        <footer className="rules-footer">
          <span>{items.length} promoções carregadas</span>
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
            className={`detail-panel${drawer !== "closed" ? " open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="promo-panel-title"
            aria-hidden={drawer === "closed"}
            ref={panelRef}
          >
            {drawer === "form" && (
              <PromotionForm
                form={form}
                onChange={setForm}
                busy={busy}
                error={formError}
                onSubmit={() => void submit()}
                onClose={closeDrawer}
                onUnauthorized={onUnauthorized}
              />
            )}
            {drawer === "view" && selected && (
              <>
                <div className="detail-panel-header">
                  <div>
                    <h2 className="rules-panel-title" id="promo-panel-title">
                      {selected.public_label || "Promoção sem rótulo"}
                    </h2>
                    <div className="rules-panel-badges">
                      <span
                        className={`badge ${promotionTone(promotionState(selected, now))}`}
                      >
                        {promotionStateLabel[promotionState(selected, now)]}
                      </span>
                      <span className="rules-panel-sub">
                        {promotionKindLabel(selected.kind)}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    aria-label="Fechar"
                    onClick={closeDrawer}
                  >
                    ✕
                  </button>
                </div>
                <div className="detail-panel-body">
                  <section className="detail-panel-section">
                    <h3 className="detail-panel-section-title">Quem recebe</h3>
                    <dl className="detail-panel-field">
                      <dt>Organização</dt>
                      <dd>{orgName(selected.organization_id)}</dd>
                      <dt>Regra</dt>
                      <dd>{ruleName(selected.policy_version_id)}</dd>
                    </dl>
                  </section>
                  <section className="detail-panel-section">
                    <h3 className="detail-panel-section-title">
                      Validade e uso
                    </h3>
                    <dl className="detail-panel-field">
                      <dt>Início</dt>
                      <dd>{dateTime.format(new Date(selected.valid_from))}</dd>
                      <dt>Fim</dt>
                      <dd>{dateTime.format(new Date(selected.valid_until))}</dd>
                      <dt>Usos</dt>
                      <dd>{usageOf(selected).text}</dd>
                      <dt>Criada em</dt>
                      <dd>{dateTime.format(new Date(selected.created_at))}</dd>
                      {selected.suspended_at && (
                        <>
                          <dt>Suspensa em</dt>
                          <dd>
                            {dateTime.format(new Date(selected.suspended_at))}
                          </dd>
                        </>
                      )}
                    </dl>
                  </section>
                  <p className="form-hint">
                    O código não é guardado em texto simples e não pode ser
                    consultado de novo.
                  </p>
                </div>
                {selected.status !== "suspended" && (
                  <div className="detail-panel-footer">
                    <button
                      className="btn btn-danger btn-md"
                      type="button"
                      disabled={busy}
                      onClick={() => setAskSuspend(true)}
                    >
                      Suspender promoção
                    </button>
                  </div>
                )}
              </>
            )}
          </aside>
        </>,
        document.body,
      )}

      <ConfirmDialog
        open={askSuspend && selected !== null}
        tone="danger"
        title="Suspender esta promoção?"
        description="Resgates futuros deste código serão bloqueados. O painel não reativa promoções suspensas; será preciso criar outra."
        details={
          selected
            ? [
                {
                  label: "Promoção",
                  value: selected.public_label || "Sem rótulo",
                },
                {
                  label: "Organização",
                  value: orgName(selected.organization_id),
                },
                { label: "Usos até agora", value: usageOf(selected).text },
              ]
            : []
        }
        confirmLabel="Suspender"
        busy={busy}
        onConfirm={() => void suspend()}
        onCancel={() => setAskSuspend(false)}
      />

      {created && (
        <SecretReveal
          title="Promoção criada"
          description="Entregue o código ao parceiro por um canal seguro. Ele não será exibido de novo."
          secretLabel={`Código do ${promotionKindLabel(created.kind).toLowerCase()}`}
          secret={created.plain_code}
          details={[
            { label: "Organização", value: orgName(created.organization_id) },
            {
              label: "Validade",
              value: `${dateShort.format(new Date(created.valid_from))} a ${dateShort.format(new Date(created.valid_until))}`,
            },
            {
              label: "Limite",
              value: created.use_limit
                ? String(created.use_limit)
                : "Sem limite",
            },
          ]}
          onDismiss={() => {
            setCreated(null);
            setNotice("Promoção criada.");
          }}
        />
      )}
    </section>
  );
}
