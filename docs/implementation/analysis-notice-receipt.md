# Conciliação do aviso de análise recebido

Estado em 26/10/2026: a aba **Análises → Avisos**, visível somente para
`administrator`, lista tentativas de e-mail cujo resultado SMTP ficou
`attempted` ou `unknown`. Ela usa
`GET /v1/team/analysis-requests/notice-exceptions` com cursor. Para registrar
o recebimento, o administrador confere na caixa o destinatário, o ID do
pedido e o PDF completo, informa o `Message-ID` original e descreve como
fez a conferência. O navegador envia somente `smtp.sha256:<digest>` como
`evidence_ref` ao
`POST /v1/team/analysis-requests/notice-exceptions/{notice_id}/reconciliations`,
com sessão e CSRF. A tentativa original não é alterada nem reenviada.

O formulário fica em [AnalysisNotices.tsx](../../src/AnalysisNotices.tsx), a
transformação do identificador em [notice-receipt.ts](../../src/notice-receipt.ts)
e o contrato HTTP em [api.ts](../../src/api.ts). A API exige o papel no servidor;
ocultar a aba não substitui a autorização. Um aviso de WhatsApp incerto pode
ser visto na lista, mas não recebe esta decisão de recebimento de e-mail.

O hash é um identificador auditável por recomputação do `Message-ID` que está
na caixa; ele não prova recebimento sozinho. A decisão humana exige a
conferência visual de destinatário, pedido, horário e anexo. A primeira
conciliação produtiva ainda precisa ser observada após a publicação da tela.
