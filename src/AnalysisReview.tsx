import { useEffect, useState } from "react";
import { AnalysisAttentionTab } from "./AnalysisAttentionTab";
import { AnalysisRequestsTab } from "./AnalysisRequestsTab";
import { AnalysisReviewWorkTab } from "./AnalysisReviewWorkTab";
import { AnalysisSourceTab } from "./AnalysisSourceTab";
import { useAnalysisAttention } from "./useAnalysisAttention";
import { useAnalysisRequests } from "./useAnalysisRequests";
import { useAnalysisReviewWork } from "./useAnalysisReviewWork";
import { useSourceClassification } from "./useSourceClassification";
import "./review.css";

type Tab = "requests" | "classify" | "review" | "attention";

const tabs: { id: Tab; label: string }[] = [
  { id: "requests", label: "Pedidos" },
  { id: "classify", label: "Classificar fonte" },
  { id: "review", label: "Revisar análise" },
  { id: "attention", label: "Atenção" },
];

export function AnalysisReview({
  csrf,
  canReview,
  onUnauthorized,
  initialWorkId,
}: {
  csrf: string;
  canReview: boolean;
  onUnauthorized: () => void;
  initialWorkId?: string;
}) {
  const [activeTab, setActiveTab] = useState<Tab>(
    initialWorkId ? "review" : "requests",
  );
  const requests = useAnalysisRequests(onUnauthorized);
  const sources = useSourceClassification(csrf, canReview, onUnauthorized);
  const work = useAnalysisReviewWork({
    csrf,
    canReview,
    onUnauthorized,
    initialWorkId,
  });
  const attention = useAnalysisAttention(canReview, onUnauthorized);

  useEffect(() => {
    if (initialWorkId) void work.loadById(initialWorkId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="review-page page-fade-in">
      <header className="review-heading">
        <p className="eyebrow">Análises</p>
        <h1>Análises</h1>
      </header>
      <nav className="tabs" role="tablist" aria-label="Abas de análise">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`tab${activeTab === tab.id ? " active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {activeTab === "requests" && <AnalysisRequestsTab state={requests} />}
      {activeTab === "classify" && (
        <AnalysisSourceTab canReview={canReview} state={sources} />
      )}
      {activeTab === "review" && (
        <AnalysisReviewWorkTab canReview={canReview} work={work} />
      )}
      {activeTab === "attention" && (
        <AnalysisAttentionTab canReview={canReview} state={attention} />
      )}
    </div>
  );
}
