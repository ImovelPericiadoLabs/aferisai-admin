import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ApiError,
  createCommissionSettlement,
  listCommissionSettlements,
  type CommissionSettlement,
  type CreateSettlementBody,
} from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import { EntityPicker } from "./EntityPicker";
import {
  LIMIT_NOTES,
  resolveOrganization,
  searchCommissionEntries,
  searchOrganizations,
} from "./lookups";
import { dateTime, errorMessage, money } from "./commissions-model";
import "./commercial-policies.css";

export function CommissionSettlementsTab({
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
  const [settleAsk, setSettleAsk] = useState(false);
  const [settleOrgName, setSettleOrgName] = useState("");
  const entryIdList = useMemo(
    () => form.entryIds.split(/[\s,]+/).filter(Boolean),
    [form.entryIds],
  );
  const entriesSearch = useMemo(
    () => searchCommissionEntries(form.organizationId, "owed"),
    [form.organizationId],
  );

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

  function requestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSettleAsk(true);
  }

  async function submit() {
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
      setSettleAsk(false);
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
        <form className="form commercial-form" onSubmit={requestSubmit}>
          <EntityPicker
            onUnauthorized={onUnauthorized}
            id="set-org"
            label="Organização beneficiária"
            placeholder="Buscar organização pelo nome"
            required
            value={form.organizationId}
            search={searchOrganizations}
            resolve={resolveOrganization}
            onChange={(id, option) => {
              setSettleOrgName(option?.label ?? "");
              setForm((f) => ({ ...f, organizationId: id, entryIds: "" }));
            }}
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
          <EntityPicker
            onUnauthorized={onUnauthorized}
            multiple
            id="set-entries"
            label="Obrigações incluídas no repasse"
            placeholder={
              form.organizationId
                ? "Buscar obrigações devidas"
                : "Escolha a organização primeiro"
            }
            required
            disabled={!form.organizationId}
            value={entryIdList}
            search={entriesSearch}
            cacheKey={form.organizationId}
            limitNote={LIMIT_NOTES.entries}
            hint="Mostra as obrigações com estado Devido da organização escolhida."
            onChange={(ids) =>
              setForm((f) => ({ ...f, entryIds: ids.join("\n") }))
            }
          />
          <button className="button primary" disabled={busy}>
            Registrar repasse
          </button>
        </form>
        <ConfirmDialog
          open={settleAsk}
          title="Registrar este repasse?"
          description="O repasse é um registro financeiro das obrigações selecionadas, com o comprovante informado. Confira os dados antes de continuar."
          details={[
            {
              label: "Organização",
              value: settleOrgName || form.organizationId,
            },
            {
              label: "Valor transferido",
              value: money(Math.round(Number(form.amountReais) * 100) || 0),
            },
            { label: "Obrigações", value: entryIdList.length },
            { label: "Referência", value: form.externalReference.trim() },
          ]}
          confirmLabel="Registrar repasse"
          busy={busy}
          onConfirm={() => void submit()}
          onCancel={() => setSettleAsk(false)}
        />
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
            <EntityPicker
              onUnauthorized={onUnauthorized}
              id="set-org-filter"
              label="Filtrar por organização"
              placeholder="Todas as organizações"
              value={orgFilter}
              search={searchOrganizations}
              resolve={resolveOrganization}
              onChange={setOrgFilter}
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
