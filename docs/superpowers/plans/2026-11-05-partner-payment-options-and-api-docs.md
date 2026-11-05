# Opções de pagamento do parceiro e documentação completa da API — plano de execução

> **Para quem executar:** use superpowers:executing-plans (inline) ou subagent-driven-development. Passos com `- [ ]`.

**Objetivo:** o parceiro descobre, pela API, se o titular conectado tem pagador cadastrado e quanto tem de créditos (para mostrar as opções de pagamento ao cliente), e a documentação passa a explicar cada endpoint com uso detalhado.

**Arquitetura:** uma rota nova e somente leitura no backend (`GET /v1/partner/payment-options`, escopo `payment:read`) reaproveitando `CreditAccountSvc.balance` e `PayerProfileRepo.get_by_owner`; depois a documentação do admin (`partner-docs-content.ts`, `integration-samples.ts`) é reescrita por endpoint.

**Spec:** não há spec escrito; origem é o mapa de endpoints da conversa de 2026-11-05 e `backend/docs/partner-integration-readiness.md`.

## Decisões que o Lucas precisa confirmar antes do Passo B1

| # | Decisão | Recomendação |
|---|---|---|
| D1 | A resposta pode mostrar o final do CPF/CNPJ do pagador? | Sim: só `document_last4` e o tipo (`cpf`/`cnpj`). Nunca nome nem documento inteiro |
| D2 | `credits` aparece em `methods` só com saldo > 0 e escopo `payment:credits`? | Sim. Saldo zero não oferece a opção |
| D3 | Baixar o documento de **registro** pelo parceiro (hoje não existe rota) entra neste plano? | **Aprovado pelo Lucas na versão original: não entra** (pedido futuro) |
| D4 | Fachada `/v1/partner/orders` entra? | **Decidido pelo Lucas: entra**, como Fase 3 deste plano |

## Contrato novo

`GET /v1/partner/payment-options` — Bearer delegado com `payment:read`.

```json
{
  "currency": "BRL",
  "credits": { "available_cents": 12000 },
  "payer": { "registered": true, "document_kind": "cpf", "document_last4": "1234" },
  "methods": ["pix", "credits"]
}
```

- `methods`: `pix` se o token tem `analysis:pay` ou `registry:pay`; `credits` se tem `payment:credits` e `available_cents > 0`.
- `payer.registered=false` → `document_kind` e `document_last4` nulos.
- Cabeçalhos: `Cache-Control: private, no-store`. Token `client_credentials` não é aceito.
- Revalida conexão e concessão a cada chamada, como as demais rotas delegadas.

## Estrutura de arquivos

| Repositório | Arquivo | Responsabilidade |
|---|---|---|
| backend | `app/payments/svc/profile.py` | novo `summary(user_id)`: registrado? tipo e final do documento, sem expor nome |
| backend | `app/payments/partner_routes.py` | rota `GET /payment-options` + schema `PartnerPaymentOptionsResponse` |
| backend | `tests/test_partner_payment_options.py` | testes da rota e do resumo |
| backend | `docs/partner-integration-readiness.md` | marcar a lacuna como resolvida e documentar a rota |
| admin | `src/partner-docs-content.ts` | páginas por endpoint (abaixo) |
| admin | `src/integration-samples.ts` | exemplos nas 6 linguagens para as rotas novas |
| admin | `src/partner-docs-content.test.ts` | cobertura: todo endpoint do backend tem seção |

## Fase 1 — Backend (worktree próprio, porque a `hml` do backend recebe commits de outras sessões)

### Task B1: Resumo do pagador sem dados pessoais
- [ ] Teste (RED): `PayerProfileSvc.summary` devolve `registered=False` sem perfil; com perfil devolve `document_kind` e `document_last4`, e o objeto não contém nome nem documento inteiro (asserção sobre `repr` e campos).
- [ ] Implementar `summary(user_account_id) -> PayerSummary` (dataclass frozen: `registered: bool`, `document_kind: str | None`, `document_last4: str | None`) reutilizando `_decrypt`.
- [ ] `uv run pytest tests/test_partner_payment_options.py` → passa. Commit.

