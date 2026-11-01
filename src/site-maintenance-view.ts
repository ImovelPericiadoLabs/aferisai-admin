import type { SiteMaintenancePolicy } from "./api";
import {
  localValue,
  type MaintenanceDraft,
  type MaintenanceState,
} from "./maintenance-model";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});
export const formatIso = (iso: string) => dateTime.format(new Date(iso));

export const STATE_VIEW: Record<
  MaintenanceState,
  { label: string; tone: string; headline: string; detail: string }
> = {
  off: {
    label: "Site disponível",
    tone: "badge-success",
    headline: "O site está no ar",
    detail: "Visitantes e a API pública funcionam normalmente.",
  },
  scheduled: {
    label: "Agendada",
    tone: "badge-info",
    headline: "Restrição agendada",
    detail: "O site continua no ar até o horário de início.",
  },
  active: {
    label: "Ativa",
    tone: "badge-warning",
    headline: "Restrição de acesso ativa",
    detail:
      "O modo configurado está em vigor. Veja o painel de detalhes abaixo.",
  },
  ended: {
    label: "Encerrada",
    tone: "badge-neutral",
    headline: "A restrição já terminou",
    detail:
      "O término passou e o site voltou ao ar. A configuração continua ligada: mude o modo para Disponível ou agende outra janela.",
  },
};

export const PRESETS: { label: string; minutes: number }[] = [
  { label: "1 hora", minutes: 60 },
  { label: "2 horas", minutes: 120 },
  { label: "4 horas", minutes: 240 },
  { label: "24 horas", minutes: 1440 },
];

export const emptyDraft: MaintenanceDraft = {
  mode: "off",
  startsAt: "",
  endsAt: "",
  publicMessage: "",
  note: "",
};

export const draftFrom = (policy: SiteMaintenancePolicy): MaintenanceDraft => ({
  mode: policy.mode,
  startsAt: localValue(policy.starts_at),
  endsAt: localValue(policy.ends_at),
  publicMessage: policy.public_message ?? "",
  note: policy.internal_note ?? "",
});
