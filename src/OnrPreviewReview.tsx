import { useEffect, useState, type FormEvent } from "react";
import {
  listOnrPreviewAttempts,
  getOnrOrdersInspection,
  getOnrPreviewReviews,
  createOnrPreviewReview,
  type OnrPreviewAttentionItem,
  type OnrPortalOrdersInspection,
  type OnrPreviewReviewHistory,
} from "./api";
import "./commercial-policies.css";

type Stage = "list" | "inspect";

const DECISIONS: { value: string; label: string }[] = [
  {
    value: "draft_absent",
    label: "Rascunho ausente — pedido não aparece na lista do portal",
  },
  {
    value: "draft_present",
    label: "Rascunho presente — pedido aparece como rascunho",
  },
  {
    value: "purchase_suspected",
    label: "Compra suspeita — há indício de cobrança sem certeza",
  },
  {
    value: "inconclusive",
    label: "Inconclusivo — não é possível determinar o estado",
  },
];

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

export function OnrPreviewReview({ csrf }: { csrf: string }) {
  const [stage, setStage] = useState<Stage>("list");
  const [items, setItems] = useState<OnrPreviewAttentionItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<OnrPreviewAttentionItem | null>(
    null,
  );
  const [inspection, setInspection] =
    useState<OnrPortalOrdersInspection | null>(null);
  const [history, setHistory] = useState<OnrPreviewReviewHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [inspectError, setInspectError] = useState("");
  const [decision, setDecision] = useState("draft_absent");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  async function loadList(cursor?: string) {
    setLoading(true);
    setListError("");
    try {
      const page = await listOnrPreviewAttempts(cursor);
      setItems((prev) => (cursor ? [...prev, ...page.items] : page.items));
      setNextCursor(page.next_cursor);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Erro ao carregar lista.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadList();
  }, []);

  async function openAttempt(item: OnrPreviewAttentionItem) {
    setSelected(item);
    setInspection(null);
    setHistory(null);
    setInspectError("");
    setDecision("draft_absent");
    setReason("");
    setReviewError("");
    setStage("inspect");
    try {
      const [ins, hist] = await Promise.all([
        getOnrOrdersInspection(item.attempt_id),
        getOnrPreviewReviews(item.attempt_id),
      ]);
      setInspection(ins);
      setHistory(hist);
    } catch (e) {
      setInspectError(
        e instanceof Error ? e.message : "Erro ao carregar inspeção.",
      );
    }
  }

  async function submitReview(e: FormEvent) {
    e.preventDefault();
    if (!selected || !inspection) return;
    const previousReviewId = history?.items[0]?.id ?? null;
    setBusy(true);
    setReviewError("");
    try {
      await createOnrPreviewReview(
        selected.attempt_id,
        decision,
        reason,
        previousReviewId,
        inspection.listing_sha256,
        csrf,
      );
      setResolvedIds((prev) => new Set([...prev, selected.attempt_id]));
      backToList();
    } catch (e) {
      setReviewError(
        e instanceof Error ? e.message : "Erro ao registrar revisão.",
      );
    } finally {
      setBusy(false);
    }
  }

  function backToList() {
    setStage("list");
    setSelected(null);
    setInspection(null);
    setHistory(null);
  }

  const visible = items.filter((i) => !resolvedIds.has(i.attempt_id));

  if (stage === "list") {
    return (
      <div className="content commercial-page">
        <header className="page-head">
          <div>
            <p className="eyebrow">Aquisição registral</p>
            <h1>Revisão de prévia ONR</h1>
            <p className="muted">
              Tentativas de prévia ONR que aguardam decisão da equipe. Cada
              revisão requer inspeção visual dos pedidos no portal antes de
              classificar.
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
          <p className="muted">Nenhuma prévia aguardando revisão.</p>
        )}
        <ul className="commercial-list">
          {visible.map((item) => (
            <li key={item.attempt_id}>
              <div className="commercial-list-head">
                <div>
                  <strong>Tentativa</strong> <code>{item.attempt_id}</code>
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
                  <small>Iniciada: {fmtDate(item.started_at)}</small>
                  {item.latest_decision && (
                    <span className="pill" style={{ fontSize: "0.75rem" }}>
                      {item.latest_decision}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ marginTop: "0.8rem" }}>
                <button
                  type="button"
                  className="button primary"
                  onClick={() => void openAttempt(item)}
                >
                  Inspecionar e revisar
                </button>
              </div>
            </li>
          ))}
        </ul>
        {nextCursor && (
          <button
            type="button"
            className="button secondary"
            disabled={loading}
            onClick={() => void loadList(nextCursor)}
          >
            Carregar mais
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="content commercial-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Aquisição registral</p>
          <h1>Prévia ONR — inspeção e revisão</h1>
          <p className="muted">
            <code>{selected?.attempt_id}</code>
          </p>
        </div>
        <button type="button" className="button secondary" onClick={backToList}>
          ← Voltar à lista
        </button>
      </header>
      {inspectError && (
        <p className="error" role="alert">
          {inspectError}
        </p>
      )}
      {!inspection && !inspectError && (
        <p className="muted">Carregando inspeção do portal…</p>
      )}
      {inspection && (
        <>
          <div className="notice" role="note">
            Observado em: {fmtDate(inspection.observed_at)} · Cobertura:{" "}
            {inspection.coverage} · Páginas lidas: {inspection.pages_read}
            <br />
            SHA-256:{" "}
            <code style={{ fontSize: "0.75rem" }}>
              {inspection.listing_sha256.slice(0, 16)}…
            </code>
          </div>
          {inspection.orders.length === 0 ? (
            <p className="muted">
              Nenhum pedido encontrado na listagem do portal.
            </p>
          ) : (
            <table
              className="onr-orders-table"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "1rem",
                fontSize: "0.875rem",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "0.5rem",
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    Protocolo
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "0.5rem",
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    Data
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "0.5rem",
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {inspection.orders.map((o) => (
                  <tr key={o.protocol}>
                    <td
                      style={{
                        padding: "0.5rem",
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      <code>{o.protocol}</code>
                    </td>
                    <td
                      style={{
                        padding: "0.5rem",
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      {o.date}
                    </td>
                    <td
                      style={{
                        padding: "0.5rem",
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      {o.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
      {history && history.items.length > 0 && (
        <details style={{ marginTop: "1.2rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>
            Histórico de revisões ({history.items.length})
          </summary>
          <ul className="commercial-list" style={{ marginTop: "0.8rem" }}>
            {history.items.map((r) => (
              <li key={r.id}>
                <div className="commercial-list-head">
                  <span className="pill" style={{ fontSize: "0.75rem" }}>
                    {r.decision}
                  </span>
                  <small style={{ marginLeft: "0.7rem" }}>
                    {fmtDate(r.created_at)}
                  </small>
                </div>
                <p>{r.reason}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
      {inspection && (
        <form
          onSubmit={(e) => void submitReview(e)}
          style={{
            marginTop: "1.5rem",
            display: "grid",
            gap: "0.8rem",
            maxWidth: "600px",
          }}
        >
          <h2>Registrar decisão de revisão</h2>
          <p className="muted">
            A decisão usa o SHA-256 da listagem carregada acima como âncora de
            integridade. Verifique os pedidos antes de classificar.
          </p>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            Decisão
            <select
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
            >
              {DECISIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            Justificativa (20–2000 caracteres)
            <textarea
              required
              minLength={20}
              maxLength={2000}
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          {reviewError && (
            <p className="error" role="alert">
              {reviewError}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
            <button
              type="submit"
              className="button primary"
              disabled={busy || !inspection}
            >
              {busy ? "Registrando…" : "Confirmar revisão"}
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={backToList}
              disabled={busy}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
