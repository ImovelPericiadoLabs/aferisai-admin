# Pendências de backend — buscas e seletores (campos que ainda dependem de ID)

Contexto: o painel passou a usar o componente `EntityPicker` (busca + seleção única ou múltipla) no lugar de campos que pediam UUID. Onde a API não oferece busca no servidor, o seletor filtra no cliente as páginas já carregadas e oferece "Carregar mais resultados" (cursor). Esta lista é o que falta no backend para remover esses limites. O pedido formal ao backend está em `construtor/backend/pedidos/001-buscas-e-gestao-de-contas.md`.

Contrato que o `EntityPicker` espera de qualquer lookup: `GET` com `q` (texto), `limit` e `cursor`, resposta `{ items: [...], next_cursor }`. Onde possível, cada item deve trazer um rótulo legível e um segundo texto de apoio (ex.: nome + slug).

## 1. Já funcionam com busca no servidor

| Tela | Campo | Endpoint | Observação |
| --- | --- | --- | --- |
| Regras comerciais, Promoções, Repasses, Conexões | Organização | `GET /v1/team/organizations?q=` | Só a 1ª página (20). Sem `ids=` para resolver rótulos em lote: hoje 1 chamada `GET /organizations/{id}` por valor já selecionado. |
| Regras comerciais, Conexões | Aplicação | `GET /v1/team/organizations/{id}` (campo `applications`) | Lista completa da organização, filtrada no cliente. Não existe busca global de aplicações. |

## 2. Funcionam, mas com limite (filtro no cliente) — precisam de filtros no servidor

| Tela | Campo | Endpoint atual | O que falta |
| --- | --- | --- | --- |
| Promoções | Versão de regra publicada | `GET /v1/team/commercial-policies` | Parâmetros `status`, `channel`, `organization_id`, `application_id`. Hoje o seletor pagina e filtra no cliente. |
| Repasses | Obrigações do repasse (multisseleção) | `GET /v1/team/commissions?beneficiary_organization_id=&status=owed` | Filtro `unsettled=true` (`settlement_id` nulo). Hoje o seletor pagina e filtra no cliente. |
| Usuários | Busca por e-mail ou ID | `GET /v1/team/users` | Parâmetro `q`. Hoje a tela carrega até 200 contas enquanto há busca e filtra no cliente. |
| Equipe | Busca por e-mail, papel | `GET /v1/team/members` | Parâmetros `q`, `role`, `status`. Idem. |

## 3. Ainda pedem ID digitado (sem lookup disponível)

| Tela | Campo | Necessário |
| --- | --- | --- |
| Análise (revisão) | ID do trabalho | A fila já lista os trabalhos; o campo de ID ficou numa área "Abrir por ID (casos fora da fila)". Busca só se esses casos forem frequentes. |
| Classificação de fontes | ID da solicitação | Mesmo caso: fila ao lado e campo de ID em área avançada. |
| Exceções financeiras | ID do novo membro ativo | Lookup de membros da organização parceira (`GET /v1/team/organizations/{id}/members?q=`). |
| Detalhe do parceiro / credenciais | Convite de membro, credenciais | Revisar quando houver lookup de pessoas/membros. |

## 4. Ações e dados de gestão que não existem na API

Estas lacunas explicam por que Usuários e Equipe são somente consulta:

- Convidar, reenviar convite, alterar papel e suspender/reativar conta (usuários e membros).
- Último acesso, 2FA/passkeys ativas e organizações vinculadas por conta.
- Parceiros: documento (CNPJ, se for guardado), histórico de eventos e ação de suspender/reativar. Não há "plano": a venda é avulsa, sem planos ou créditos.
- Regras comerciais: histórico de versões, contagem de parceiros afetados e preço-base por item.

## 5. Como remover o aviso de limite depois

Cada lookup do painel está centralizado em `src/lookups.ts`. Ao entregar o endpoint, troque a função correspondente para enviar `q`/filtros ao servidor e retire o `limitNote` (`LIMIT_NOTES`) do campo. Os testes de filtro local ficam em `src/picker-model.test.ts`.
