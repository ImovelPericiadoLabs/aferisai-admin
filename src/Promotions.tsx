import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ApiError,
  createPromotion,
  listPromotions,
  suspendPromotion,
  type PromotionAsset,
  type PromotionCreateResult,
} from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import { promotionKindLabel } from "./display-labels";
import {
  countByState,
  filterPromotions,
  initialPromotionForm,
  usageOf,
  validatePromotionForm,
  type PromotionFormState,
  type PromotionState,
} from "./promotion-model";
import { PromotionDetail } from "./PromotionDetail";
import { PromotionForm } from "./PromotionForm";
import { PromotionsToolbar } from "./PromotionsToolbar";
import { PromotionsList } from "./PromotionsList";
import { dateShort, errorMessage } from "./promotions-format";
import { SecretReveal } from "./SecretReveal";
import { useDialogFocus } from "./useDialogFocus";
import { usePromotionLookups } from "./usePromotionLookups";
import "./commercial-rules.css";
import "./promotions.css";

type Drawer = "closed" | "view" | "form";

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

  const { orgName, ruleName } = usePromotionLookups(items);

  const counts = useMemo(() => countByState(items, now), [items, now]);
  const visible = useMemo(
    () => filterPromotions(items, filter, now),
    [items, filter, now],
  );
  const selected = items.find((item) => item.id === selectedId) ?? null;

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
    setFormError("");
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
      else setFormError(errorMessage(cause));
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
            Gere cupons e links com base em regras de preço e comissão já
            publicadas. O código aparece uma única vez, na criação.
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

      <PromotionsToolbar
        error={error}
        showError={drawer === "closed"}
        loadFailed={loadFailed}
        notice={notice}
        filter={filter}
        counts={counts}
        onRetry={() => {
          setLoading(true);
          setRevision((value) => value + 1);
        }}
        onFilter={setFilter}
      />

      <PromotionsList
        items={items}
        visible={visible}
        loading={loading}
        loadFailed={loadFailed}
        filtering={filtering}
        now={now}
        selectedId={selectedId}
        viewing={drawer === "view"}
        orgName={orgName}
        ruleName={ruleName}
        onOpen={openPromotion}
        onNew={openNew}
        onClearFilter={() => setFilter("")}
      />

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
              <PromotionDetail
                selected={selected}
                now={now}
                formError={formError}
                busy={busy}
                orgName={orgName}
                ruleName={ruleName}
                onClose={closeDrawer}
                onAskSuspend={() => setAskSuspend(true)}
              />
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
