import { useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  createPromotion,
  listPromotions,
  suspendPromotion,
  type CreatePromotionBody,
  type PromotionAsset,
  type PromotionCreateResult,
} from "./api";
import { EntityPicker } from "./EntityPicker";
import {
  LIMIT_NOTES,
  resolveOrganization,
  searchOrganizations,
  searchPromotionPolicies,
} from "./lookups";
import "./commercial-policies.css";
import {
  promotionKindLabel,
  statusLabel as genericStatusLabel,
} from "./display-labels";

type FormState = {
  policyVersionId: string;
  organizationId: string;
  kind: "coupon" | "link";
  validFrom: string;
  validUntil: string;
  publicLabel: string;
  useLimit: string;
};

function initialForm(): FormState {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const local = (date: Date) =>
    new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);
  return {
    policyVersionId: "",
    organizationId: "",
    kind: "coupon",
    validFrom: local(now),
    validUntil: local(nextWeek),
    publicLabel: "",
    useLimit: "",
  };
}

function errorMessage(cause: unknown): string {
  return cause instanceof ApiError
    ? cause.detail
    : "Não foi possível consultar a API agora.";
}

function statusLabel(status: string): string {
  if (status === "active") return "Ativo";
  if (status === "suspended") return "Suspenso";
  if (status === "expired") return "Expirado";
  return genericStatusLabel(status);
}

