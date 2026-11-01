import { useState } from "react";
import { AnalysisReview } from "./AnalysisReview";
import { AnalysisNotices } from "./AnalysisNotices";
import { AnalysesAttentionPanel } from "./AnalysesAttentionPanel";
import type { AttentionRow } from "./attention-model";
import { analysisWorkStatusLabel } from "./display-labels";
import { OpsViews } from "./OpsParts";
import { OriginalViewer, type OriginalTarget } from "./OriginalViewer";
import { RequestDirectory } from "./RequestDirectory";
import { useAnalysesAttention } from "./useAnalysesAttention";
import { useNow } from "./useNow";
import "./review.css";
import "./ops.css";

type Tab = "attention" | "review" | "requests" | "notices";

export function Analyses({
  csrf,
  canReview,
  isAdmin,
  onUnauthorized,
  initialWorkId,
  openSource,
}: {
  csrf: string;
  canReview: boolean;
  isAdmin: boolean;
  onUnauthorized: () => void;
  initialWorkId?: string;
  openSource?: (requestId: string) => void;
}) {
  const [tab, setTab] = useState<Tab>(
    initialWorkId ? "review" : canReview ? "attention" : "requests",
  );
  const [reviewWorkId, setReviewWorkId] = useState(initialWorkId ?? "");
  const [viewing, setViewing] = useState<OriginalTarget | null>(null);
  const now = useNow();
  const attention = useAnalysesAttention({ canReview, onUnauthorized });
  const { loading, counts, load } = attention;

  function seeDocument(row: AttentionRow) {
    setViewing({
      requestId: row.request_id,
      title: "Documento do pedido",
      facts: [
        { label: "Trabalho", value: row.work_id },
        { label: "Pedido", value: row.request_id },
        { label: "Situação", value: analysisWorkStatusLabel(row.status) },
      ],
    });
  }

  function review(row: AttentionRow) {
    setReviewWorkId(row.work_id);
    setTab("review");
  }

  const tabs: { id: Tab; label: string }[] = [
    ...(canReview
      ? [
          { id: "attention" as const, label: "Atenção" },
          { id: "review" as const, label: "Revisão" },
        ]
      : []),
    { id: "requests", label: "Pedidos" },
    ...(isAdmin ? [{ id: "notices" as const, label: "Avisos" }] : []),
  ];

  return (
    <section className="page ops" aria-labelledby="ana-title">
      <header className="ops-head">
        <div>
          <p className="ops-eyebrow">Operação</p>
          <h1 className="page-title" id="ana-title">
            Análises
          </h1>
          <p className="page-subtitle">
            O que pede atenção, a revisão humana de cada análise e os pedidos de
            arquivo. A classificação de fonte tem a própria fila.
          </p>
        </div>
        <div className="ops-head-actions">
          {tab === "attention" && (
            <button
              type="button"
              className="btn btn-secondary btn-md"
              disabled={loading}
              onClick={() => void load()}
            >
              Atualizar
            </button>
          )}
          <span className="badge badge-neutral">
            {canReview ? "Gestão" : "Leitura"}
          </span>
        </div>
      </header>

      <OpsViews
        label="Áreas de análise"
        active={tab}
        onPick={(id) => setTab(id as Tab)}
        views={tabs.map((entry) => ({
          ...entry,
          count: entry.id === "attention" ? counts.all : undefined,
        }))}
      />

      {tab === "attention" && canReview && (
        <AnalysesAttentionPanel
          attention={attention}
          now={now}
          onSeeDocument={seeDocument}
          onReview={review}
        />
      )}

      {tab === "review" && canReview && (
        <AnalysisReview
          key={reviewWorkId}
          csrf={csrf}
          canReview={canReview}
          onUnauthorized={onUnauthorized}
          initialWorkId={reviewWorkId || undefined}
        />
      )}

      {tab === "requests" && (
        <RequestDirectory
          canRead
          embedded
          readOnly={!canReview}
          onUnauthorized={onUnauthorized}
          openSource={openSource ?? (() => undefined)}
          openReview={(workId) => {
            setReviewWorkId(workId);
            setTab("review");
          }}
        />
      )}

      {tab === "notices" && isAdmin && (
        <AnalysisNotices csrf={csrf} onUnauthorized={onUnauthorized} />
      )}

      <OriginalViewer
        target={viewing}
        csrf={csrf}
        onClose={() => setViewing(null)}
        onUnauthorized={onUnauthorized}
        returnFocus={() =>
          document.querySelector<HTMLElement>(
            `[data-original-for="${viewing?.facts[0]?.value ?? ""}"]`,
          )
        }
      />
    </section>
  );
}
