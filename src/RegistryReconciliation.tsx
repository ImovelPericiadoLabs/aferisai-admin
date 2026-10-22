import { useEffect, useState, type FormEvent } from "react";
import {
  listUncertainSubmissions,
  reconcileNoPurchase,
  reconcileProtocol,
  type UncertainSubmissionItem,
} from "./api";
import "./commercial-policies.css";

type Action = "no-purchase" | "protocol" | null;
type Expanded = { itemId: string; action: Action };

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

export function RegistryReconciliation({ csrf }: { csrf: string }) {
  const [items, setItems] = useState<UncertainSubmissionItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [expanded, setExpanded] = useState<Expanded | null>(null);
  const [reason, setReason] = useState("");
  const [protocol, setProtocol] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  async function load(cursor?: string) {
    setLoading(true);
    setListError("");
    try {
      const page = await listUncertainSubmissions(cursor);
      setItems((prev) => (cursor ? [...prev, ...page.items] : page.items));
      setNextCursor(page.next_cursor);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Erro ao carregar lista.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function expand(item: UncertainSubmissionItem, action: Action) {
    setExpanded({ itemId: item.item_id, action });
    setReason("");
    setProtocol("");
    setActionError("");
  }

  function collapse() {
    setExpanded(null);
    setActionError("");
  }

  async function submit(e: FormEvent, item: UncertainSubmissionItem) {
    e.preventDefault();
    if (!expanded) return;
    setBusy(true);
    setActionError("");
    try {
      if (expanded.action === "no-purchase") {
        await reconcileNoPurchase(item.item_id, reason, csrf);
      } else {
        await reconcileProtocol(item.item_id, protocol, reason, csrf);
      }
      setResolvedIds((prev) => new Set([...prev, item.item_id]));
      setExpanded(null);
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Erro ao registrar decisão.",
      );
    } finally {
      setBusy(false);
    }
  }

  const visible = items.filter((i) => !resolvedIds.has(i.item_id));

  return (
    <div className="content commercial-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Aquisição registral</p>
          <h1>Conciliação de submissões incertas</h1>
          <p className="muted">
            Submissões ONR cujo resultado não pôde ser confirmado
            automaticamente. Cada item exige decisão manual auditada antes de
            qualquer nova tentativa.
          </p>
        </div>
        <span className="pill">Gestor</span>
      </header>
      {listError && (
        <p className="error" role="alert">
          {listError}
        </p>
      )}
      {loading && <p className="muted">Carregando…</p>}
      {!loading && visible.length === 0 && !listError && (
        <p className="muted">Nenhuma submissão incerta no momento.</p>
      )}
      <ul className="commercial-list">
        {visible.map((item) => {
          const isOpen = expanded?.itemId === item.item_id;
          return (
            <li key={item.item_id}>
              <div className="commercial-list-head">
                <div>
                  <strong>Operação</strong> <code>{item.operation_id}</code>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    alignItems: "center",
                    flexWrap: "wrap",
                    marginTop: "0.4rem",
                  }}
                >
                  <span className="pill" style={{ fontSize: "0.75rem" }}>
                    {item.provider}
                  </span>
                  <small>Tentada: {fmtDate(item.attempted_at)}</small>
                </div>
              </div>
              {!isOpen && (
                <div
                  style={{
                    display: "flex",
                    gap: "0.7rem",
                    marginTop: "0.8rem",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => expand(item, "no-purchase")}
                  >
                    Sem compra
                  </button>
                  <button
                    type="button"
                    className="button primary"
                    onClick={() => expand(item, "protocol")}
                  >
                    Confirmar protocolo
                  </button>
                </div>
              )}
              {isOpen && expanded && (
                <form
                  onSubmit={(e) => void submit(e, item)}
                  style={{
                    marginTop: "0.8rem",
                    display: "grid",
                    gap: "0.8rem",
                  }}
                >
                  {expanded.action === "no-purchase" ? (
                    <p className="muted">
                      Registrar que <strong>nenhuma compra</strong> foi
                      realizada nesta submissão.
                    </p>
                  ) : (
                    <label style={{ display: "grid", gap: "0.35rem" }}>
                      Protocolo ONR confirmado
                      <input
                        type="text"
                        maxLength={160}
                        required
                        value={protocol}
                        onChange={(e) => setProtocol(e.target.value)}
                        placeholder="Número do protocolo ONR"
                      />
                    </label>
                  )}
                  <label style={{ display: "grid", gap: "0.35rem" }}>
                    Justificativa da decisão (20–2000 caracteres)
                    <textarea
                      required
                      minLength={20}
                      maxLength={2000}
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                  {actionError && (
                    <p className="error" role="alert">
                      {actionError}
                    </p>
                  )}
                  <div
                    style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}
                  >
                    <button
                      type="submit"
                      className="button primary"
                      disabled={busy}
                    >
                      {busy ? "Registrando…" : "Confirmar decisão"}
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={collapse}
                      disabled={busy}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </li>
          );
        })}
      </ul>
      {nextCursor && (
        <button
          type="button"
          className="button secondary"
          disabled={loading}
          onClick={() => void load(nextCursor)}
        >
          Carregar mais
        </button>
      )}
    </div>
  );
}
