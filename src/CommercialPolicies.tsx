import { useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  createCommercialPolicyDraft,
  decideCommercialPolicy,
  listCommercialPolicies,
  previewCommercialPolicy,
  updateCommercialPolicyDraft,
  type CommercialPolicy,
  type CommercialPolicyDraft,
  type CommercialPolicyPreview,
} from "./api";
import "./commercial-policies.css";
import { itemLabel, sourceLabel, statusLabel } from "./display-labels";

type FormState = {
  organizationId: string;
  applicationId: string;
  channel: "site" | "integration" | "promotion";
  source: "number" | "cnm" | "address" | "upload";
  itemCode: string;
  attribution: "public" | "connected" | "coupon" | "link";
  validFrom: string;
  validUntil: string;
  discountPercent: string;
  discountReais: string;
  commissionPercent: string;
  commissionReais: string;
  reason: string;
};

function initialForm(): FormState {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const local = (date: Date) =>
    new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);
  return {
    organizationId: "",
    applicationId: "",
    channel: "site",
    source: "number",
    itemCode: "matricula",
    attribution: "public",
    validFrom: local(now),
    validUntil: local(tomorrow),
    discountPercent: "0",
    discountReais: "0",
    commissionPercent: "0",
    commissionReais: "0",
    reason: "",
  };
}

