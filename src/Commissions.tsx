import { useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  createCommissionSettlement,
  listCommissionEntries,
  listCommissionSettlements,
  reverseCommissionEntry,
  type CommissionEntry,
  type CommissionSettlement,
  type CreateSettlementBody,
} from "./api";
import "./commercial-policies.css";
import { itemLabel, statusLabel as genericStatusLabel } from "./display-labels";

type View = "entries" | "settlements";

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );

const dateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));

function statusLabel(status: string): string {
  if (status === "provisional") return "Provisório";
  if (status === "owed") return "Devido";
  if (status === "settled") return "Liquidado";
  if (status === "reversed") return "Revertido";
  return genericStatusLabel(status);
}

function statusClass(status: string): string {
  if (status === "owed") return "badge-blue";
  if (status === "settled") return "badge-green";
  if (status === "reversed") return "badge-red";
  return "badge-gray";
}

function errorMessage(cause: unknown): string {
  return cause instanceof ApiError
    ? cause.detail
    : "Não foi possível consultar a API agora.";
}

function EntriesTab({
  csrf,
  onUnauthorized,
}: {
  csrf: string;
  onUnauthorized: () => void;
}) {
  const [items, setItems] = useState<CommissionEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [orgFilter, setOrgFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [appliedOrg, setAppliedOrg] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [selectedForSettlement, setSelectedForSettlement] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
    let live = true;
    setBusy(true);
    listCommissionEntries(
      undefined,
      appliedOrg || undefined,
      appliedStatus || undefined,
    )
      .then((page) => {
        if (!live) return;
        setItems(page.items);
        setNextCursor(page.next_cursor);
        setSelectedForSettlement(new Set());
      })
      .catch((cause) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setError(errorMessage(cause));
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [revision, appliedOrg, appliedStatus, onUnauthorized]);

  async function more() {
    if (!nextCursor) return;
    setBusy(true);
    setError("");
    try {
      const page = await listCommissionEntries(
        nextCursor,
        appliedOrg || undefined,
        appliedStatus || undefined,
      );
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.next_cursor);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function reverse(entryId: string) {
    if (reverseReason.trim().length < 3) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await reverseCommissionEntry(entryId, reverseReason.trim(), csrf);
      setSelectedId(null);
      setReverseReason("");
      setNotice("Obrigação revertida com motivo registrado.");
      setRevision((v) => v + 1);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  function toggleSettlement(id: string, status: string) {
    if (status !== "owed") return;
    setSelectedForSettlement((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selected = items.find((e) => e.id === selectedId);

  return (
    <div>
      <div className="commercial-decision" style={{ marginBottom: "1rem" }}>
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault();
            setAppliedOrg(orgFilter.trim());
            setAppliedStatus(statusFilter);
            setRevision((v) => v + 1);
          }}
        >
          <label htmlFor="entry-org">UUID da organização (opcional)</label>
          <input
            id="entry-org"
            value={orgFilter}
            onChange={(event) => setOrgFilter(event.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
          <label htmlFor="entry-status">Estado</label>
          <select
            id="entry-status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">Todos</option>
            <option value="provisional">Provisório</option>
            <option value="owed">Devido</option>
            <option value="settled">Liquidado</option>
            <option value="reversed">Revertido</option>
          </select>
          <button type="submit" className="button secondary" disabled={busy}>
            Filtrar
          </button>
        </form>
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
      {selectedForSettlement.size > 0 && (
        <div className="notice" role="note">
          {selectedForSettlement.size} obrigação(ões) selecionada(s) para
          repasse. Vá à aba Repasses para registrar.
        </div>
      )}
      <div className="workspace">
        <section className="form-panel">
          {items.length === 0 ? (
            <p>Nenhuma obrigação encontrada com estes filtros.</p>
          ) : (
            <ul className="commercial-list">
              {items.map((entry) => (
                <li key={entry.id}>
                  <div className="commercial-list-head">
                    <span>
                      {entry.status === "owed" && (
                        <input
                          type="checkbox"
                          aria-label={`Selecionar ${entry.id} para repasse`}
                          checked={selectedForSettlement.has(entry.id)}
                          onChange={() =>
                            toggleSettlement(entry.id, entry.status)
                          }
                          style={{ marginRight: "0.5rem" }}
                        />
                      )}
                      <strong>{money(entry.amount_cents)}</strong>
                    </span>
                    <span className={`badge ${statusClass(entry.status)}`}>
                      {statusLabel(entry.status)}
                    </span>
                  </div>
                  <small>
                    {itemLabel(entry.item_kind)} · {dateTime(entry.created_at)}
                  </small>
                  <small>Org: {entry.beneficiary_organization_id}</small>
                  <button
                    type="button"
                    className="button secondary"
                    style={{ marginTop: "0.25rem" }}
                    onClick={() => {
                      setSelectedId(entry.id === selectedId ? null : entry.id);
                      setReverseReason("");
                    }}
                  >
                    {selectedId === entry.id ? "Fechar" : "Detalhes"}
                  </button>
                  {selectedId === entry.id && selected && (
                    <div className="commercial-decision">
                      <p>
                        <strong>ID:</strong> {entry.id}
                      </p>
                      <p>
                        <strong>Intenção:</strong> {entry.payment_intent_id}
                      </p>
                      <p>
                        <strong>Política:</strong> {entry.policy_version_id}
                      </p>
                      {entry.settlement_id && (
                        <p>
                          <strong>Repasse:</strong> {entry.settlement_id}
                        </p>
                      )}
                      {entry.status === "owed" && (
                        <>
                          <label htmlFor={`reverse-${entry.id}`}>
                            Motivo da reversão
                          </label>
                          <input
                            id={`reverse-${entry.id}`}
                            minLength={3}
                            maxLength={500}
                            value={reverseReason}
                            onChange={(event) =>
                              setReverseReason(event.target.value)
                            }
                          />
                          <button
                            type="button"
                            className="button secondary"
                            disabled={busy || reverseReason.trim().length < 3}
                            onClick={() => void reverse(entry.id)}
                          >
                            Reverter obrigação
                          </button>
                        </>
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
        </section>
        <aside className="side-panel">
          <p className="eyebrow">Para repasse em lote</p>
          <h2>Selecionar devidos</h2>
          <p className="muted">
            Marque as obrigações no estado <strong>Devido</strong> para incluir
            em um repasse. Depois, vá à aba Repasses para registrar.
          </p>
          {selectedForSettlement.size > 0 && (
            <ul style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
              {[...selectedForSettlement].map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

function SettlementsTab({
  csrf,
  onUnauthorized,
}: {
  csrf: string;
  onUnauthorized: () => void;
}) {
  const [items, setItems] = useState<CommissionSettlement[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [orgFilter, setOrgFilter] = useState("");
  const [appliedOrg, setAppliedOrg] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    organizationId: "",
    externalReference: "",
    amountReais: "",
    evidenceNote: "",
    settledAt: "",
    entryIds: "",
  });

  useEffect(() => {
    let live = true;
    setBusy(true);
    listCommissionSettlements(undefined, appliedOrg || undefined)
      .then((page) => {
        if (!live) return;
        setItems(page.items);
        setNextCursor(page.next_cursor);
      })
      .catch((cause) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setError(errorMessage(cause));
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [revision, appliedOrg, onUnauthorized]);

  async function more() {
    if (!nextCursor) return;
    setBusy(true);
    setError("");
    try {
      const page = await listCommissionSettlements(
        nextCursor,
        appliedOrg || undefined,
      );
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.next_cursor);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const entry_ids = form.entryIds
        .split(/[\n,]+/)
        .map((id) => id.trim())
        .filter(Boolean);
      const body: CreateSettlementBody = {
        beneficiary_organization_id: form.organizationId.trim(),
        external_reference: form.externalReference.trim(),
        amount_cents: Math.round(Number(form.amountReais) * 100),
        evidence_note: form.evidenceNote.trim(),
        settled_at: new Date(form.settledAt).toISOString(),
        entry_ids,
      };
      const created = await createCommissionSettlement(body, csrf);
      setNotice(
        `Repasse ${created.id} registrado. Obrigações marcadas como liquidadas.`,
      );
      setForm({
        organizationId: "",
        externalReference: "",
        amountReais: "",
        evidenceNote: "",
        settledAt: "",
        entryIds: "",
      });
      setRevision((v) => v + 1);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspace">
      <section className="form-panel">
        <h2>Registrar repasse</h2>
        <p className="muted">
          Insira somente após a transferência externa ter sido concluída. Cada
          obrigação deve estar no estado <strong>Devido</strong>.
        </p>
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
        <form
          className="form commercial-form"
          onSubmit={(event) => void submit(event)}
        >
          <label htmlFor="set-org">UUID da organização beneficiária</label>
          <input
            id="set-org"
            value={form.organizationId}
            onChange={(event) =>
              setForm((f) => ({ ...f, organizationId: event.target.value }))
            }
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            required
          />
          <label htmlFor="set-ref">Referência externa (comprovante)</label>
          <input
            id="set-ref"
            maxLength={500}
            value={form.externalReference}
            onChange={(event) =>
              setForm((f) => ({ ...f, externalReference: event.target.value }))
            }
            placeholder="PIX-2026-10-21-001"
            required
          />
          <label htmlFor="set-amount">Valor transferido (R$)</label>
          <input
            id="set-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={form.amountReais}
            onChange={(event) =>
              setForm((f) => ({ ...f, amountReais: event.target.value }))
            }
            required
          />
          <label htmlFor="set-note">Nota de evidência</label>
          <textarea
            id="set-note"
            minLength={3}
            maxLength={1000}
            value={form.evidenceNote}
            onChange={(event) =>
              setForm((f) => ({ ...f, evidenceNote: event.target.value }))
            }
            required
          />
          <label htmlFor="set-date">Data e hora do repasse</label>
          <input
            id="set-date"
            type="datetime-local"
            value={form.settledAt}
            onChange={(event) =>
              setForm((f) => ({ ...f, settledAt: event.target.value }))
            }
            required
          />
          <label htmlFor="set-entries">
            IDs das obrigações (um por linha ou separados por vírgula)
          </label>
          <textarea
            id="set-entries"
            value={form.entryIds}
            onChange={(event) =>
              setForm((f) => ({ ...f, entryIds: event.target.value }))
            }
            placeholder="UUID1&#10;UUID2"
            required
          />
          <button className="button primary" disabled={busy}>
            Registrar repasse
          </button>
        </form>
      </section>
      <aside className="side-panel">
        <div className="commercial-decision" style={{ marginBottom: "1rem" }}>
          <form
            className="form"
            onSubmit={(event) => {
              event.preventDefault();
              setAppliedOrg(orgFilter.trim());
              setRevision((v) => v + 1);
            }}
          >
            <label htmlFor="set-org-filter">Filtrar por organização</label>
            <input
              id="set-org-filter"
              value={orgFilter}
              onChange={(event) => setOrgFilter(event.target.value)}
              placeholder="UUID opcional"
            />
            <button type="submit" className="button secondary" disabled={busy}>
              Filtrar
            </button>
          </form>
        </div>
        <p className="eyebrow">Repasses registrados</p>
        <h2>Histórico</h2>
        {items.length === 0 ? (
          <p>Nenhum repasse registrado.</p>
        ) : (
          <ul className="commercial-list">
            {items.map((s) => (
              <li key={s.id}>
                <div className="commercial-list-head">
                  <strong>{money(s.amount_cents)}</strong>
                  <span className="pill">liquidado</span>
                </div>
                <small>Ref: {s.external_reference}</small>
                <small>Data: {dateTime(s.settled_at)}</small>
                <small>Org: {s.beneficiary_organization_id}</small>
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
  );
}

export function Commissions({
  csrf,
  onUnauthorized,
}: {
  csrf: string;
  onUnauthorized: () => void;
}) {
  const [view, setView] = useState<View>("entries");

  return (
    <div className="content commercial-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Papel financeiro</p>
          <h1>Comissões</h1>
          <p className="muted">
            Obrigações por item concluído e repasses externos verificados.
          </p>
        </div>
        <span className="pill">Financeiro</span>
      </header>
      <div className="notice" role="note">
        O clique não substitui a evidência de transferência bancária. Registre
        somente após o comprovante externo verificado.
      </div>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <button
          type="button"
          className={`button ${view === "entries" ? "primary" : "secondary"}`}
          onClick={() => setView("entries")}
        >
          Obrigações
        </button>
        <button
          type="button"
          className={`button ${view === "settlements" ? "primary" : "secondary"}`}
          onClick={() => setView("settlements")}
        >
          Repasses
        </button>
      </div>
      {view === "entries" ? (
        <EntriesTab csrf={csrf} onUnauthorized={onUnauthorized} />
      ) : (
        <SettlementsTab csrf={csrf} onUnauthorized={onUnauthorized} />
      )}
    </div>
  );
}