### Task B2: Rota `GET /v1/partner/payment-options`
- [ ] Teste (RED), no estilo de `tests/test_user_connection_routes.py` (fakes de serviço): 401 sem token; 403 sem `payment:read`; 200 com `methods` conforme escopos e saldo (4 combinações: só PIX, PIX+créditos, créditos sem saldo, nenhum escopo de pagamento); `Cache-Control: private, no-store`; resposta sem `name`/`document` completos; `operationId` presente no OpenAPI.
- [ ] Implementar a rota em `payments/partner_routes.py` com `get_delegated_payment_reader`, `CreditAccountSvc.balance` e `PayerProfileSvc.summary`; `operation_id="getDelegatedPaymentOptions"`; descrição em português dizendo que só expõe saldo e final do documento do titular conectado.
- [ ] Rodar `tests/test_user_connection_routes.py`, `tests/test_api_docs.py` e `python3 scripts/check_project_rules.py` (sem apontamentos novos). Commit.

### Task B3: Documento de prontidão
- [ ] Em `docs/partner-integration-readiness.md`, trocar a linha "Reutilizar pagador" para citar a rota e adicionar o item "Parceiro consulta saldo e pagador" como existente. Commit.

### Task B4: Publicar
- [ ] Revisar com o Lucas, rebase na `origin/main`, push direto para `main` (e `hml` se pedido). Backend sobe **antes** da documentação.

## Fase 2 — Documentação do admin (uma página por assunto, cada endpoint no mesmo molde)

**Molde de endpoint** (cada rota ganha uma seção `### MÉTODO /rota`): para quê serve · escopo · cabeçalhos (`Authorization`, `Idempotency-Key` quando existir) · corpo (tabela de campos com tipo, obrigatório e regra) · resposta (campos e status de sucesso, `Location`) · erros (status e causa) · idempotência/repetição · eventos que dispara · exemplo cURL (e 6 linguagens nas rotas centrais).

### Task D1: Mapa e fluxo completo
- [ ] Página "Mapa da integração" com o diagrama de símbolos (conectar → solicitar → cotar → pagar → acompanhar/baixar) como bloco `code` em texto, tabela escopo × rotas e tabela evento × escopo. Teste: `validateSite` e todo escopo de `SCOPES` aparece na tabela.

### Task D2: Análise de matrícula (detalhada)
- [ ] Reescrever `analises-api` com as 15 rotas no molde: envio binário e 303/409; cotação com `certificate_selections`; listagem; `result`; os 3 downloads (`report.pdf`, `complete.pdf` com limite de 90 MB/512 MB, `original`); certidões e `unavailable_kinds`. Incluir tabela de erros por rota.

### Task D3: Registro (detalhado)
- [ ] Reescrever `solicitar` e `registro-api`: `number`, `address` (campos `without_*`), prévia (uma vez; incerto → conciliação), `certificate-options`, `quote` (corpo opcional, 409 sem evidência), lista com `next_cursor`, estados do pedido, `location_source` e campos que só preenchem quando o original confirma. Deixar explícito que **não há download do documento de registro** (D3).

### Task D4: Pagamento e opções (detalhado)
- [ ] Reescrever `pagamento`: nova rota `payment-options` (campos, regra de `methods`, exemplo de decisão na tela do parceiro: PIX sempre; créditos se `methods` inclui; "usar pagador salvo" se `payer.registered`); PIX com `payer` opcional e erro de conflito de identidade; créditos e erro de saldo insuficiente; corpo jurídico (`legal_policy_version`, `documents`); GET do PIX e evento `payment.confirmed`. Fluxo de decisão em símbolos.

### Task D5: Eventos
- [ ] Reescrever "Entregas de eventos" com a tabela evento → escopo → gatilho → campos principais (usar `webhook-payloads.ts`), assinatura, retries, deduplicação.

### Task D6: Exemplos em 6 linguagens
- [ ] Acrescentar a `integration-samples.ts` amostras para `payment-options`, PIX e créditos; rodar `npm run test:doc-samples` (verifica os exemplos executando-os com servidor simulado) e manter a regra de não publicar amostra não verificada.

