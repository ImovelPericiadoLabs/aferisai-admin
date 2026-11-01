import type { ReviewPacket } from "./api";
import { citationLabels, statusLabels } from "./analysis-review-labels";
import type { CitationDraft } from "./analysis-review-model";

export function CitationFields({
  packet,
  drafts,
  onChange,
  selectedIndex,
  onSelect,
}: {
  packet: ReviewPacket;
  drafts: CitationDraft[];
  onChange: (index: number, next: CitationDraft) => void;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}) {
  return (
    <ol className="review-citations">
      {packet.citation_checks.map((citation, index) => (
        <li
          key={`${index}-${citation.kind}`}
          className={`review-citation${selectedIndex === index ? " is-selected" : ""}`}
        >
          <div className="review-citation-head">
            <span className="review-index">{index + 1}</span>
            <div>
              <strong>
                {citationLabels[citation.kind] ?? "Trecho citado"}
              </strong>
              <p>
                Página {citation.page} · {statusLabels[citation.status]}
              </p>
            </div>
          </div>
          <blockquote>{citation.value}</blockquote>
          <p className="review-help">
            Confira o trecho no original. Selecione esta citação e arraste a
            região na página; ajuste os valores abaixo se necessário. Explique o
            que identificou.
          </p>
          <button
            type="button"
            className="button"
            onClick={() => onSelect(index)}
          >
            {selectedIndex === index
              ? "Citação selecionada"
              : "Marcar no original"}
          </button>
          <div className="review-coordinates">
            {(["Esquerda", "Topo", "Direita", "Base"] as const).map(
              (label, coordinate) => (
                <label key={label}>
                  {label}
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    step="1"
                    value={drafts[index]?.box[coordinate] ?? ""}
                    onChange={(event) => {
                      const box: CitationDraft["box"] = [...drafts[index].box];
                      box[coordinate] = event.target.value;
                      onChange(index, { ...drafts[index], box });
                    }}
                  />
                </label>
              ),
            )}
          </div>
          <label className="review-label">
            Motivo desta conferência
            <textarea
              minLength={10}
              maxLength={500}
              value={drafts[index]?.reason ?? ""}
              onChange={(event) =>
                onChange(index, {
                  ...drafts[index],
                  reason: event.target.value,
                })
              }
              placeholder="Descreva o trecho conferido nesta página."
            />
          </label>
        </li>
      ))}
    </ol>
  );
}

export function Findings({ packet }: { packet: ReviewPacket }) {
  const { findings } = packet;
  const listed = [
    ...findings.registry_identifiers.registration_numbers.map(
      (item) => `Matrícula: ${item.value} · p. ${item.page}`,
    ),
    ...findings.registry_identifiers.registry_offices.map(
      (item) => `Cartório: ${item.value} · p. ${item.page}`,
    ),
    ...findings.registry_identifiers.municipalities.map(
      (item) => `Município: ${item.value} · p. ${item.page}`,
    ),
    ...findings.persons_mentioned.map(
      (item) => `Pessoa mencionada: ${item.name} · p. ${item.page}`,
    ),
    ...findings.burdens_mentioned.penhora.map(
      (item) => `Menção a penhora: ${item.excerpt} · p. ${item.page}`,
    ),
    ...findings.burdens_mentioned.hipoteca.map(
      (item) => `Menção a hipoteca: ${item.excerpt} · p. ${item.page}`,
    ),
    ...findings.acts_cited.map(
      (item) =>
        `Ato ${item.entry_label ?? "sem rótulo"}: ${item.excerpt} · p. ${item.page}`,
    ),
  ];
  return (
    <section className="review-card" aria-labelledby="review-findings-title">
      <h2 id="review-findings-title">Achados para conferência</h2>
      <p className="review-help">
        Estes itens são extrações técnicas. Confirme cada afirmação no original
        antes de aprovar o conjunto.
      </p>
      {listed.length ? (
        <ul className="review-findings">
          {listed.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>Nenhum achado factual foi extraído.</p>
      )}
    </section>
  );
}
