# Pedido conjunto ao backend (acumulado)

Este arquivo reúne tudo o que o admin precisa do backend, rodada a rodada. No fim das ondas vira **um único pedido** em `construtor/backend/pedidos/`. Itens já enviados antes: `construtor/backend/pedidos/001-buscas-e-gestao-de-contas.md`.

## Já enviado (pedido 001)
Busca e filtros em listas (usuários, membros, regras, comissões, aplicações, organizações em lote), dados extras de contas, ações de gestão de equipe e usuários.

## Acumulado na migração das telas antigas (a enviar)
**Papéis e permissões**
- `GET /v1/team/roles` com a matriz papel × capacidade (hoje fixa no front).
- `reason` e histórico por aplicação em conceder/revogar permissão.

**Conta e segurança**
- Listar e encerrar sessões; trilha de eventos das chaves de acesso; expor o limite de chaves (hoje 5, duplicado no front).

**Provedores de IA**
- Reativar conta suspensa; rotação de segredo; detalhe e histórico (`/events`) por conta.
- Endpoint que **meça/inspecione** o perfil Vertex de um rascunho e devolva o hash candidato (`POST /analysis-provider-accounts/{id}/inspect`): hoje `expected_profile_sha256` só é conhecido pelo servidor durante a ativação, então o admin precisa que o operador cole o hash medido.
- Documentar (ou ampliar) a regra de ativação: hoje só `vertex_service_account` na região `global`; os demais tipos recebem erro 422.

**Promoções e exceções**
- `reason` e auditoria em criar/suspender promoção; reativar; histórico de resgates.
- Detalhe e filtros de exceções; histórico de decisões.

**Parceiros**
- Suspender e reativar aplicação isolada e organização; renomear aplicação.
- Trocar URL e rotacionar chave de webhook; reenviar entrega; filtrar entregas por data.
- Pessoas e convites do parceiro (listar, reenviar, revogar).
- **Gestão de pessoas e convites do parceiro (prioridade alta, pedido do dono do produto).** Verificado em `app/partner/models.py` e `app/partner/routes.py`: os dados existem (`PartnerInvitation` com `expires_at`, `smtp_accepted_at`, `consumed_at`, `revoked_at`, `failed_confirmations`, `confirmation_blocked_at`; `PartnerMembership` com `status` invited/active/suspended), mas a única rota é `POST /v1/team/organizations/{id}/partner-invitations`. Faltam:
  - `GET /v1/team/organizations/{id}/partner-people` — pessoas e convites da organização: e-mail, estado do convite (enviado/aceito/expirado/revogado/bloqueado), quem convidou, datas (enviado, aceito), vínculo (`invited`/`active`/`suspended`), último acesso.
  - `POST .../partner-invitations/{id}/resend` e `.../revoke` (revogar convite pendente).
  - `POST .../partner-people/{member_id}/suspend` e `.../reactivate` (revogar/restaurar o acesso de quem já aceitou), encerrando as sessões ativas dele (`partner_sessions`), com `reason`.
  - **Escopo por aplicação:** hoje o acesso do parceiro é por organização (`partner_memberships`), não por aplicação. "Dar ou tirar acesso a uma aplicação específica" exige um modelo novo (vínculo pessoa × aplicação) ou a decisão de que o controle é só por organização. Definir com o produto.
  - **Trilha de auditoria** (quem convidou, aceitou, suspendeu, revogou, quando e por quê) para convites, vínculos, permissões, credenciais e webhooks.
- Métricas por aplicação além das últimas 20 entregas: série temporal de entregas por estado e latência (p50/p95) por período.

**Upload e arquivos**
- Tipos e tamanhos permitidos por upload, expostos pela API.
- Validação prévia de JSON de conta de serviço.
- Logo com miniaturas, cache e dimensões documentadas.
- Para documentos (se vierem ao portal): varredura de vírus, limites por organização, URL assinada.
