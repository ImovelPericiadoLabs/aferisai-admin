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

**Upload e arquivos**
- Tipos e tamanhos permitidos por upload, expostos pela API.
- Validação prévia de JSON de conta de serviço.
- Logo com miniaturas, cache e dimensões documentadas.
- Para documentos (se vierem ao portal): varredura de vírus, limites por organização, URL assinada.
