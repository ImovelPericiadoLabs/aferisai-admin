export type WebhookEndpointManagementProps = {
  applicationId: string;
  csrfToken: string;
  canManage: boolean;
  canEdit: boolean;
  onUnauthorized: () => void;
  channel?: "team" | "partner";
  onChanged?: () => void;
};

/** Accepts only public HTTPS destinations on the default or 8443 port, without credentials. */
export function validUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      Boolean(parsed.hostname) &&
      (!parsed.port || ["443", "8443"].includes(parsed.port)) &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}

export const nextStepTitle = [
  "Informe o endereço",
  "Confirme a verificação da assinatura",
  "Envie um teste assinado",
  "Ative o webhook",
];
export const nextStepText = [
  "Cadastre o endereço HTTPS que recebe os eventos.",
  "Guarde a chave no seu servidor e confirme que ele verifica a assinatura.",
  "O teste usa um evento fictício assinado e não cria análise nem cobrança.",
  "O destino confirmou o teste. Ative para receber eventos reais.",
];
