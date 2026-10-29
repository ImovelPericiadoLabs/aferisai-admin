export type MaintenanceState = "off" | "scheduled" | "active" | "ended";

type PolicyTimes = {
  mode: MaintenanceMode;
  starts_at: string | null;
  ends_at: string | null;
};

/** What visitors get right now, derived from the mode and the window. */
export function maintenanceState(
  policy: PolicyTimes | null,
  now: number,
): MaintenanceState {
  if (!policy || policy.mode === "off") return "off";
  if (policy.ends_at && now >= new Date(policy.ends_at).getTime())
    return "ended";
  if (policy.starts_at && new Date(policy.starts_at).getTime() > now)
    return "scheduled";
  return "active";
}

/** ISO instant → value for <input type="datetime-local"> in the viewer's zone. */
export function localValue(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function isoValue(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

/** Empty string when the window is fine, otherwise what is wrong with it. */
export function windowProblem(
  startsAt: string,
  endsAt: string,
  now: number,
): string {
  if (!endsAt) return "";
  const end = new Date(endsAt).getTime();
  if (startsAt) {
    if (end <= new Date(startsAt).getTime())
      return "O término precisa ser depois do início.";
    return "";
  }
  if (end <= now) return "O término já passou. Escolha um horário futuro.";
  return "";
}

/** End of the window `minutes` after the start (or after now when there is no start). */
export function presetEnd(startsAt: string, minutes: number, now: number) {
  const from = startsAt ? new Date(startsAt).getTime() : now;
  return localValue(new Date(from + minutes * 60_000).toISOString());
}

export function describeWindow(
  startsAt: string | null,
  endsAt: string | null,
  format: (iso: string) => string,
): string {
  if (startsAt && endsAt)
    return `Das ${format(startsAt)} até ${format(endsAt)}.`;
  if (startsAt)
    return `Começa em ${format(startsAt)} e dura até alguém desligar.`;
  if (endsAt) return `Vale a partir de agora até ${format(endsAt)}.`;
  return "Vale a partir de agora e até alguém desligar.";
}

export type MaintenanceMode = "off" | "restricted" | "full";

export type MaintenanceDraft = {
  mode: MaintenanceMode;
  startsAt: string;
  endsAt: string;
  publicMessage: string;
  note: string;
};

type Saved = PolicyTimes & {
  mode: MaintenanceMode;
  public_message: string | null;
  internal_note: string | null;
};

const MODE_LABEL: Record<MaintenanceMode, string> = {
  off: "Disponível",
  restricted: "Em preparação",
  full: "Em manutenção",
};

export type DraftChange = {
  field:
    "mode" | "starts_at" | "ends_at" | "public_message" | "internal_note";
  label: string;
  from: string;
  to: string;
};

/** Which saved values the draft would change; blank text counts as empty and dates compare to the minute. */
export function draftChanges(saved: Saved, draft: MaintenanceDraft) {
  const changes: DraftChange[] = [];
  const text = (value: string | null | undefined) => (value ?? "").trim();
  const push = (
    field: DraftChange["field"],
    label: string,
    from: string,
    to: string,
  ) => {
    if (from !== to) changes.push({ field, label, from, to });
  };
  push(
    "mode",
    "Modo",
    MODE_LABEL[saved.mode] ?? saved.mode,
    MODE_LABEL[draft.mode] ?? draft.mode,
  );
  push("starts_at", "Início", localValue(saved.starts_at), draft.startsAt);
  push("ends_at", "Término", localValue(saved.ends_at), draft.endsAt);
  push(
    "public_message",
    "Mensagem para visitantes",
    text(saved.public_message),
    text(draft.publicMessage),
  );
  push(
    "internal_note",
    "Nota interna",
    text(saved.internal_note),
    text(draft.note),
  );
  return changes;
}