export function Promotions({
  csrf,
  onUnauthorized,
}: {
  csrf: string;
  onUnauthorized: () => void;
}) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [items, setItems] = useState<PromotionAsset[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [createdAsset, setCreatedAsset] =
    useState<PromotionCreateResult | null>(null);
  const [pendingSuspendId, setPendingSuspendId] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    listPromotions()
      .then((page) => {
        if (!live) return;
        setItems(page.items);
        setNextCursor(page.next_cursor);
      })
      .catch((cause) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setError(errorMessage(cause));
      });
    return () => {
      live = false;
    };
  }, [revision, onUnauthorized]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body: CreatePromotionBody = {
        policy_version_id: form.policyVersionId.trim(),
        organization_id: form.organizationId.trim(),
        kind: form.kind,
        valid_from: new Date(form.validFrom).toISOString(),
        valid_until: new Date(form.validUntil).toISOString(),
        public_label: form.publicLabel.trim() || null,
        use_limit: form.useLimit ? Number(form.useLimit) : null,
      };
      const result = await createPromotion(body, csrf);
      setCreatedAsset(result);
      setForm(initialForm());
      setRevision((v) => v + 1);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function suspend(assetId: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await suspendPromotion(assetId, csrf);
      setPendingSuspendId(null);
      setNotice(
        "Promoção suspensa. Resgates futuros deste código foram bloqueados.",
      );
      setRevision((v) => v + 1);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function more() {
    if (!nextCursor) return;
    setBusy(true);
    setError("");
    try {
      const page = await listPromotions(nextCursor);
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.next_cursor);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="content commercial-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Governança comercial</p>
          <h1>Promoções</h1>
          <p className="muted">
            Cupons e links vinculados a versões de regra com canal&nbsp;
            <code>promotion</code>.
          </p>
        </div>
        <span className="pill">Administrador</span>
      </header>
      <div className="notice" role="note">
        O código gerado é exibido uma única vez. Entregue ao parceiro por canal
        seguro; a API não o armazena em texto simples.
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="profile-saved" role="status">
          {notice}
        </p>
      )}
      {createdAsset && (
        <div className="commercial-decision" role="status" aria-live="polite">
          <strong>Promoção criada — código gerado uma única vez</strong>
          <p>
            ID: <code>{createdAsset.id}</code>
          </p>
          <p>
            Código: <code>{createdAsset.plain_code}</code>
          </p>
          <p>
            Tipo: {promotionKindLabel(createdAsset.kind)} · Limite:{" "}
            {createdAsset.use_limit ?? "ilimitado"}
          </p>
          <button
            type="button"
            className="button secondary"
            onClick={() => setCreatedAsset(null)}
          >
            Entendido — fechar
          </button>
        </div>
      )}
      <div className="workspace">
        <section className="form-panel">
          <h2>Nova promoção</h2>
          <p className="muted">
            Selecione a versão de regra publicada com canal&nbsp;
            <code>promotion</code> e defina a janela de validade.
          </p>
          <form
            className="form commercial-form"
            onSubmit={(event) => void submit(event)}
          >
            <EntityPicker
              id="promo-policy"
              label="Versão de regra publicada"
              placeholder="Buscar regra de promoção publicada"
              required
              value={form.policyVersionId}
              search={searchPromotionPolicies}
              limitNote={LIMIT_NOTES.policies}
              onChange={(id) => set("policyVersionId", id)}
            />
            <EntityPicker
              id="promo-org"
              label="Organização"
              placeholder="Buscar organização pelo nome"
              required
              value={form.organizationId}
              search={searchOrganizations}
              resolve={resolveOrganization}
              onChange={(id) => set("organizationId", id)}
            />
            <label htmlFor="promo-kind">Tipo</label>
            <select
              id="promo-kind"
              value={form.kind}
              onChange={(event) =>
                set("kind", event.target.value as "coupon" | "link")
              }
            >
              <option value="coupon">Cupom</option>
              <option value="link">Link</option>
            </select>
            <div className="commercial-grid">
              <label>
                Início
                <input
                  type="datetime-local"
                  value={form.validFrom}
                  onChange={(event) => set("validFrom", event.target.value)}
                  required
                />
              </label>
              <label>
                Fim
                <input
                  type="datetime-local"
                  value={form.validUntil}
                  onChange={(event) => set("validUntil", event.target.value)}
                  required
                />
              </label>
            </div>
            <label htmlFor="promo-label">Rótulo público (opcional)</label>
            <input
              id="promo-label"
              maxLength={200}
              value={form.publicLabel}
              onChange={(event) => set("publicLabel", event.target.value)}
              placeholder="Ex.: 10% de desconto na primeira consulta"
            />
            <label htmlFor="promo-limit">
              Limite de usos (vazio = ilimitado)
            </label>
            <input
              id="promo-limit"
              type="number"
              min="1"
              step="1"
              value={form.useLimit}
              onChange={(event) => set("useLimit", event.target.value)}
              placeholder="Ex.: 100"
            />
            <button className="button primary" disabled={busy}>
              Gerar código
            </button>
          </form>
        </section>
        <aside className="side-panel">
          <p className="eyebrow">Códigos gerados</p>
          <h2>Ativos</h2>
          {items.length === 0 ? (
            <p>Nenhuma promoção cadastrada.</p>
          ) : (
            <ul className="commercial-list">
              {items.map((asset) => (
                <li key={asset.id}>
                  <div className="commercial-list-head">
                    <strong>{promotionKindLabel(asset.kind)}</strong>
                    <span className="pill">{statusLabel(asset.status)}</span>
                  </div>
                  <small>ID: {asset.id}</small>
                  {asset.public_label && <p>{asset.public_label}</p>}
                  <small>
                    Usos: {asset.use_count}
                    {asset.use_limit ? ` / ${asset.use_limit}` : ""} · Válida
                    até {new Date(asset.valid_until).toLocaleString("pt-BR")}
                  </small>
                  {asset.status === "active" && (
                    <>
                      {pendingSuspendId === asset.id ? (
                        <div className="commercial-decision">
                          <p>
                            Confirmar suspensão? Esta ação bloqueia resgates
                            futuros.
                          </p>
                          <div className="button-row">
                            <button
                              type="button"
                              className="button secondary"
                              disabled={busy}
                              onClick={() => void suspend(asset.id)}
                            >
                              Confirmar suspensão
                            </button>
                            <button
                              type="button"
                              className="button secondary"
                              onClick={() => setPendingSuspendId(null)}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => setPendingSuspendId(asset.id)}
                        >
                          Suspender
                        </button>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          {nextCursor && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => void more()}
            >
              Carregar mais
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
