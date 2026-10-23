# Mapa de permissões e modos de integração (Aferis AI)

**Fonte:** leitura do `aferis-backend` (inventário completo com arquivo e linha em [`permission-inventory-backend.md`](./permission-inventory-backend.md)) e do admin. Data: 2026-10-23. Tudo abaixo é **fato verificado** salvo onde marcado **PROPOSTA**.

> **2026-10-23 — Fase 1 entregue (release `8de00f4`, PRs #30 a #32).** O backend grava a aplicação e a conexão de origem de cada análise (`app/analyses/models.py:76-77`); o parceiro só lista e lê análises da própria aplicação (`app/analyses/partner_routes.py:257,291,367,404`); o webhook de conclusão vai só à conexão iniciadora (`app/integrations/repo/webhook_delivery.py:23-31`); o `Location` do envio delegado aponta para `/v1/partner/analyses/{id}` (`:227`). Os itens 1 e 5 da seção 7 abaixo estão resolvidos. Fase 2 em andamento (PR #35 em rascunho, sem deploy: política conectada na cotação de arquivo e cupom contado no pagamento). Pendem: o resto da fase 2 (cupom e comissão registrais, captura de link), fases 3 a 5, rota registral delegada, entrega real validada e liberar as rotas parceiras públicas no Nginx (hoje 503).

## 1. Resumo em uma página
- Existem **3 códigos de permissão** reais: `application:read`, `analysis:read`, `analysis:submit:upload`. Os outros códigos que o admin já rotulou (`analysis:create`, `analysis:write`, `registry:*`) **não existem no backend**; vêm do projeto antigo e só aparecem em citações de documentação.
- Não há lista global: cada organização tem o seu catálogo (`organization_permissions`), preenchido no cadastro. **Nenhuma API cria código novo**; só muda a descrição de um existente.
- Só `application:read` é concedida automaticamente. As duas `analysis:*` entram no catálogo e precisam ser concedidas por gestor ou administrador.
- Há **5 modos de integração** em uso (credencial de aplicação, OAuth delegado com PKCE, portal humano do parceiro, webhooks de saída, conexões do titular) e 2 modos de receita ligados a parceiros (cupom/link e política comercial), com lacunas importantes de atribuição e métrica.

## 2. Permissões (códigos) e o que cada uma libera
| Código | Concedida por padrão | Libera | Onde é aplicada |
|---|---|---|---|
| `application:read` | Sim (toda aplicação e credencial nova) | `GET /v1/applications/{id}` (só `id`, `name`, `status`) | `app/integrations/routes.py:284-291`, `svc/credentials.py:143` |
| `analysis:read` | Não | Listar, ver estado, resultado e PDF das análises **originadas pela própria aplicação** (`/v1/partner/analyses*`); também decide quem recebe o webhook `analysis.completed` (só a conexão iniciadora) | `app/integrations/deps.py:82-95`, `repo/webhook_delivery.py:30` |
| `analysis:submit:upload` | Não | Enviar arquivo para análise em nome do titular (`POST /v1/partner/analyses`) | `app/integrations/deps.py:98-111` |

Regras que valem para todas: o código precisa estar no escopo da credencial, concedido à aplicação e (no modo delegado) aprovado pelo titular; aplicação e organização ativas; credencial não expirada nem revogada.

## 3. Modos de integração
| Modo | Quem age | Autenticação | Permissões | Situação |
|---|---|---|---|---|
| A. Credencial de aplicação (`client_credentials`) | Servidor do parceiro | Basic → token de 15 min | só `application:read` utilizável | Implementado, público |
| B. OAuth delegado (código + PKCE S256) | Aplicação em nome do titular | `/oauth/authorize` → consentimento → `/oauth/token` | `analysis:read`, `analysis:submit:upload` | Implementado de ponta a ponta; fora do OpenAPI público |
| C. Conexões do titular (consentimento) | Titular | Código por e-mail + cookie | Escolhe escopos por aplicação | Implementado |
| D. Portal do parceiro (`/v1/partner/*`) | Pessoa do parceiro | Convite, senha, TOTP | **Sem papéis**: todo membro ativo controla credenciais, webhook e entregas | Implementado |
| E. Webhooks de saída | Worker da Aferis | HMAC-SHA256 | exige conexão com `analysis:read` | 1 evento real + teste |
| F. Equipe interna | viewer, manager, administrator, financial | Cookie, TOTP/passkey | por rota | Implementado |
| G. Site/checkout | Titular | Cookie | dono da análise | Implementado |
| H. Cupom/link | Titular com código | campo `promotion_code` na cotação | — | Só cotação de análise de arquivo |
| I. Política comercial por canal | Administrador | — | — | `integration/connected` **nunca é aplicada** |

URIs de retorno OAuth: gerenciadas só pela equipe (até 5, HTTPS, sem `?`/`#`, porta 443, domínio público). O parceiro não tem rota para elas.

## 4. Eventos
| Evento | Direção | Situação |
|---|---|---|
| `analysis.completed` | Aferis → parceiro | Implementado (um POST, 10 s, **sem reenvio automático**) |
| `webhook.test` | Aferis → parceiro | Implementado (10 por hora por aplicação; sucesso é pré-requisito para ativar) |
| `PAYMENT_*` (11 nomes) | Asaas → Aferis | Implementado, interno |
| Categorias de evento por escopo | — | Só em documentação |
| Eventos de registro e certidão | — | Só em documentação |

Assinatura: cabeçalho `X-Aferis-Signature: sha256=<HMAC>` e `X-Aferis-Event-Id`; **sem carimbo de tempo** (sem proteção contra replay). Estados de entrega: `pending`, `attempted`, `delivered`, `unknown`, `skipped`.

## 5. Métricas de parceiro
| Métrica | Existe? | Observação |
|---|---|---|
| Entregas de webhook por aplicação (lista e filtro) | Sim | Equipe e parceiro |
| Conexões ativas (lista, filtro por aplicação) | Sim | Só equipe, sem contagem |
| Contadores e séries do painel | Sim | **Globais**, não por organização ou aplicação |
| Uso de cupom/link (`use_count`) | Sim | Conta cotações, não pagamentos; só administrador |
| Comissões e repasses | Sim | Só financeiro |
| Análises por aplicação ou conexão | **Parcial** | A origem já é gravada (índice por origem); falta o endpoint de métrica |
| Conversão paga de cupom/link, cliques, indicações | **Não** | |
| Extrato de comissão para o parceiro | **Não** | Documentado como pendência |

## 6. Gestão de pessoas do parceiro (novo no backend, PR #28)
Já existe (equipe): `GET /v1/team/organizations/{id}/partner-people` (gestor+), `.../partner-people/{member_id}/events` (gestor+), `POST .../partner-invitations` (com `reason` opcional), `.../partner-invitations/{id}/resend` e `/revoke`, `.../partner-people/{member_id}/suspend` e `/reactivate` (administrador; suspender encerra as sessões da pessoa). Estados do convite: `delivery_unconfirmed`, `smtp_accepted`, `accepted`, `expired`, `revoked`, `blocked`. O acesso continua **por organização**, não por aplicação.

## 7. Lacunas e riscos (fatos)
1. ~~A análise enviada pelo parceiro não grava aplicação nem conexão de origem~~ **Resolvido na fase 1.** Antes: a análise enviada pelo parceiro não gravava aplicação nem conexão de origem: leituras delegadas e webhooks cobrem **todas** as análises do titular, inclusive as feitas no site ou por outros parceiros (`app/analyses/partner_routes.py:209,253`). Impede métrica por parceiro e comissão de integração.
2. A política comercial `integration/connected` pode ser criada e nunca é resolvida na cotação.
3. `use_count` do cupom sobe ao criar a cotação, não ao pagar; cotação de registro não aceita código promocional; comissão só nasce para análise.
4. Sem papéis para pessoas do parceiro.
5. ~~`Location` do envio delegado aponta para a rota do titular~~ **Resolvido na fase 1.**
6. `GET /v1/team/connections` e `/v1/team/registry-requests` não checam papel (o financeiro lê; a segunda expõe `owner_user_id`).
7. Documentação desatualizada em cinco arquivos (lista em `permission-inventory-backend.md` §1.4).

## 7b. Decisões e ordem de entrega (aprovadas em 2026-10-23)
- O parceiro vê só o que a aplicação dele originou. Cupom abandonado não consome limite (conta no pagamento). Acesso das pessoas segue por organização.
- Fases: 1 atribuição, 2 comercial, 3 métricas e extrato, 4 eventos e entrega (paralela), 5 catálogo por API, escopos novos e papéis. Pedido ao backend: `construtor/backend/pedidos/003-mapa-de-permissoes-e-integracoes.md`.
- Regra de evolução do mapa: cada fase entregue move o item de Proposta para Implementado em `src/integration-catalog.ts`, com o arquivo do backend que o comprova.

## 8. PROPOSTA de modelo completo (não existe hoje)
- **Escopos novos:** cotação (`analysis:quote:read/create`), pagamento (`payment:create/read`), registro (`registry:create:number|address`, `registry:read`), certidão, documento original (separado e sensível), eventos por categoria (`events:analysis` etc.), e escopos de aplicação para métricas, comissões e conexões (`metrics:read`, `commissions:read`, `connections:read`, `webhooks:manage`).
- **Atribuição:** gravar `origin_application_id` e `connection_id` em análise e operação de registro; diferenciar `analysis:read:own-origin` de `analysis:read:all`.
- **Eventos:** `analysis.created|quote_ready|failed|needs_review|result_updated`, `payment.received|refunded`, `registry.request.updated`, `connection.granted|changed|revoked`, `credential.expiring`, `webhook.endpoint.disabled`, `commission.owed|settled`; com repetição com recuo, reenvio manual auditado, carimbo de tempo e rotação de chave com sobreposição.
- **Métricas ao parceiro:** por aplicação (conexões, envios, concluídas, sucesso de webhook), por cupom/link (resgates, conversão paga, desconto), extrato de comissão.
- **Papéis do parceiro:** por exemplo dono, desenvolvedor e leitor financeiro.

## 9. O que o admin mostra hoje
Catálogo de ações da organização (descrição editável), matriz de permissões por aplicação com confirmação, credenciais, webhooks com configuração guiada, entregas com gráficos, URIs OAuth e métricas das últimas 20 entregas. Ainda sem: pessoas e convites (em desenho, veja o spec), atribuição por aplicação, métricas de cupom/link e extrato de comissão (dependem do backend).
