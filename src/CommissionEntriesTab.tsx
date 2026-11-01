import { useEffect, useState } from "react";
import {
  ApiError,
  listCommissionEntries,
  reverseCommissionEntry,
  type CommissionEntry,
} from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import { EntityPicker } from "./EntityPicker";
import { resolveOrganization, searchOrganizations } from "./lookups";
import { itemLabel } from "./display-labels";
import {
  dateTime,
  errorMessage,
  money,
  statusClass,
  statusLabel,
} from "./commissions-model";
import "./commercial-policies.css";

export function CommissionEntriesTab({
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
  const [reverseAskId, setReverseAskId] = useState<string | null>(null);
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
      setReverseAskId(null);
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
          <EntityPicker
            onUnauthorized={onUnauthorized}
            id="entry-org"
            label="Organização (opcional)"
            placeholder="Todas as organizações"
            value={orgFilter}
            search={searchOrganizations}
            resolve={resolveOrganization}
            onChange={setOrgFilter}
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
                            onClick={() => setReverseAskId(entry.id)}
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
          <ConfirmDialog
            open={reverseAskId !== null}
            tone="danger"
            title="Reverter esta obrigação?"
            description="A comissão deixa de ser devida e o estado passa a Revertido. O motivo fica registrado e a ação não pode ser desfeita por aqui."
            details={[
              {
                label: "Valor",
                value: money(
                  items.find((item) => item.id === reverseAskId)
                    ?.amount_cents ?? 0,
                ),
              },
              { label: "Motivo", value: reverseReason.trim() },
            ]}
            confirmLabel="Reverter obrigação"
            busy={busy}
            onConfirm={() => reverseAskId && void reverse(reverseAskId)}
            onCancel={() => setReverseAskId(null)}
          />
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
