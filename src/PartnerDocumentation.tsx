import { DocsSite } from "./DocsSite";
import { partnerDocs } from "./partner-docs-content";

/** Partner documentation inside the authenticated corporate portal. */
export function PartnerDocumentation() {
  return (
    <DocsSite
      site={partnerDocs}
      storageKey="aferis.docs.partner"
      footer="Precisa de ajuda com credenciais, permissões ou retorno OAuth? Fale com o administrador da sua organização."
    />
  );
}