### Task D7: Cobertura e verificação
- [ ] Teste novo: lista fixa dos endpoints públicos (`/v1/partner/*` delegados + `/oauth/*`) e asserção de que cada um aparece em alguma seção do site de docs (impede esquecer rota).
- [ ] `tsc -b`, `vitest`, `prettier`, `oxlint`, build; conferir no navegador a 1440/768/390 px (sem rolagem horizontal, tabelas dentro de contêiner com rolagem).
- [ ] Commit por página; push direto para `main` só depois do aval do Lucas.

## Fase 3 — Fachada `/v1/partner/orders` (incluída por decisão do Lucas em 2026-11-05)

Alvo já descrito em `backend/docs/partner-integration-readiness.md`: o parceiro só vê a ordem, a cotação e o pagamento; preview, quote, certificate-options e pix continuam como etapas internas.

```
POST /v1/partner/orders              → created / awaiting_quote
GET  /v1/partner/orders/{id}         → quote, methods, next_action
POST /v1/partner/orders/{id}/payment → payment_created / paid / conflict
```

**Decisões de desenho a fechar antes de codar (viram um spec curto, aprovado pelo Lucas):**
1. Entrada da ordem: um único `POST` com `source` = `number | address` (registro) e como o **arquivo** entra (upload binário continua em `POST /analyses`, a ordem o referencia por `analysis_id`?).
2. `id` da ordem: reaproveita `operation_id`/`analysis_id` ou um id próprio que aponta para um dos dois.
3. Aceite jurídico simples: trocar o envelope atual (`legal_policy_version` + 5 hashes) por catálogo oficial no backend e `legal_acceptance_id`/aceite confirmado (item aberto do readiness).
4. `next_action` e estados públicos: lista fechada (`awaiting_quote`, `awaiting_payment`, `paid`, `processing`, `delivered`, `failed`) e o mapeamento dos estados internos.
5. Compatibilidade: manter as rotas atuais; a fachada só orquestra por cima (sem segundo caminho de verdade).

**Tarefas (depois do spec):**
- [ ] F1 Spec curto + aprovação.
- [ ] F2 Serviço `PartnerOrderSvc` (orquestra preview → quote → pix/credits) com testes por estado e idempotência (`Idempotency-Key`).
- [ ] F3 Rotas `POST /orders`, `GET /orders/{id}`, `POST /orders/{id}/payment`; incluir `getDelegatedOrder…` em `api_docs.py` e escopos reaproveitados (`registry:submit`, `registry:quote`, `analysis:pay`/`registry:pay`, `payment:credits`).
- [ ] F4 `GET /orders/{id}` devolve `payment_options` (reuso da Fase 1) em `methods`.
- [ ] F5 Documentação (docs do admin): página "Ordens (fluxo simples)" no molde de endpoint, com amostras nas 6 linguagens verificadas; marcar as etapas antigas como avançadas.
- [ ] F6 Teste de cobertura D7 passa a incluir os 3 endpoints novos; publicar backend antes da documentação.

## Review Focus

- Titular sem pagador e sem saldo: `methods` deve ser só `["pix"]` (se houver escopo de PIX) e nunca erro 500.
- Token sem `payment:read` (só `payment:credits`): 403, sem vazar saldo.
- Saldo grande ou zero: `available_cents` inteiro em centavos, sem arredondar.
- Conexão revogada no meio: 401 sem dados.
- Documentação: nenhuma amostra sem verificação; nenhum campo inventado (tudo vem dos schemas do backend).

## Ordem e dependências

`B1 → B2 → B3 → B4` (backend no ar) `→ D1…D7` (docs). As páginas D1, D2, D3 e D5 não dependem da rota nova e podem ser feitas em paralelo com o backend; só D4 e a tabela de escopos esperam o deploy do B4.

## Riscos

- `hml` do backend recebe commits de outras sessões: trabalhar em worktree e dar rebase antes do push.
- Falhas de teste já existentes (5 no admin por URL da API; `test_analysis_owner_original` no backend) não são deste plano; reportar sem corrigir.
- A rota expõe saldo: restringir a `payment:read`, `no-store`, e não registrar valores em log.
