import type { CitationVisualReview, ReviewPacket } from "./api";
import type { ReviewBox } from "./ReviewPage";

export type CitationDraft = {
  box: [string, string, string, string];
  reason: string;
};

export function emptyDrafts(packet: ReviewPacket): CitationDraft[] {
  return packet.citation_checks.map(() => ({
    box: ["", "", "", ""],
    reason: "",
  }));
}

/** Validated visual reviews for every citation, or null if any draft is incomplete. */
export function buildCitationReviews(
  packet: ReviewPacket,
  drafts: CitationDraft[],
): CitationVisualReview[] | null {
  const reviews = drafts.map((draft, index) => {
    const box = draft.box.map(Number) as CitationVisualReview["box"];
    if (
      draft.box.some((value) => value.trim() === "") ||
      box.some(
        (value) => !Number.isInteger(value) || value < 0 || value > 1000,
      ) ||
      box[0] >= box[2] ||
      box[1] >= box[3] ||
      (box[0] === 0 && box[1] === 0 && box[2] === 1000 && box[3] === 1000) ||
      draft.reason.trim().length < 10
    )
      return null;
    return {
      citation_index: index,
      page: packet.citation_checks[index].page,
      box,
      reason: draft.reason.trim(),
    };
  });
  return reviews.every((item) => item !== null)
    ? (reviews as CitationVisualReview[])
    : null;
}

export function draftBox(
  drafts: CitationDraft[],
  selectedIndex: number | null,
): ReviewBox | null {
  if (selectedIndex === null) return null;
  const values = drafts[selectedIndex]?.box;
  if (!values || values.some((value) => value.trim() === "")) return null;
  const numbers = values.map(Number);
  return numbers.every(Number.isFinite)
    ? (numbers as [number, number, number, number])
    : null;
}

export function attentionStatus(status: string): {
  className: string;
  text: string;
} {
  if (status === "failed") return { className: "badge-red", text: "Falhou" };
  if (status === "unknown")
    return { className: "badge-yellow", text: "Incerto" };
  if (status === "suspended")
    return { className: "badge-gray", text: "Suspenso" };
  return { className: "badge-blue", text: "Concluído" };
}
