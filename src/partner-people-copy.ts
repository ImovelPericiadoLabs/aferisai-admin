import type { PeopleFilter, PersonAction } from "./partner-people-model";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const filters: { value: PeopleFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Ativas" },
  { value: "pending", label: "Convites" },
  { value: "suspended", label: "Suspensas" },
];

export const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export const actionCopy: Record<
  PersonAction,
  {
    button: string;
    title: string;
    description: string;
    confirm: string;
    success: string;
    danger: boolean;
  }
> = {
  resend: {
    button: "Reenviar",
    title: "Reenviar o convite?",
    description:
      "O link anterior deixa de valer e um novo link é enviado por e-mail, válido por 24 horas.",
    confirm: "Reenviar convite",
    success: "Convite reenviado.",
    danger: false,
  },
  revoke: {
    button: "Revogar convite",
    title: "Revogar o convite?",
    description:
      "O link enviado deixa de funcionar. A pessoa não consegue mais aceitar.",
    confirm: "Revogar convite",
    success: "Convite revogado.",
    danger: true,
  },
  suspend: {
    button: "Suspender acesso",
    title: "Suspender o acesso desta pessoa?",
    description:
      "As sessões atuais são encerradas na hora e ela perde o acesso a todas as aplicações desta parceria.",
    confirm: "Suspender acesso",
    success: "Acesso suspenso. As sessões da pessoa foram encerradas.",
    danger: true,
  },
  "change-role": {
    button: "Alterar papel",
    title: "Alterar o papel desta pessoa?",
    description:
      "O novo papel vale só nesta parceria. As sessões atuais da pessoa são encerradas e ela precisa entrar de novo.",
    confirm: "Alterar papel",
    success: "Papel alterado. A pessoa precisa entrar de novo.",
    danger: false,
  },
  reactivate: {
    button: "Reativar acesso",
    title: "Reativar o acesso desta pessoa?",
    description:
      "Ela volta a entrar na parceria, mas precisa fazer login de novo.",
    confirm: "Reativar acesso",
    success: "Acesso reativado.",
    danger: false,
  },
};