function toLocal(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

const cents = (value: string) => Math.round(Number(value) * 100);
const bps = (value: string) => Math.round(Number(value) * 100);
const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);

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
  const [form, setForm] = useState<FormState>(initialForm);
  const [items, setItems] = useState<CommercialPolicy[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [decisionId, setDecisionId] = useState<string | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewBasePrice, setPreviewBasePrice] = useState("");
  const [previewItemCount, setPreviewItemCount] = useState("1");
  const [previewResult, setPreviewResult] =
    useState<CommercialPolicyPreview | null>(null);

  useEffect(() => {
    let live = true;
    listCommercialPolicies()
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
      const body: CommercialPolicyDraft = {
        organization_id:
          form.channel === "site" ? null : form.organizationId.trim() || null,
        application_id:
          form.channel === "integration"
            ? form.applicationId.trim() || null
            : null,
        channel: form.channel,
        source: form.source,
        item_code: form.itemCode.trim(),
        attribution: form.attribution,
        valid_from: new Date(form.validFrom).toISOString(),
        valid_until: new Date(form.validUntil).toISOString(),
        discount_fixed_cents: cents(form.discountReais),
        discount_rate_bps: bps(form.discountPercent),
        commission_fixed_cents: cents(form.commissionReais),
        commission_rate_bps: bps(form.commissionPercent),
        reason: form.reason.trim(),
      };
      if (editingId !== null) {
        await updateCommercialPolicyDraft(editingId, body, csrf);
        setNotice("Rascunho atualizado. Revise o escopo antes de publicar.");
        setEditingId(null);
      } else {
        const created = await createCommercialPolicyDraft(body, csrf);
        setNotice(
          `Rascunho ${created.id} registrado. Revise o escopo antes de publicar.`,
        );
      }
      setForm(initialForm());
      setRevision((value) => value + 1);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function decide(policy: CommercialPolicy) {
    if (!decisionReason.trim()) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const action = policy.status === "draft" ? "publish" : "suspend";
      await decideCommercialPolicy(
        policy.id,
        action,
        decisionReason.trim(),
        csrf,
      );
      setDecisionId(null);
      setDecisionReason("");
      setNotice(
        action === "publish"
          ? "Versão publicada. Ainda não é usada no checkout."
          : "Versão suspensa para novas cotações.",
      );
      setRevision((value) => value + 1);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  function fillFormFromPolicy(policy: CommercialPolicy) {
    setForm({
      organizationId: policy.organization_id ?? "",
      applicationId: policy.application_id ?? "",
      channel: policy.channel,
      source: policy.source,
      itemCode: policy.item_code,
      attribution: policy.attribution,
      validFrom: toLocal(policy.valid_from),
      validUntil: toLocal(policy.valid_until),
      discountPercent: (policy.discount_rate_bps / 100).toString(),
      discountReais: (policy.discount_fixed_cents / 100).toString(),
      commissionPercent: (policy.commission_rate_bps / 100).toString(),
      commissionReais: (policy.commission_fixed_cents / 100).toString(),
      reason: "",
    });
    setEditingId(policy.id);
    setError("");
    setNotice("");
  }

  async function simulate(policy: CommercialPolicy) {
    const base = Math.round(Number(previewBasePrice) * 100);
    const count = Number(previewItemCount);
    if (!base || !count) return;
    setBusy(true);
    setError("");
    setPreviewResult(null);
    try {
      const result = await previewCommercialPolicy(
        policy.id,
        base,
        count,
        csrf,
      );
      setPreviewResult(result);
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
      const page = await listCommercialPolicies(nextCursor);
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
          <h1>Regras comerciais</h1>
          <p className="muted">
            Versões por organização, aplicação, canal e item.
          </p>
        </div>
        <span className="pill">Administrador</span>
      </header>
      <div className="notice" role="note">
        Publicar registra a condição aprovada, mas o checkout registral ainda
        não aplica estas versões nem emite cobrança.
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
      <div className="workspace">
        <section className="form-panel">
          <h2>{editingId !== null ? "Editar rascunho" : "Nova versão"}</h2>
          <p className="muted">
            Valores e percentuais são aplicados apenas aos itens elegíveis
            quando a integração de cotação estiver pronta.
          </p>
          <form
            className="form commercial-form"
            onSubmit={(event) => void submit(event)}
          >
            <label htmlFor="policy-channel">Canal</label>
            <select
              id="policy-channel"
              value={form.channel}
              onChange={(event) => {
                const channel = event.target.value as FormState["channel"];
                setForm((current) => ({
                  ...current,
                  channel,
                  attribution:
                    channel === "site"
                      ? "public"
                      : channel === "integration"
                        ? "connected"
                        : "coupon",
                }));
              }}
            >
              <option value="site">Site direto</option>
              <option value="integration">Integração</option>
              <option value="promotion">Promoção</option>
            </select>
            {form.channel !== "site" && (
              <>
                <label htmlFor="policy-organization">UUID da organização</label>
                <input
                  id="policy-organization"
                  value={form.organizationId}
                  onChange={(event) =>
                    set("organizationId", event.target.value)
                  }
                  required
                />
              </>
            )}
            {form.channel === "integration" && (
              <>
                <label htmlFor="policy-application">UUID da aplicação</label>
                <input
                  id="policy-application"
                  value={form.applicationId}
                  onChange={(event) => set("applicationId", event.target.value)}
                  required
                />
              </>
            )}
            {form.channel === "promotion" && (
              <>
                <label htmlFor="policy-attribution">Origem da promoção</label>
                <select
                  id="policy-attribution"
                  value={form.attribution}
                  onChange={(event) =>
                    set(
                      "attribution",
                      event.target.value as FormState["attribution"],
                    )
                  }
                >
                  <option value="coupon">Cupom</option>
                  <option value="link">Link</option>
                </select>
              </>
            )}
            <label htmlFor="policy-source">Entrada da consulta</label>
            <select
              id="policy-source"
              value={form.source}
              onChange={(event) =>
                set("source", event.target.value as FormState["source"])
              }
            >
              <option value="number">Número</option>
              <option value="cnm">CNM</option>
              <option value="address">Endereço</option>
              <option value="upload">Arquivo</option>
            </select>
            <label htmlFor="policy-item">Item</label>
            <input
              id="policy-item"
              value={form.itemCode}
              onChange={(event) => set("itemCode", event.target.value)}
              maxLength={80}
              required
              aria-describedby="policy-item-help"
            />
            <small id="policy-item-help">
              Código do item ou * para todos os itens da entrada.
            </small>
            <div className="commercial-policy-groups">
              <fieldset className="commercial-fieldset">
                <legend>Vigência</legend>
                <div className="commercial-pair commercial-period">
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
                      onChange={(event) =>
                        set("validUntil", event.target.value)
                      }
                      required
                    />
                  </label>
                </div>
              </fieldset>
              <fieldset className="commercial-fieldset">
                <legend>Desconto</legend>
                <div className="commercial-pair">
                  <label>
                    Desconto %
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.discountPercent}
                      onChange={(event) =>
                        set("discountPercent", event.target.value)
                      }
                      required
                    />
                  </label>
                  <label>
                    Desconto R$
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.discountReais}
                      onChange={(event) =>
                        set("discountReais", event.target.value)
                      }
                      required
                    />
                  </label>
                </div>
              </fieldset>
              <fieldset className="commercial-fieldset">
                <legend>Comissão</legend>
                <div className="commercial-pair">
                  <label>
                    Comissão %
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.commissionPercent}
                      onChange={(event) =>
                        set("commissionPercent", event.target.value)
                      }
                      required
                    />
                  </label>
                  <label>
                    Comissão R$
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.commissionReais}
                      onChange={(event) =>
                        set("commissionReais", event.target.value)
                      }
                      required
                    />
                  </label>
                </div>
              </fieldset>
            </div>
            <label htmlFor="policy-reason">Motivo</label>
            <textarea
              id="policy-reason"
              minLength={3}
              maxLength={500}
              value={form.reason}
              onChange={(event) => set("reason", event.target.value)}
              required
            />
            <div className="commercial-form-actions">
              <button className="button primary" disabled={busy}>
                {editingId !== null ? "Salvar rascunho" : "Registrar rascunho"}
              </button>
              {editingId !== null && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setEditingId(null);
                    setForm(initialForm());
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>
        <aside className="side-panel">
          <p className="eyebrow">Condições registradas</p>
          <h2>Versões</h2>
          {items.length === 0 ? (
            <p>Nenhuma versão cadastrada.</p>
          ) : (
            <ul className="commercial-list">
              {items.map((policy) => (
                <li key={policy.id}>
                  <div className="commercial-list-head">
                    <strong>{itemLabel(policy.item_code)}</strong>
                    <span
                      className={
                        policy.status === "published"
                          ? "badge-green"
                          : policy.status === "suspended"
                            ? "badge-red"
                            : "badge-gray"
                      }
                    >
                      {statusLabel(policy.status)}
                    </span>
                  </div>
                  <small>
                    {sourceLabel(policy.channel)} · {sourceLabel(policy.source)}{" "}
                    ·{" "}
                    {policy.organization_id
                      ? "Organização vinculada"
                      : "Site direto"}
                  </small>
                  <p>
                    Desconto {policy.discount_rate_bps / 100}% +{" "}
                    {money(policy.discount_fixed_cents)} · Comissão{" "}
                    {policy.commission_rate_bps / 100}% +{" "}
                    {money(policy.commission_fixed_cents)}
                  </p>
                  <small>
                    Válida até{" "}
                    {new Date(policy.valid_until).toLocaleString("pt-BR")}
                  </small>
                  {policy.status === "draft" && (
                    <div className="commercial-actions">
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => fillFormFromPolicy(policy)}
                      >
                        Editar
                      </button>
                      {decisionId === policy.id ? (
                        <div className="commercial-decision">
                          <label htmlFor={`reason-${policy.id}`}>
                            Motivo da publicação
                          </label>
                          <input
                            id={`reason-${policy.id}`}
                            minLength={3}
                            maxLength={500}
                            value={decisionReason}
                            onChange={(event) =>
                              setDecisionReason(event.target.value)
                            }
                          />
                          <button
                            type="button"
                            className="button secondary"
                            disabled={busy || decisionReason.trim().length < 3}
                            onClick={() => void decide(policy)}
                          >
                            Publicar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => {
                            setDecisionId(policy.id);
                            setDecisionReason("");
                          }}
                        >
                          Revisar publicação
                        </button>
                      )}
                    </div>
                  )}
                  {policy.status === "published" && (
                    <div className="commercial-actions">
                      {decisionId === policy.id ? (
                        <div className="commercial-decision">
                          <label htmlFor={`reason-${policy.id}`}>
                            Motivo da suspensão
                          </label>
                          <input
                            id={`reason-${policy.id}`}
                            minLength={3}
                            maxLength={500}
                            value={decisionReason}
                            onChange={(event) =>
                              setDecisionReason(event.target.value)
                            }
                          />
                          <button
                            type="button"
                            className="button secondary"
                            disabled={busy || decisionReason.trim().length < 3}
                            onClick={() => void decide(policy)}
                          >
                            Suspender
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => {
                            setDecisionId(policy.id);
                            setDecisionReason("");
                          }}
                        >
                          Revisar suspensão
                        </button>
                      )}
                      {previewId === policy.id ? (
                        <div className="commercial-simulate">
                          <label htmlFor={`base-${policy.id}`}>
                            Preço base (R$)
                          </label>
                          <input
                            id={`base-${policy.id}`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={previewBasePrice}
                            onChange={(event) =>
                              setPreviewBasePrice(event.target.value)
                            }
                          />
                          <label htmlFor={`count-${policy.id}`}>
                            Quantidade
                          </label>
                          <input
                            id={`count-${policy.id}`}
                            type="number"
                            min="1"
                            step="1"
                            value={previewItemCount}
                            onChange={(event) =>
                              setPreviewItemCount(event.target.value)
                            }
                          />
                          <button
                            type="button"
                            className="button secondary"
                            disabled={busy || !previewBasePrice}
                            onClick={() => void simulate(policy)}
                          >
                            Calcular
                          </button>
                          <button
                            type="button"
                            className="button secondary"
                            onClick={() => {
                              setPreviewId(null);
                              setPreviewResult(null);
                            }}
                          >
                            Fechar
                          </button>
                          {previewResult &&
                            previewResult.policy_version_id === policy.id && (
                              <dl className="commercial-preview-result">
                                <dt>Desconto</dt>
                                <dd>{money(previewResult.discount_cents)}</dd>
                                <dt>Comissão</dt>
                                <dd>{money(previewResult.commission_cents)}</dd>
                                <dt>A pagar</dt>
                                <dd>{money(previewResult.payable_cents)}</dd>
                                {previewResult.ineligible_reason && (
                                  <>
                                    <dt>Inelegível</dt>
                                    <dd>{previewResult.ineligible_reason}</dd>
                                  </>
                                )}
                              </dl>
                            )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => {
                            setPreviewId(policy.id);
                            setPreviewResult(null);
                            setPreviewBasePrice("");
                            setPreviewItemCount("1");
                          }}
                        >
                          Simular
                        </button>
                      )}
                    </div>
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
